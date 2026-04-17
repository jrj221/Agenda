import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { AgendaItem, Category } from "../presenters/HomepagePresenter";
import { getVacationDAO } from "../data";
import type { EventDTO, CategoryDTO } from "@agenda/shared";

const SYNC_URL = import.meta.env.VITE_SYNC_URL || "ws://localhost:1234";
const DEBOUNCE_MS = 2000;

export interface TripDoc {
	ydoc: Y.Doc;
	provider: WebsocketProvider;
	trip: Y.Map<unknown>;
	items: Y.Array<Y.Map<unknown>>;
	categories: Y.Array<Y.Map<unknown>>;
	undoManager: Y.UndoManager;
	localOrigin: object;
	destroy: () => void;
}

// ── Hydrate Yjs from DAO ──────────────────────────

async function hydrateFromDAO(tripId: string, doc: TripDoc): Promise<void> {
	const vacation = await getVacationDAO().findByCode(tripId);
	if (!vacation || (!vacation.name && vacation.events.length === 0)) return;

	doc.ydoc.transact(() => {
		// Trip metadata
		if (vacation.name) {
			doc.trip.set("name", vacation.name);
			doc.trip.set("startDate", vacation.startDate);
			doc.trip.set("endDate", vacation.endDate);
		}

		// Events
		if (vacation.events.length > 0 && doc.items.length === 0) {
			for (const event of vacation.events) {
				doc.items.push([itemMapFrom(event)]);
			}
		}

		// Categories
		if (vacation.categories.length > 0 && doc.categories.length === 0) {
			for (const cat of vacation.categories) {
				doc.categories.push([categoryMapFrom(cat)]);
			}
		}
	});
}

// ── Debounced save from Yjs to DAO ────────────────

function startDebouncedSync(tripId: string, doc: TripDoc): () => void {
	let timer: number | null = null;

	function flushToDAO() {
		timer = null;
		const dao = getVacationDAO();

		const name = doc.trip.get("name") as string | undefined;
		const startDate = doc.trip.get("startDate") as string | undefined;
		const endDate = doc.trip.get("endDate") as string | undefined;
		const events: EventDTO[] = doc.items.toArray().map(itemFromMap);
		const categories: CategoryDTO[] = doc.categories.toArray().map(categoryFromMap);

		void dao.update(tripId, {
			...(name !== undefined && { name }),
			...(startDate !== undefined && { startDate }),
			...(endDate !== undefined && { endDate }),
			events,
			categories,
		});
	}

	function scheduleFlush() {
		if (timer !== null) clearTimeout(timer);
		timer = window.setTimeout(flushToDAO, DEBOUNCE_MS);
	}

	doc.items.observeDeep(scheduleFlush);
	doc.categories.observeDeep(scheduleFlush);
	doc.trip.observe(scheduleFlush);

	// Safety net: flush on page close
	const onBeforeUnload = () => {
		if (timer !== null) {
			clearTimeout(timer);
			flushToDAO();
		}
	};
	window.addEventListener("beforeunload", onBeforeUnload);

	return () => {
		if (timer !== null) {
			clearTimeout(timer);
			flushToDAO();
		}
		doc.items.unobserveDeep(scheduleFlush);
		doc.categories.unobserveDeep(scheduleFlush);
		doc.trip.unobserve(scheduleFlush);
		window.removeEventListener("beforeunload", onBeforeUnload);
	};
}

// ── Doc lifecycle ─────────────────────────────────

async function createTripDoc(tripId: string): Promise<TripDoc> {
	const ydoc = new Y.Doc();
	const trip = ydoc.getMap("trip");
	const items = ydoc.getArray<Y.Map<unknown>>("items");
	const categories = ydoc.getArray<Y.Map<unknown>>("categories");
	const localOrigin = { local: true };
	const undoManager = new Y.UndoManager([items, categories, trip], {
		trackedOrigins: new Set([localOrigin]),
	});
	const provider = new WebsocketProvider(SYNC_URL, tripId, ydoc);

	const doc: TripDoc = {
		ydoc,
		provider,
		trip,
		items,
		categories,
		undoManager,
		localOrigin,
		destroy: () => {},
	};

	// Hydrate from DB before sync starts observing, so the initial
	// population doesn't trigger a write-back.
	await hydrateFromDAO(tripId, doc);
	const stopSync = startDebouncedSync(tripId, doc);

	doc.destroy = () => {
		stopSync();
		provider.destroy();
		ydoc.destroy();
	};

	return doc;
}

// Ref-counted cache so React StrictMode's mount→unmount→remount
// doesn't tear down the WebSocket mid-handshake.
type CacheEntry = { doc: Promise<TripDoc>; refs: number; destroyTimer: number | null };
const tripDocCache = new Map<string, CacheEntry>();

export function acquireTripDoc(tripId: string): Promise<TripDoc> {
	const cached = tripDocCache.get(tripId);
	if (cached) {
		cached.refs++;
		if (cached.destroyTimer !== null) {
			clearTimeout(cached.destroyTimer);
			cached.destroyTimer = null;
		}
		return cached.doc;
	}
	const entry: CacheEntry = { doc: createTripDoc(tripId), refs: 1, destroyTimer: null };
	tripDocCache.set(tripId, entry);
	return entry.doc;
}

export function releaseTripDoc(tripId: string): void {
	const cached = tripDocCache.get(tripId);
	if (!cached) return;
	cached.refs--;
	if (cached.destroyTimer !== null) {
		clearTimeout(cached.destroyTimer);
		cached.destroyTimer = null;
	}
}

// ── Y.Map helpers ─────────────────────────────────

export function itemMapFrom(item: AgendaItem | EventDTO): Y.Map<unknown> {
	const m = new Y.Map<unknown>();
	m.set("id", item.id);
	m.set("name", item.name);
	m.set("day", item.day);
	m.set("startTime", item.startTime);
	m.set("endTime", item.endTime);
	if (item.categoryId !== undefined) m.set("categoryId", item.categoryId);
	if (item.notes) m.set("notes", item.notes);
	if (item.location) m.set("location", item.location);
	return m;
}

export function itemFromMap(m: Y.Map<unknown>): AgendaItem {
	const cat = m.get("categoryId");
	const notes = m.get("notes");
	const location = m.get("location");
	return {
		id: m.get("id") as number,
		name: m.get("name") as string,
		day: m.get("day") as string,
		startTime: m.get("startTime") as string,
		endTime: m.get("endTime") as string,
		categoryId: typeof cat === "number" ? cat : undefined,
		notes: typeof notes === "string" ? notes : undefined,
		location: typeof location === "string" ? location : undefined,
	};
}

export function categoryMapFrom(cat: Category | CategoryDTO): Y.Map<unknown> {
	const m = new Y.Map<unknown>();
	m.set("id", cat.id);
	m.set("name", cat.name);
	m.set("color", cat.color);
	return m;
}

export function categoryFromMap(m: Y.Map<unknown>): Category {
	return {
		id: m.get("id") as number,
		name: m.get("name") as string,
		color: m.get("color") as string,
	};
}

export function findIndexById(arr: Y.Array<Y.Map<unknown>>, id: number): number {
	for (let i = 0; i < arr.length; i++) {
		if (arr.get(i).get("id") === id) return i;
	}
	return -1;
}

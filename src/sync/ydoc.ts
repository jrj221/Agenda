import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { AgendaItem, Category } from "../presenters/HomepagePresenter";

const SYNC_URL = import.meta.env.VITE_SYNC_URL || "ws://localhost:1234";

// Per-trip Yjs document. The shared types are field-level Y.Maps
// inside Y.Arrays so that two users editing different fields of the
// same event merge cleanly instead of clobbering the whole record.
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

function createTripDoc(tripId: string): TripDoc {
	const ydoc = new Y.Doc();
	const trip = ydoc.getMap("trip");
	const items = ydoc.getArray<Y.Map<unknown>>("items");
	const categories = ydoc.getArray<Y.Map<unknown>>("categories");
	// localOrigin is the sentinel for "this user's edits". UndoManager
	// only tracks transactions tagged with it, so Cmd+Z undoes mine, not theirs.
	const localOrigin = { local: true };
	const undoManager = new Y.UndoManager([items, categories, trip], {
		trackedOrigins: new Set([localOrigin]),
	});
	const provider = new WebsocketProvider(SYNC_URL, tripId, ydoc);
	return {
		ydoc,
		provider,
		trip,
		items,
		categories,
		undoManager,
		localOrigin,
		destroy: () => {
			provider.destroy();
			ydoc.destroy();
		},
	};
}

// Ref-counted cache so React 19 StrictMode's mount→unmount→remount
// dance in dev doesn't tear down the WebSocket mid-handshake. The
// destroy is deferred a tick so an immediate re-acquire cancels it.
type CacheEntry = { doc: TripDoc; refs: number; destroyTimer: number | null };
const tripDocCache = new Map<string, CacheEntry>();

export function acquireTripDoc(tripId: string): TripDoc {
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
	if (cached.refs > 0) return;
	cached.destroyTimer = window.setTimeout(() => {
		cached.doc.destroy();
		tripDocCache.delete(tripId);
	}, 0);
}

export function itemMapFrom(item: AgendaItem): Y.Map<unknown> {
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

export function categoryMapFrom(cat: Category): Y.Map<unknown> {
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

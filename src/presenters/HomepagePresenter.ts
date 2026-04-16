import {
	itemMapFrom,
	itemFromMap,
	categoryMapFrom,
	categoryFromMap,
	findIndexById,
	type TripDoc,
} from "../sync/ydoc";

export interface Category {
	id: number;
	name: string;
	color: string; // hex
}

export interface AgendaItem {
	id: number;
	name: string;
	day: string;
	startTime: string; // "HH:MM"
	endTime: string;   // "HH:MM"
	categoryId?: number;
	notes?: string;
	location?: string;
}

export interface Trip {
	name: string;
	startDate: string;
	endDate: string;
}

// Callbacks the presenter uses to push state changes back to the component
export interface HomepageListener {
	setItems: (items: AgendaItem[]) => void;
	setTrip: (trip: Trip | null) => void;
	setCategories: (categories: Category[]) => void;
}

export class HomepagePresenter {
	private listener: HomepageListener;
	private doc: TripDoc;
	private disposers: Array<() => void> = [];

	constructor(listener: HomepageListener, doc: TripDoc) {
		this.listener = listener;
		this.doc = doc;

		// Whenever the shared types change — locally OR from a remote peer —
		// re-derive plain JS snapshots and push them into React state.
		const onItems = () => this.emitItems();
		const onCategories = () => this.emitCategories();
		const onTrip = () => this.emitTrip();
		this.doc.items.observeDeep(onItems);
		this.doc.categories.observeDeep(onCategories);
		this.doc.trip.observe(onTrip);
		this.disposers.push(
			() => this.doc.items.unobserveDeep(onItems),
			() => this.doc.categories.unobserveDeep(onCategories),
			() => this.doc.trip.unobserve(onTrip),
		);

		this.emitItems();
		this.emitCategories();
		this.emitTrip();
	}

	dispose(): void {
		for (const d of this.disposers) d();
		this.disposers = [];
	}

	// Wraps a mutation so UndoManager will track it as "this user's edit".
	private localTransact(fn: () => void): void {
		this.doc.ydoc.transact(fn, this.doc.localOrigin);
	}

	// Mutations that should not be undoable (matches original behavior for
	// category edits and bulk deletes tied to trip date changes).
	private silentTransact(fn: () => void): void {
		this.doc.ydoc.transact(fn);
	}

	private emitItems(): void {
		const items = this.doc.items.toArray().map(itemFromMap);
		items.sort((a, b) => {
			if (a.day !== b.day) return a.day.localeCompare(b.day);
			return a.startTime.localeCompare(b.startTime);
		});
		this.listener.setItems(items);
	}

	private emitCategories(): void {
		this.listener.setCategories(this.doc.categories.toArray().map(categoryFromMap));
	}

	private emitTrip(): void {
		this.listener.setTrip(this.readTrip());
	}

	private readTrip(): Trip | null {
		if (!this.doc.trip.has("name")) return null;
		return {
			name: this.doc.trip.get("name") as string,
			startDate: this.doc.trip.get("startDate") as string,
			endDate: this.doc.trip.get("endDate") as string,
		};
	}

	get items(): AgendaItem[] {
		return this.doc.items.toArray().map(itemFromMap);
	}

	get trip(): Trip | null {
		return this.readTrip();
	}

	get categories(): Category[] {
		return this.doc.categories.toArray().map(categoryFromMap);
	}

	// ── Trip ────────────────────────────────────────

	createTrip(name: string, startDate: string, endDate: string): void {
		const trimmed = name.trim();
		if (!trimmed || !startDate || !endDate) return;
		this.silentTransact(() => {
			this.doc.trip.set("name", trimmed);
			this.doc.trip.set("startDate", startDate);
			this.doc.trip.set("endDate", endDate);
		});
	}

	updateTrip(name: string, startDate: string, endDate: string): void {
		const trimmed = name.trim();
		if (!trimmed || !startDate || !endDate || !this.doc.trip.has("name")) return;
		this.silentTransact(() => {
			this.doc.trip.set("name", trimmed);
			this.doc.trip.set("startDate", startDate);
			this.doc.trip.set("endDate", endDate);
		});
	}

	// ── Items ────────────────────────────────────────

	addItem(name: string, day: string, startTime: string, endTime: string, categoryId?: number, notes?: string, location?: string): void {
		const trimmed = name.trim();
		if (!trimmed) return;

		let s = startTime;
		let e = endTime;
		if (!s || !e) {
			const now = new Date();
			let hour = now.getHours();
			if (now.getMinutes() > 30) hour++;
			if (hour > 23) hour = 23;
			s = `${String(hour).padStart(2, "0")}:00`;
			e = `${String(hour < 23 ? hour + 1 : 23).padStart(2, "0")}:59`;
		}

		const newItem: AgendaItem = { id: Date.now(), name: trimmed, day, startTime: s, endTime: e, categoryId, notes, location };
		this.localTransact(() => {
			this.doc.items.push([itemMapFrom(newItem)]);
		});
	}

	removeItem(id: number): void {
		const idx = findIndexById(this.doc.items, id);
		if (idx === -1) return;
		this.localTransact(() => {
			this.doc.items.delete(idx, 1);
		});
	}

	removeItemsBulk(ids: number[]): void {
		if (ids.length === 0) return;
		const idSet = new Set(ids);
		// Walk the list once, delete from the back so indices remain stable.
		this.silentTransact(() => {
			for (let i = this.doc.items.length - 1; i >= 0; i--) {
				const itemId = this.doc.items.get(i).get("id") as number;
				if (idSet.has(itemId)) this.doc.items.delete(i, 1);
			}
		});
	}

	updateItem(id: number, day: string, startTime: string, endTime: string): void {
		const idx = findIndexById(this.doc.items, id);
		if (idx === -1) return;
		const map = this.doc.items.get(idx);
		this.localTransact(() => {
			map.set("day", day);
			map.set("startTime", startTime);
			map.set("endTime", endTime);
		});
	}

	updateItemFull(id: number, name: string, day: string, startTime: string, endTime: string, categoryId?: number, notes?: string, location?: string): void {
		const trimmed = name.trim();
		if (!trimmed) return;
		const idx = findIndexById(this.doc.items, id);
		if (idx === -1) return;
		const map = this.doc.items.get(idx);
		this.localTransact(() => {
			map.set("name", trimmed);
			map.set("day", day);
			map.set("startTime", startTime);
			map.set("endTime", endTime);
			if (categoryId === undefined) map.delete("categoryId");
			else map.set("categoryId", categoryId);
			if (notes) map.set("notes", notes);
			else map.delete("notes");
			if (location) map.set("location", location);
			else map.delete("location");
		});
	}

	// ── Categories ───────────────────────────────────

	addCategory(name: string, color: string): void {
		const trimmed = name.trim();
		if (!trimmed || !color) return;
		this.silentTransact(() => {
			this.doc.categories.push([categoryMapFrom({ id: Date.now(), name: trimmed, color })]);
		});
	}

	updateCategory(id: number, name: string, color: string): void {
		const trimmed = name.trim();
		if (!trimmed || !color) return;
		const idx = findIndexById(this.doc.categories, id);
		if (idx === -1) return;
		const map = this.doc.categories.get(idx);
		this.silentTransact(() => {
			map.set("name", trimmed);
			map.set("color", color);
		});
	}

	removeCategory(id: number): void {
		const idx = findIndexById(this.doc.categories, id);
		if (idx === -1) return;
		this.silentTransact(() => {
			this.doc.categories.delete(idx, 1);
			// Strip the now-dangling categoryId from any items that used it.
			for (let i = 0; i < this.doc.items.length; i++) {
				const m = this.doc.items.get(i);
				if (m.get("categoryId") === id) m.delete("categoryId");
			}
		});
	}

	// ── Undo / Redo ──────────────────────────────────

	undo(): void { this.doc.undoManager.undo(); }
	redo(): void { this.doc.undoManager.redo(); }
	get canUndo(): boolean { return this.doc.undoManager.undoStack.length > 0; }
	get canRedo(): boolean { return this.doc.undoManager.redoStack.length > 0; }
}

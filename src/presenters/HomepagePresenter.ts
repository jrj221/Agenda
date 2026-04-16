import { CommandHistory } from "../commands/Command";
import { AddItemCommand, RemoveItemCommand, EditItemCommand, MoveItemCommand } from "../commands/AgendaCommands";

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
	private _items: AgendaItem[] = [];
	private _trip: Trip | null = null;
	private _categories: Category[] = [];
	private history = new CommandHistory();

	constructor(listener: HomepageListener) {
		this.listener = listener;
	}

	get items(): AgendaItem[] {
		return this._items;
	}

	get trip(): Trip | null {
		return this._trip;
	}

	get categories(): Category[] {
		return this._categories;
	}

	// Applies a new items array: sorts and notifies the view.
	// All command execute/undo paths go through here.
	private applyItems(items: AgendaItem[]): void {
		this._items = [...items];
		this.sortItems();
		this.listener.setItems(this._items);
	}

	private sortItems(): void {
		this._items.sort((a, b) => {
			if (a.day !== b.day) return a.day.localeCompare(b.day);
			return a.startTime.localeCompare(b.startTime);
		});
	}

	// ── Trip ────────────────────────────────────────

	createTrip(name: string, startDate: string, endDate: string): void {
		const trimmedName = name.trim();
		if (!trimmedName || !startDate || !endDate) return;

		this._trip = { name: trimmedName, startDate, endDate };
		this.listener.setTrip(this._trip);
	}

	updateTrip(name: string, startDate: string, endDate: string): void {
		const trimmedName = name.trim();
		if (!trimmedName || !startDate || !endDate || !this._trip) return;

		this._trip = { name: trimmedName, startDate, endDate };
		this.listener.setTrip(this._trip);
	}

	// ── Items ────────────────────────────────────────

	addItem(name: string, day: string, startTime: string, endTime: string, categoryId?: number): void {
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

		const before = [...this._items];
		const newItem: AgendaItem = { id: Date.now(), name: trimmed, day, startTime: s, endTime: e, categoryId };
		const after = [...before, newItem];

		this.history.run(new AddItemCommand(before, after, (items) => this.applyItems(items)));
	}

	removeItem(id: number): void {
		const before = [...this._items];
		const after = before.filter((i) => i.id !== id);
		this.history.run(new RemoveItemCommand(before, after, (items) => this.applyItems(items)));
	}

	// Removes multiple items without adding to undo history.
	// Used for bulk deletions tied to trip-date changes, which are themselves not undoable.
	removeItemsBulk(ids: number[]): void {
		const idSet = new Set(ids);
		this._items = this._items.filter((i) => !idSet.has(i.id));
		this.listener.setItems(this._items);
	}

	// Used for drag-drop repositioning (day + time only).
	updateItem(id: number, day: string, startTime: string, endTime: string): void {
		const before = [...this._items];
		const idx = before.findIndex((i) => i.id === id);
		if (idx === -1) return;

		const after = [...before];
		after[idx] = { ...after[idx], day, startTime, endTime };

		this.history.run(new MoveItemCommand(before, after, (items) => this.applyItems(items)));
	}

	// Used for the edit modal (name + day + time + category).
	updateItemFull(id: number, name: string, day: string, startTime: string, endTime: string, categoryId?: number): void {
		const trimmed = name.trim();
		if (!trimmed) return;
		const before = [...this._items];
		const idx = before.findIndex((i) => i.id === id);
		if (idx === -1) return;

		const after = [...before];
		after[idx] = { ...after[idx], name: trimmed, day, startTime, endTime, categoryId };

		this.history.run(new EditItemCommand(before, after, (items) => this.applyItems(items)));
	}

	// ── Categories ───────────────────────────────────

	addCategory(name: string, color: string): void {
		const trimmed = name.trim();
		if (!trimmed || !color) return;
		this._categories = [...this._categories, { id: Date.now(), name: trimmed, color }];
		this.listener.setCategories(this._categories);
	}

	updateCategory(id: number, name: string, color: string): void {
		const trimmed = name.trim();
		if (!trimmed || !color) return;
		const idx = this._categories.findIndex((c) => c.id === id);
		if (idx === -1) return;
		const next = [...this._categories];
		next[idx] = { ...next[idx], name: trimmed, color };
		this._categories = next;
		this.listener.setCategories(this._categories);
	}

	removeCategory(id: number): void {
		this._categories = this._categories.filter((c) => c.id !== id);
		// Strip the category from any items that used it
		const affected = this._items.some((i) => i.categoryId === id);
		if (affected) {
			this._items = this._items.map((i) => i.categoryId === id ? { ...i, categoryId: undefined } : i);
			this.listener.setItems(this._items);
		}
		this.listener.setCategories(this._categories);
	}

	// ── Undo / Redo ──────────────────────────────────

	undo(): void { this.history.undo(); }
	redo(): void { this.history.redo(); }
	get canUndo(): boolean { return this.history.canUndo; }
	get canRedo(): boolean { return this.history.canRedo; }
}

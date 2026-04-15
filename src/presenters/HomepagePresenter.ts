export interface AgendaItem {
	id: number;
	name: string;
	day: string;
	startTime: string; // "HH:MM"
	endTime: string;   // "HH:MM"
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
}

export class HomepagePresenter {
	private listener: HomepageListener;
	private _items: AgendaItem[] = [];
	private _trip: Trip | null = null;

	constructor(listener: HomepageListener) {
		this.listener = listener;
	}

	get items(): AgendaItem[] {
		return this._items;
	}

	get trip(): Trip | null {
		return this._trip;
	}

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

	addItem(name: string, day: string, startTime: string, endTime: string): void {
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

		this._items = [...this._items, { id: Date.now(), name: trimmed, day, startTime: s, endTime: e }];
		this.sortItems();
		this.listener.setItems(this._items);
	}

	private sortItems(): void {
		this._items.sort((a, b) => {
			if (a.day !== b.day) return a.day.localeCompare(b.day);
			return a.startTime.localeCompare(b.startTime);
		});
	}

	removeItem(id: number): void {
		this._items = this._items.filter((i) => i.id !== id);
		this.listener.setItems(this._items);
	}

	updateItem(id: number, day: string, startTime: string, endTime: string): void {
		const idx = this._items.findIndex((i) => i.id === id);
		if (idx === -1) return;

		const next = [...this._items];
		next[idx] = { ...next[idx], day, startTime, endTime };
		this._items = next;
		this.sortItems();
		this.listener.setItems(this._items);
	}

	updateItemFull(id: number, name: string, day: string, startTime: string, endTime: string): void {
		const trimmed = name.trim();
		if (!trimmed) return;
		const idx = this._items.findIndex((i) => i.id === id);
		if (idx === -1) return;

		const next = [...this._items];
		next[idx] = { ...next[idx], name: trimmed, day, startTime, endTime };
		this._items = next;
		this.sortItems();
		this.listener.setItems(this._items);
	}
}

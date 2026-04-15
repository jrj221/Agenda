export interface Item {
	id: number;
	name: string;
}

// Callbacks the presenter uses to push state changes back to the component
export interface HomepageListener {
	setItems: (items: Item[]) => void;
}

export class HomepagePresenter {
	private listener: HomepageListener;
	private _items: Item[] = [];

	constructor(listener: HomepageListener) {
		this.listener = listener;
	}

	get items(): Item[] {
		return this._items;
	}

	addItem(name: string): void {
		const trimmed = name.trim();
		if (!trimmed) return;
		this._items = [...this._items, { id: Date.now(), name: trimmed }];
		this.listener.setItems(this._items);
	}

	removeItem(id: number): void {
		this._items = this._items.filter((i) => i.id !== id);
		this.listener.setItems(this._items);
	}

	// Commits a drag-and-drop reorder. dropIndex is relative to the full
	// items array (including the dragged item at its original position).
	reorderItem(draggedId: number, dropIndex: number): void {
		const from = this._items.findIndex((i) => i.id === draggedId);
		if (from === -1) return;
		const dragged = this._items[from];
		const next = [...this._items];
		next.splice(from, 1);
		const to = dropIndex > from ? dropIndex - 1 : dropIndex;
		next.splice(to, 0, dragged);
		this._items = next;
		this.listener.setItems(this._items);
	}
}

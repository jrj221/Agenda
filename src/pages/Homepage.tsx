import { useState } from "react";
import "../App.css";

interface Item {
	id: number;
	name: string;
}

type Entry = { type: "indicator" } | { type: "item"; item: Item; idx: number };

function Homepage() {
	const [items, setItems] = useState<Item[]>([]);
	const [input, setInput] = useState("");
	const [draggedId, setDraggedId] = useState<number | null>(null);
	const [dropIndex, setDropIndex] = useState<number | null>(null);

	// ── Itinerary actions ──────────────────────────
	function addItem() {
		const trimmed = input.trim();
		if (!trimmed) return;
		setItems((prev) => [...prev, { id: Date.now(), name: trimmed }]);
		setInput("");
	}

	function removeItem(id: number) {
		setItems((prev) => prev.filter((i) => i.id !== id));
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") addItem();
	}

	// ── Drag & Drop ────────────────────────────────
	function handleDragStart(e: React.DragEvent<HTMLLIElement>, id: number) {
		// Keep the element in the DOM — removing it would cancel the browser drag.
		// We just mark it with state so we can style it as transparent.
		setDraggedId(id);
		e.dataTransfer.effectAllowed = "move";
	}

	function handleDragOver(e: React.DragEvent<HTMLLIElement>, id: number) {
		e.preventDefault();
		// Skip updates when hovering over the item being dragged
		if (id === draggedId) return;

		// Determine if cursor is in the top or bottom half of this item,
		// then set dropIndex to insert before or after it respectively.
		const rect = e.currentTarget.getBoundingClientRect();
		const isTopHalf = e.clientY < rect.top + rect.height / 2;
		const idx = items.findIndex((i) => i.id === id);
		setDropIndex(isTopHalf ? idx : idx + 1);
	}

	function commitDrop() {
		if (draggedId === null || dropIndex === null) return;

		setItems((prev) => {
			const from = prev.findIndex((i) => i.id === draggedId);
			const dragged = prev[from];
			const next = [...prev];
			next.splice(from, 1);
			// Adjust target index since one element was removed before it
			const to = dropIndex > from ? dropIndex - 1 : dropIndex;
			next.splice(to, 0, dragged);
			return next;
		});

		setDraggedId(null);
		setDropIndex(null);
	}

	function handleDragEnd() {
		// Fires whether drop succeeded or was cancelled — always reset state
		setDraggedId(null);
		setDropIndex(null);
	}

	// ── Build render entries ───────────────────────
	// Inject the drop indicator pseudo-element at dropIndex,
	// keeping all real items in the DOM throughout the drag.
	const isDragging = draggedId !== null && dropIndex !== null;
	const entries: Entry[] = [];
	items.forEach((item, idx) => {
		if (isDragging && dropIndex === idx) {
			entries.push({ type: "indicator" });
		}
		entries.push({ type: "item", item, idx });
	});
	if (isDragging && dropIndex === items.length) {
		entries.push({ type: "indicator" });
	}

	return (
		<div className="page">
			{/* Header */}
			<header className="header">
				<span className="logo">Agenda</span>
			</header>

			{/* Main */}
			<main className="main">
				<div className="card">
					<div className="card-header">
						<h1 className="card-title">Your Itinerary</h1>
						<p className="card-subtitle">Plan your perfect trip ✈️</p>
					</div>

					{/* Input */}
					<div className="input-row">
						<input
							className="text-input"
							type="text"
							placeholder="Add an item... (e.g. Visit the Colosseum)"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							aria-label="New itinerary item"
						/>
						<button className="add-btn" onClick={addItem} aria-label="Add item">
							+ Add
						</button>
					</div>

					{/* List */}
					{items.length > 0 ? (
						<ul
							className="item-list"
							aria-label="Itinerary items"
							onDragOver={(e) => e.preventDefault()}
							onDrop={commitDrop}
						>
							{entries.map((entry) =>
								entry.type === "indicator" ? (
									<li key="drop-indicator" className="drop-indicator" aria-hidden="true" />
								) : (
									<li
										key={entry.item.id}
										className={`item${entry.item.id === draggedId ? " item--dragging" : ""}`}
										draggable
										onDragStart={(e) => handleDragStart(e, entry.item.id)}
										onDragOver={(e) => handleDragOver(e, entry.item.id)}
										onDrop={(e) => { e.stopPropagation(); commitDrop(); }}
										onDragEnd={handleDragEnd}
									>
										<span className="drag-handle" aria-hidden="true">⠿</span>
										<span className="item-number">{entry.idx + 1}</span>
										<span className="item-name">{entry.item.name}</span>
										<button
											className="remove-btn"
											onClick={() => removeItem(entry.item.id)}
											aria-label={`Remove ${entry.item.name}`}
										>
											✕
										</button>
									</li>
								),
							)}
						</ul>
					) : (
						<div className="empty-state">
							<span className="empty-icon">🌴</span>
							<p>No items yet — start planning your adventure!</p>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}

export default Homepage;

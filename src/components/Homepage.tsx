import { useState, useRef } from "react";
import "../App.css";
import type { Item, HomepageListener } from "../presenters/HomepagePresenter";
import { HomepagePresenter } from "../presenters/HomepagePresenter";

interface Props {
	presenterFactory: (listener: HomepageListener) => HomepagePresenter;
}

type Entry = { type: "insertion-line" } | { type: "real-item"; item: Item; idx: number };

function Homepage(props: Props) {
	const [items, setItems] = useState<Item[]>([]);
	const [input, setInput] = useState("");
	const [draggedId, setDraggedId] = useState<number | null>(null);
	const [dropIndex, setDropIndex] = useState<number | null>(null);

	// The listener allows the presenter to update local state without the component
	// needing to manage the items array.
	const listener: HomepageListener = {
		setItems: (newItems: Item[]) => setItems(newItems),
	};

	const presenterRef = useRef<HomepagePresenter | null>(null);
	if (!presenterRef.current) {
		presenterRef.current = props.presenterFactory(listener);
	}

	// ── Itinerary actions ──────────────────────────
	function addItem() {
		presenterRef.current?.addItem(input);
		setInput("");
	}

	function removeItem(id: number) {
		presenterRef.current?.removeItem(id);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter") addItem();
	}

	// ── Drag & Drop ────────────────────────────────
	function handleDragStart(e: React.DragEvent<HTMLLIElement>, id: number) {
		setDraggedId(id);
		e.dataTransfer.effectAllowed = "move";
	}

	function handleDragOver(e: React.DragEvent<HTMLLIElement>, id: number) {
		e.preventDefault();
		if (id === draggedId) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const isTopHalf = e.clientY < rect.top + rect.height / 2;
		const idx = items.findIndex((i) => i.id === id);
		setDropIndex(isTopHalf ? idx : idx + 1);
	}

	function commitDrop() {
		if (draggedId === null || dropIndex === null) return;

		presenterRef.current?.reorderItem(draggedId, dropIndex);

		setDraggedId(null);
		setDropIndex(null);
	}

	function handleDragEnd() {
		setDraggedId(null);
		setDropIndex(null);
	}

	// ── Build render entries ───────────────────────
	const isDragging = draggedId !== null && dropIndex !== null;
	const entries: Entry[] = [];
	items.forEach((item, idx) => {
		if (isDragging && dropIndex === idx) {
			entries.push({ type: "insertion-line" });
		}
		entries.push({ type: "real-item", item, idx });
	});
	if (isDragging && dropIndex === items.length) {
		entries.push({ type: "insertion-line" });
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
								entry.type === "insertion-line" ? (
									<li key="drop-indicator" className="drop-indicator" aria-hidden="true" />
								) : (
									<li
										key={entry.item.id}
										className={`item${entry.item.id === draggedId ? " item--dragging" : ""}`}
										draggable
										onDragStart={(e) => handleDragStart(e, entry.item.id)}
										onDragOver={(e) => handleDragOver(e, entry.item.id)}
										onDrop={(e) => {
											e.stopPropagation();
											commitDrop();
										}}
										onDragEnd={handleDragEnd}
									>
										<span className="drag-handle" aria-hidden="true">
											⠿
										</span>
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

import React, { useState } from "react";
import "../App.css";
import type { AgendaItem, Category } from "../presenters/HomepagePresenter";
import { HomepagePresenter } from "../presenters/HomepagePresenter";
import { formatDisplayDate, timeToMins, formatTime12h, parseDateString, formatDateObj } from "../utils/dateUtils";
import { LocationAutocomplete } from "./LocationAutocomplete";
import DatePicker from "react-datepicker";

type LayoutItem = AgendaItem & {
	startMin: number;
	endMin: number;
	widthPercent: number;
	leftPercent: number;
	col: number;
	tabIndent: number;
};

interface DayPanelProps {
	dayString: string;
	items: AgendaItem[];
	expanded: boolean;
	onToggle: () => void;
	presenterRef: React.RefObject<HomepagePresenter | null>;
	draggedId: number | null;
	setDraggedId: (id: number | null) => void;
	categories: Category[];
	onManageCategories: () => void;
}

function hexToTint(hex: string, amount: number): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const tr = Math.round(amount * r + (1 - amount) * 255);
	const tg = Math.round(amount * g + (1 - amount) * 255);
	const tb = Math.round(amount * b + (1 - amount) * 255);
	return `rgb(${tr}, ${tg}, ${tb})`;
}

export function DayPanel({ dayString, items, expanded, onToggle, presenterRef, draggedId, setDraggedId, categories, onManageCategories }: DayPanelProps) {
	const [name, setName] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
	const dragOffsetY = React.useRef(0);

	const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
	const [editName, setEditName] = useState("");
	const [editDay, setEditDay] = useState("");
	const [editStartTime, setEditStartTime] = useState("");
	const [editEndTime, setEditEndTime] = useState("");
	const [editCategoryId, setEditCategoryId] = useState<number | undefined>(undefined);
	const [editNotes, setEditNotes] = useState("");
	const [editLocation, setEditLocation] = useState("");

	function openEdit(item: AgendaItem) {
		setEditingItem(item);
		setEditName(item.name);
		setEditDay(item.day);
		setEditStartTime(item.startTime);
		setEditEndTime(item.endTime);
		setEditCategoryId(item.categoryId);
		setEditNotes(item.notes || "");
		setEditLocation(item.location || "");
	}

	function saveItemEdit() {
		if (!editingItem) return;
		presenterRef.current?.updateItemFull(editingItem.id, editName, editDay, editStartTime, editEndTime, editCategoryId, editNotes || undefined, editLocation || undefined);
		setEditingItem(null);
	}

	function addItem() {
		presenterRef.current?.addItem(name, dayString, startTime, endTime, categoryId);
		setName("");
		setStartTime("");
		setEndTime("");
		setCategoryId(undefined);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" && name.trim() !== "") addItem();
	}

	function handleTimelineDrop(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		e.stopPropagation();
		if (draggedId === null) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const y = e.clientY - rect.top - dragOffsetY.current;

		const draggedMins = y * 2; // Since height is 720px (1px = 2 mins)
		const snappedMins = Math.max(0, Math.round(draggedMins / 15) * 15);
		const draggedItem = presenterRef.current?.items.find((i) => i.id === draggedId);
		if (!draggedItem) return;

		const startM = timeToMins(draggedItem.startTime);
		let endM = timeToMins(draggedItem.endTime);
		if (endM <= startM) endM = startM + 60;
		const duration = endM - startM;

		const newStartMins = snappedMins;
		const newEndMins = Math.min(1440, newStartMins + duration);

		const formatTime = (mins: number) => {
			const h = Math.floor(mins / 60);
			const m = mins % 60;
			return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
		};

		presenterRef.current?.updateItem(draggedId, dayString, formatTime(newStartMins), formatTime(newEndMins));
		setDraggedId(null);
	}

	function handleHeaderDrop(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		if (draggedId === null) return;
		const draggedItem = presenterRef.current?.items.find((i) => i.id === draggedId);
		if (!draggedItem) return;

		// Move to this day without changing times
		presenterRef.current?.updateItem(draggedId, dayString, draggedItem.startTime, draggedItem.endTime);
		setDraggedId(null);
	}

	// Layout math
	const layoutItems = React.useMemo(() => {
		const parsed = items.map((i) => {
			let s = timeToMins(i.startTime);
			let e = timeToMins(i.endTime);
			if (e <= s) e = s + 60;
			return { ...i, startMin: s, endMin: e, col: 0, widthPercent: 100, leftPercent: 0, tabIndent: 0 } as LayoutItem;
		});

		// Events ≤30min all render at the same min height, so they visually collide
		// unless their starts are ≥30min apart. Cluster events that should share
		// horizontal space: same start time (any length), or two short events whose
		// rendered blocks would overlap.
		const displayEnd = (it: LayoutItem) => it.startMin + Math.max(it.endMin - it.startMin, 30);
		const isShortEvent = (it: LayoutItem) => it.endMin - it.startMin <= 30;

		const parent = parsed.map((_, i) => i);
		const find = (x: number): number => {
			while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
			return x;
		};
		const union = (a: number, b: number) => {
			const ra = find(a), rb = find(b);
			if (ra !== rb) parent[ra] = rb;
		};

		for (let i = 0; i < parsed.length; i++) {
			for (let j = i + 1; j < parsed.length; j++) {
				const a = parsed[i], b = parsed[j];
				if (a.startMin === b.startMin) {
					union(i, j);
				} else if (isShortEvent(a) && isShortEvent(b) && displayEnd(a) > b.startMin && displayEnd(b) > a.startMin) {
					union(i, j);
				}
			}
		}

		const clusters = new Map<number, number[]>();
		parsed.forEach((_, i) => {
			const r = find(i);
			if (!clusters.has(r)) clusters.set(r, []);
			clusters.get(r)!.push(i);
		});

		for (const indices of clusters.values()) {
			indices.sort((a, b) => parsed[a].startMin - parsed[b].startMin || parsed[a].id - parsed[b].id);
			const n = indices.length;
			indices.forEach((idx, col) => {
				parsed[idx].col = col;
				parsed[idx].widthPercent = 100 / n;
				parsed[idx].leftPercent = (100 / n) * col;
			});
		}

		const clusterId = new Map<number, number>();
		parsed.forEach((item, i) => clusterId.set(item.id, find(i)));

		// Sort ascending so j < i always means earlier start time.
		parsed.sort((a, b) => a.startMin - b.startMin);

		// tabIndent sums a per-parent clearance: if our start lands inside a parent's
		// header zone (time+name lines, ~60min tall), indent enough to clear that
		// text; otherwise just nudge over so the stack is visually distinct.
		for (let i = 0; i < parsed.length; i++) {
			let tabIndent = 0;
			for (let j = 0; j < i; j++) {
				if (clusterId.get(parsed[i].id) === clusterId.get(parsed[j].id)) continue;
				if (parsed[j].startMin < parsed[i].startMin && parsed[j].endMin > parsed[i].startMin) {
					const gap = parsed[i].startMin - parsed[j].startMin;
					tabIndent += gap < 60 ? 75 : 10;
				}
			}
			parsed[i].tabIndent = Math.min(tabIndent, 150);
		}

		return parsed;
	}, [items]);

	const hours = Array.from({ length: 24 }, (_, i) => i);

	return (
		<div className="day-panel">
			<div
				className={`day-accordion-header ${expanded ? "expanded" : ""}`}
				onClick={onToggle}
				onDragOver={(e) => e.preventDefault()}
				onDrop={handleHeaderDrop}
			>
				<span className="carat">{expanded ? "▼" : "▶"}</span>
				<span className="day-accordion-title">{formatDisplayDate(dayString)}</span>
				<span className="badge">{items.length} items</span>
			</div>

			{expanded && (
				<div className="day-content">
					{/* Local Input Bar */}
					<div className="input-group input-group--local">
						<div className="input-bar">
							<input
								className="text-input"
								type="text"
								placeholder="Add an event..."
								value={name}
								onChange={(e) => setName(e.target.value)}
								onKeyDown={handleKeyDown}
							/>
							<div className="divider" />
							<span className="input-label" style={{ marginLeft: "4px" }}>Start:</span>
							<input
								className="date-input text-input"
								type="time"
								step={300}
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
							/>
							<div className="divider" />
							<span className="input-label" style={{ marginLeft: "4px" }}>End:</span>
							<input
								className="date-input text-input"
								type="time"
								step={300}
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
							/>
							<div className="divider" />
							<select
								className="category-select"
								value={categoryId ?? ""}
								onChange={(e) => {
									if (e.target.value === "manage") {
										onManageCategories();
									} else {
										setCategoryId(e.target.value ? Number(e.target.value) : undefined);
									}
								}}
							>
								<option value="">No category</option>
								{categories.map((cat) => (
									<option key={cat.id} value={cat.id}>{cat.name}</option>
								))}
								<option disabled>──────</option>
								<option value="manage">{categories.length === 0 ? "Create category..." : "Manage categories..."}</option>
							</select>
						</div>
						<button className="add-btn add-btn--local" onClick={addItem} disabled={name.trim() === ""}>
							Add
						</button>
					</div>

					{/* 24 Hour Timeline */}
					<div
						className="timeline-container"
						onDragOver={(e) => e.preventDefault()}
						onDrop={handleTimelineDrop}
					>
						{hours.map((h) => (
							<div key={h} className="hour-label" style={{ top: `${h * 30}px` }}>
								{h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
							</div>
						))}

						{layoutItems.map((item) => {
							const tabIndent = item.tabIndent;
							const duration = item.endMin - item.startMin;
							const isShort = duration < 105;
							const isTiny = duration < 60;
							const displayHeight = Math.max(duration, 30) * 0.5;
							const timeLabel = `${formatTime12h(item.startTime)} – ${formatTime12h(item.endTime)}`;
							const category = categories.find((c) => c.id === item.categoryId);
							return (
								<div
									key={item.id}
									className={`event-block ${isTiny ? "event-block--tiny" : ""} ${draggedId === item.id ? "event-block--dragging" : ""}`}
									draggable
									onDoubleClick={(e) => { e.stopPropagation(); openEdit(item); }}
									onDragStart={(e) => {
										e.dataTransfer.effectAllowed = "move";
										dragOffsetY.current = e.nativeEvent.offsetY;
										setDraggedId(item.id);
									}}
									onDragEnd={() => setDraggedId(null)}
									style={{
										top: `${item.startMin * 0.5}px`,
										height: `${displayHeight}px`,
										left: `calc(${item.leftPercent}% + ${tabIndent}px)`,
										width: `calc(${item.widthPercent}% - ${tabIndent + 4}px)`,
										zIndex: draggedId === item.id ? 9999 : item.startMin,
										...(category ? {
											borderLeft: `4px solid ${category.color}`,
											background: hexToTint(category.color, 0.13),
										} : {}),
									}}
								>
									<div className="event-block-content">
										{isShort ? (
											<div className="event-block-inline">
												<span className="event-block-name">{item.name}</span>
												<span className="event-block-time">{timeLabel}</span>
											</div>
										) : (
											<>
												<div className="event-block-time">{timeLabel}</div>
												<div className="event-block-name">{item.name}</div>
												{item.location && <div className="event-block-location">{item.location}</div>}
											</>
										)}
									</div>
									<button
										className="remove-btn remove-btn--floating"
										onClick={() => presenterRef.current?.removeItem(item.id)}
										aria-label={`Remove ${item.name}`}
									>
										✕
									</button>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{editingItem && (
				<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingItem(null); }}>
					<div className="modal-card">
						<h2 className="modal-title">Edit Event</h2>
						<div className="input-group" style={{ flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
							<div className="input-bar trip-name-bar">
								<input
									className="text-input trip-name-input"
									type="text"
									placeholder="Event name"
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
								/>
							</div>
							<div className="input-bar">
								<span className="input-label">Day:</span>
								<DatePicker
									className="date-input text-input"
									selected={parseDateString(editDay)}
									onChange={(date: Date | null) => setEditDay(formatDateObj(date))}
									dateFormat="MM/dd/yyyy"
									portalId="datepicker-portal"
									placeholderText="Select date"
								/>
							</div>
							<div className="input-bar">
								<span className="input-label">Start:</span>
								<input
									className="date-input text-input"
									type="time"
									step={300}
									value={editStartTime}
									onChange={(e) => setEditStartTime(e.target.value)}
								/>
								<div className="divider" />
								<span className="input-label">End:</span>
								<input
									className="date-input text-input"
									type="time"
									step={300}
									value={editEndTime}
									onChange={(e) => setEditEndTime(e.target.value)}
								/>
							</div>
							<div className="input-bar">
								<span className="input-label">Category:</span>
								<select
									className="category-select category-select--full"
									value={editCategoryId ?? ""}
									onChange={(e) => {
										if (e.target.value === "manage") {
											onManageCategories();
										} else {
											setEditCategoryId(e.target.value ? Number(e.target.value) : undefined);
										}
									}}
								>
									<option value="">No category</option>
									{categories.map((cat) => (
										<option key={cat.id} value={cat.id}>{cat.name}</option>
									))}
									<option disabled>──────</option>
									<option value="manage">{categories.length === 0 ? "Create category..." : "Manage categories..."}</option>
								</select>
							</div>
							<div className="input-bar">
								<span className="input-label">Location:</span>
								<LocationAutocomplete value={editLocation} onChange={setEditLocation} />
							</div>
							<div className="input-bar">
								<span className="input-label">Notes:</span>
								<textarea
									className="text-input"
									placeholder="Add notes..."
									value={editNotes}
									onChange={(e) => setEditNotes(e.target.value)}
									rows={3}
									style={{ resize: "vertical", flex: 1 }}
								/>
							</div>
						</div>
						<div className="modal-actions">
							<button
								className="add-btn"
								onClick={saveItemEdit}
								disabled={!editName.trim() || !editDay}
							>
								Save
							</button>
							<button className="add-btn edit-cancel-btn" onClick={() => setEditingItem(null)}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

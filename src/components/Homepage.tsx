import React, { useState, useRef } from "react";
import "../App.css";
import type { AgendaItem, Trip, HomepageListener } from "../presenters/HomepagePresenter";
import { HomepagePresenter } from "../presenters/HomepagePresenter";

interface Props {
	presenterFactory: (listener: HomepageListener) => HomepagePresenter;
}

type LayoutItem = AgendaItem & {
	startMin: number;
	endMin: number;
	widthPercent: number;
	leftPercent: number;
	col: number;
};

type PendingEdit = {
	name: string;
	start: string;
	end: string;
	potentiallyDeletedDates: string[];
} | null;

// Helper: split time and convert to minutes
function timeToMins(t: string | undefined): number {
	if (!t) return 0;
	const [h, m] = t.split(":").map(Number);
	return h * 60 + (m || 0);
}

function formatDisplayDate(dateStr: string) {
	if (!dateStr) return "Undated";
	const [year, month, day] = dateStr.split("-");
	const d = new Date(Number(year), Number(month) - 1, Number(day));
	return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function generateDateRangeArray(start: string, end: string) {
	const dates = [];
	const [sYear, sMonth, sDay] = start.split("-");
	const [eYear, eMonth, eDay] = end.split("-");
	let curr = new Date(Number(sYear), Number(sMonth) - 1, Number(sDay));
	const endDateNode = new Date(Number(eYear), Number(eMonth) - 1, Number(eDay));
	while (curr <= endDateNode) {
		const y = curr.getFullYear();
		const m = String(curr.getMonth() + 1).padStart(2, "0");
		const d = String(curr.getDate()).padStart(2, "0");
		dates.push(`${y}-${m}-${d}`);
		curr.setDate(curr.getDate() + 1);
	}
	return dates;
}

// ── DayPanel Component ─────────────────────────────
interface DayPanelProps {
	dayString: string;
	items: AgendaItem[];
	expanded: boolean;
	onToggle: () => void;
	presenterRef: React.MutableRefObject<HomepagePresenter | null>;
	draggedId: number | null;
	setDraggedId: (id: number | null) => void;
}

function DayPanel({ dayString, items, expanded, onToggle, presenterRef, draggedId, setDraggedId }: DayPanelProps) {
	const [name, setName] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");

	function addItem() {
		presenterRef.current?.addItem(name, dayString, startTime, endTime);
		setName("");
		setStartTime("");
		setEndTime("");
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" && name.trim() !== "") addItem();
	}

	function handleTimelineDrop(e: React.DragEvent<HTMLDivElement>) {
		e.preventDefault();
		e.stopPropagation();
		if (draggedId === null) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const y = e.clientY - rect.top;

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
			return { ...i, startMin: s, endMin: e, col: -1, widthPercent: 100, leftPercent: 0 } as LayoutItem;
		});

		parsed.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

		const groups: LayoutItem[][] = [];
		let currentGroup: LayoutItem[] = [];
		let groupEnd = 0;

		for (const item of parsed) {
			if (currentGroup.length === 0) {
				currentGroup.push(item);
				groupEnd = item.endMin;
			} else {
				if (item.startMin < groupEnd) {
					currentGroup.push(item);
					groupEnd = Math.max(groupEnd, item.endMin);
				} else {
					groups.push(currentGroup);
					currentGroup = [item];
					groupEnd = item.endMin;
				}
			}
		}
		if (currentGroup.length > 0) groups.push(currentGroup);

		for (const group of groups) {
			const cols: LayoutItem[][] = [];
			for (const item of group) {
				let placed = false;
				for (let i = 0; i < cols.length; i++) {
					const lastInCol = cols[i][cols[i].length - 1];
					if (item.startMin >= lastInCol.endMin) {
						cols[i].push(item);
						item.col = i;
						placed = true;
						break;
					}
				}
				if (!placed) {
					item.col = cols.length;
					cols.push([item]);
				}
			}
			const numCols = cols.length;
			for (const item of group) {
				item.widthPercent = 100 / numCols;
				item.leftPercent = (100 / numCols) * item.col;
			}
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
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
							/>
							<div className="divider" />
							<span className="input-label" style={{ marginLeft: "4px" }}>End:</span>
							<input
								className="date-input text-input"
								type="time"
								value={endTime}
								onChange={(e) => setEndTime(e.target.value)}
							/>
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

						{layoutItems.map((item) => (
							<div
								key={item.id}
								className={`event-block ${draggedId === item.id ? "event-block--dragging" : ""}`}
								draggable
								onDragStart={(e) => {
									e.dataTransfer.effectAllowed = "move";
									setDraggedId(item.id);
								}}
								onDragEnd={() => setDraggedId(null)}
								style={{
									top: `${item.startMin * 0.5}px`,
									height: `${(item.endMin - item.startMin) * 0.5}px`,
									left: `${item.leftPercent}%`,
									width: `calc(${item.widthPercent}% - 4px)`,
									zIndex: draggedId === item.id ? 100 : item.col,
								}}
							>
								<div className="event-block-content">
									<div className="event-block-time">
										{item.startTime} - {item.endTime}
									</div>
									<div className="event-block-name">{item.name}</div>
								</div>
								<button
									className="remove-btn remove-btn--floating"
									onClick={() => presenterRef.current?.removeItem(item.id)}
									aria-label={`Remove ${item.name}`}
								>
									✕
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ── Homepage Component ─────────────────────────────
function Homepage(props: Props) {
	const [trip, setTrip] = useState<Trip | null>(null);
	const [tripName, setTripName] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	const [items, setItems] = useState<AgendaItem[]>([]);
	const [draggedId, setDraggedId] = useState<number | null>(null);
	const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

	// Edit Trip State
	const [isEditingTrip, setIsEditingTrip] = useState(false);
	const [editTripName, setEditTripName] = useState("");
	const [editStartDate, setEditStartDate] = useState("");
	const [editEndDate, setEditEndDate] = useState("");
	const [pendingTripEdit, setPendingTripEdit] = useState<PendingEdit>(null);

	const listener: HomepageListener = {
		setItems: (newItems: AgendaItem[]) => setItems(newItems),
		setTrip: (newTrip: Trip | null) => {
			setTrip(newTrip);
			if (newTrip) {
				setExpandedDays(new Set()); // Empty by default
			}
		},
	};

	const presenterRef = useRef<HomepagePresenter | null>(null);
	if (!presenterRef.current) {
		presenterRef.current = props.presenterFactory(listener);
	}

	function createTrip() {
		presenterRef.current?.createTrip(tripName, startDate, endDate);
	}

	function startEditTrip() {
		if (!trip) return;
		setEditTripName(trip.name);
		setEditStartDate(trip.startDate);
		setEditEndDate(trip.endDate);
		setIsEditingTrip(true);
	}

	function saveTripEdit() {
		const newDateRange = generateDateRangeArray(editStartDate, editEndDate);
		const newDateSet = new Set(newDateRange);
		
		const datesWithEvents = new Set(items.map((i) => i.day));
		const potentiallyDeletedDates = Array.from(datesWithEvents).filter((d) => !newDateSet.has(d));
		
		if (potentiallyDeletedDates.length > 0) {
			setPendingTripEdit({
				name: editTripName,
				start: editStartDate,
				end: editEndDate,
				potentiallyDeletedDates
			});
		} else {
			presenterRef.current?.updateTrip(editTripName, editStartDate, editEndDate);
			setIsEditingTrip(false);
		}
	}

	function confirmDeleteEvents() {
		if (!pendingTripEdit) return;
		pendingTripEdit.potentiallyDeletedDates.forEach(date => {
			const itemsToDelete = items.filter(i => i.day === date);
			itemsToDelete.forEach(i => presenterRef.current?.removeItem(i.id));
		});
		presenterRef.current?.updateTrip(pendingTripEdit.name, pendingTripEdit.start, pendingTripEdit.end);
		setIsEditingTrip(false);
		setPendingTripEdit(null);
	}

	function confirmKeepEvents() {
		if (!pendingTripEdit) return;
		presenterRef.current?.updateTrip(pendingTripEdit.name, pendingTripEdit.start, pendingTripEdit.end);
		setIsEditingTrip(false);
		setPendingTripEdit(null);
	}

	const toggleDay = (day: string) => {
		const next = new Set(expandedDays);
		if (next.has(day)) next.delete(day);
		else next.add(day);
		setExpandedDays(next);
	};

	const agendaDays = trip
		? Array.from(new Set([...generateDateRangeArray(trip.startDate, trip.endDate), ...items.map((i) => i.day)]))
				.filter((d) => d !== "")
				.sort((a, b) => a.localeCompare(b))
		: [];

	return (
		<div className="page">
			{/* Header */}
			<header className="header">
				<span className="logo">Agenda</span>
			</header>

			{/* Main */}
			<main className="main">
				{!trip ? (
					<div className="card">
						<div className="card-header">
							<h1 className="card-title">Plan your perfect trip ✈️</h1>
							<p className="card-subtitle">Let's get the dates blocked out.</p>
						</div>
						<div className="input-group">
							<div className="input-bar trip-name-bar">
								<input
									className="text-input trip-name-input"
									type="text"
									placeholder="Trip Name (e.g. Rome 2026)"
									value={tripName}
									onChange={(e) => setTripName(e.target.value)}
								/>
							</div>
						</div>
						<div className="input-group">
							<div className="input-bar">
								<span className="input-label">From:</span>
								<input
									className="date-input text-input"
									type="date"
									value={startDate}
									onChange={(e) => setStartDate(e.target.value)}
								/>
								<div className="divider" />
								<span className="input-label">To:</span>
								<input
									className="date-input text-input"
									type="date"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
								/>
							</div>
						</div>
						<button
							className="create-btn add-btn"
							onClick={createTrip}
							disabled={!tripName || !startDate || !endDate || startDate > endDate}
						>
							Start Planning
						</button>
					</div>
				) : (
					<div className="card" style={{ maxWidth: "1200px" }}>
						<div className="card-header">
							{!isEditingTrip ? (
								<>
									<h1 className="card-title">
										{trip.name}
										<button className="edit-icon-btn" onClick={startEditTrip} title="Edit Trip" aria-label="Edit Trip">✏️</button>
									</h1>
									<p className="card-subtitle">
										{formatDisplayDate(trip.startDate)} — {formatDisplayDate(trip.endDate)}
									</p>
								</>
							) : (
								<div className="edit-trip-form">
									<div className="input-group">
										<div className="input-bar trip-name-bar">
											<input
												className="text-input trip-name-input"
												type="text"
												placeholder="Trip Name"
												value={editTripName}
												onChange={(e) => setEditTripName(e.target.value)}
											/>
										</div>
									</div>
									<div className="input-group">
										<div className="input-bar">
											<span className="input-label">From:</span>
											<input
												className="date-input text-input"
												type="date"
												value={editStartDate}
												onChange={(e) => setEditStartDate(e.target.value)}
											/>
											<div className="divider" />
											<span className="input-label">To:</span>
											<input
												className="date-input text-input"
												type="date"
												value={editEndDate}
												onChange={(e) => setEditEndDate(e.target.value)}
											/>
										</div>
									</div>
									<div className="edit-actions">
										<button 
											className="add-btn" 
											onClick={saveTripEdit}
											disabled={!editTripName || !editStartDate || !editEndDate || editStartDate > editEndDate}
										>
											Save
										</button>
										<button className="add-btn edit-cancel-btn" onClick={() => setIsEditingTrip(false)}>Cancel</button>
									</div>
								</div>
							)}
						</div>

						<div className="itinerary">
							{agendaDays.map((dayString) => {
								const dayItems = items.filter((i) => i.day === dayString);

								return (
									<DayPanel
										key={dayString}
										dayString={dayString}
										items={dayItems}
										expanded={expandedDays.has(dayString)}
										onToggle={() => toggleDay(dayString)}
										presenterRef={presenterRef}
										draggedId={draggedId}
										setDraggedId={setDraggedId}
									/>
								);
							})}
						</div>
					</div>
				)}
			</main>

			{/* Modal Overlay Component */}
			{pendingTripEdit && (
				<div className="modal-overlay">
					<div className="modal-card">
						<h2 className="modal-title">Warning: Events Outside Range</h2>
						<p className="modal-text">
							You are trying to change the trip dates, but there are still events on the following dates that fall outside the new range:
						</p>
						<ul className="modal-list">
							{pendingTripEdit.potentiallyDeletedDates.sort().map(d => (
								<li key={d}>{formatDisplayDate(d)}</li>
							))}
						</ul>
						<p className="modal-text" style={{ fontWeight: 600, marginTop: '20px' }}>What would you like to do?</p>
						<div className="modal-actions">
							<button className="add-btn" style={{ background: 'var(--red)', boxShadow: 'none' }} onClick={confirmDeleteEvents}>Delete Events</button>
							<button className="add-btn edit-keep-btn" onClick={confirmKeepEvents}>Keep Events</button>
							<button className="add-btn edit-cancel-btn" onClick={() => setPendingTripEdit(null)}>Cancel</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default Homepage;

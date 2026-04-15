import React, { useState } from "react";
import "../App.css";
import type { AgendaItem } from "../presenters/HomepagePresenter";
import { HomepagePresenter } from "../presenters/HomepagePresenter";
import { formatDisplayDate, timeToMins } from "../utils/dateUtils";

type LayoutItem = AgendaItem & {
	startMin: number;
	endMin: number;
	widthPercent: number;
	leftPercent: number;
	col: number;
};

interface DayPanelProps {
	dayString: string;
	items: AgendaItem[];
	expanded: boolean;
	onToggle: () => void;
	presenterRef: React.MutableRefObject<HomepagePresenter | null>;
	draggedId: number | null;
	setDraggedId: (id: number | null) => void;
}

export function DayPanel({ dayString, items, expanded, onToggle, presenterRef, draggedId, setDraggedId }: DayPanelProps) {
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

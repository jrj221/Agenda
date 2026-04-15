import React, { useState, useRef } from "react";
import "../App.css";
import type { AgendaItem, Trip, HomepageListener } from "../presenters/HomepagePresenter";
import { HomepagePresenter } from "../presenters/HomepagePresenter";

interface Props {
	presenterFactory: (listener: HomepageListener) => HomepagePresenter;
}

import { formatDisplayDate, generateDateRangeArray } from "../utils/dateUtils";
import { DayPanel } from "./DayPanel";

type PendingEdit = {
	name: string;
	start: string;
	end: string;
	potentiallyDeletedDates: string[];
} | null;

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
	const [isEditingTripName, setIsEditingTripName] = useState(false);
	const [isEditingTripDates, setIsEditingTripDates] = useState(false);
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

	function startEditTripName() {
		if (!trip) return;
		setEditTripName(trip.name);
		setIsEditingTripName(true);
	}

	function startEditTripDates() {
		if (!trip) return;
		setEditStartDate(trip.startDate);
		setEditEndDate(trip.endDate);
		setIsEditingTripDates(true);
	}

	function saveTripNameEdit() {
		if (!trip) return;
		presenterRef.current?.updateTrip(editTripName, trip.startDate, trip.endDate);
		setIsEditingTripName(false);
	}

	function saveTripDatesEdit() {
		if (!trip) return;
		const newDateRange = generateDateRangeArray(editStartDate, editEndDate);
		const newDateSet = new Set(newDateRange);
		
		const datesWithEvents = new Set(items.map((i) => i.day));
		const potentiallyDeletedDates = Array.from(datesWithEvents).filter((d) => !newDateSet.has(d));
		
		if (potentiallyDeletedDates.length > 0) {
			setPendingTripEdit({
				name: trip.name,
				start: editStartDate,
				end: editEndDate,
				potentiallyDeletedDates
			});
		} else {
			presenterRef.current?.updateTrip(trip.name, editStartDate, editEndDate);
			setIsEditingTripDates(false);
		}
	}

	function confirmDeleteEvents() {
		if (!pendingTripEdit) return;
		pendingTripEdit.potentiallyDeletedDates.forEach(date => {
			const itemsToDelete = items.filter(i => i.day === date);
			itemsToDelete.forEach(i => presenterRef.current?.removeItem(i.id));
		});
		presenterRef.current?.updateTrip(pendingTripEdit.name, pendingTripEdit.start, pendingTripEdit.end);
		setIsEditingTripDates(false);
		setPendingTripEdit(null);
	}

	function confirmKeepEvents() {
		if (!pendingTripEdit) return;
		presenterRef.current?.updateTrip(pendingTripEdit.name, pendingTripEdit.start, pendingTripEdit.end);
		setIsEditingTripDates(false);
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
							{!isEditingTripName ? (
								<h1 className="card-title">
									{trip.name}
									<button className="edit-icon-btn" onClick={startEditTripName} title="Edit Trip Name" aria-label="Edit Trip Name">✎</button>
								</h1>
							) : (
								<div className="edit-trip-form" style={{ marginBottom: "16px" }}>
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
									<div className="edit-actions">
										<button 
											className="add-btn" 
											style={{ padding: "8px 16px" }}
											onClick={saveTripNameEdit}
											disabled={!editTripName}
										>
											Save
										</button>
										<button className="add-btn edit-cancel-btn" style={{ padding: "8px 16px" }} onClick={() => setIsEditingTripName(false)}>Cancel</button>
									</div>
								</div>
							)}

							{!isEditingTripDates ? (
								<p className="card-subtitle">
									{formatDisplayDate(trip.startDate)} — {formatDisplayDate(trip.endDate)}
									<button className="edit-icon-btn" onClick={startEditTripDates} title="Edit Trip Dates" aria-label="Edit Trip Dates">✎</button>
								</p>
							) : (
								<div className="edit-trip-form">
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
											style={{ padding: "8px 16px" }}
											onClick={saveTripDatesEdit}
											disabled={!editStartDate || !editEndDate || editStartDate > editEndDate}
										>
											Save
										</button>
										<button className="add-btn edit-cancel-btn" style={{ padding: "8px 16px" }} onClick={() => setIsEditingTripDates(false)}>Cancel</button>
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

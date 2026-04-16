import { useState, useRef, forwardRef, useEffect } from "react";
import "../App.css";
import type { AgendaItem, Trip, HomepageListener } from "../presenters/HomepagePresenter";
import { HomepagePresenter } from "../presenters/HomepagePresenter";
import { formatDisplayDate, generateDateRangeArray, parseDateString, formatDateObj } from "../utils/dateUtils";
import { CATEGORY_COLORS } from "../utils/categoryColors";
import { DayPanel } from "./DayPanel";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Props {
	tripId: string;
	presenterFactory: (listener: HomepageListener) => HomepagePresenter;
	onTripNamed?: (name: string) => void;
}

type PendingEdit = {
	name: string;
	start: string;
	end: string;
	potentiallyDeletedDates: string[];
} | null;

// ── Custom DatePicker trigger button ──────────────
const DateEditButton = forwardRef<HTMLButtonElement, { onClick?: () => void; displayText: string }>(
	({ onClick, displayText }, ref) => (
		<button className="date-edit-btn" onClick={onClick} ref={ref}>
			{displayText}
		</button>
	)
);

// ── Homepage Component ─────────────────────────────
function Homepage(props: Props) {
	const [trip, setTrip] = useState<Trip | null>(null);
	const [tripName, setTripName] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	const [items, setItems] = useState<AgendaItem[]>([]);
	const [draggedId, setDraggedId] = useState<number | null>(null);
	const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

	// Category state
	const [categories, setCategories] = useState<{ id: number; name: string; color: string }[]>([]);
	const [isManagingCategories, setIsManagingCategories] = useState(false);
	const [newCatName, setNewCatName] = useState("");
	const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
	const [editingCat, setEditingCat] = useState<{ id: number; name: string; color: string } | null>(null);

	// Edit Trip State
	const [isEditingTripName, setIsEditingTripName] = useState(false);
	const [editTripName, setEditTripName] = useState("");
	const [pendingTripEdit, setPendingTripEdit] = useState<PendingEdit>(null);

	const listener: HomepageListener = {
		setItems: (newItems: AgendaItem[]) => setItems(newItems),
		setTrip: (newTrip: Trip | null) => {
			setTrip(newTrip);
			if (newTrip) {
				setExpandedDays(new Set());
				props.onTripNamed?.(newTrip.name);
			}
		},
		setCategories: (newCategories) => setCategories(newCategories),
	};

	const presenterRef = useRef<HomepagePresenter | null>(null);
	if (!presenterRef.current) {
		presenterRef.current = props.presenterFactory(listener);
	}

	useEffect(() => {
		// Reset the ref on cleanup so the next render rebuilds the presenter
		// with fresh Y.Doc observers. Required because React 19 StrictMode
		// fires this cleanup once in dev without truly unmounting.
		return () => {
			presenterRef.current?.dispose();
			presenterRef.current = null;
		};
	}, []);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			const mod = e.metaKey || e.ctrlKey;
			if (!mod) return;
			if (e.key === "z" && !e.shiftKey) {
				e.preventDefault();
				presenterRef.current?.undo();
			} else if (e.key === "z" && e.shiftKey) {
				e.preventDefault();
				presenterRef.current?.redo();
			} else if (e.key === "y") {
				e.preventDefault();
				presenterRef.current?.redo();
			}
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	function createTrip() {
		presenterRef.current?.createTrip(tripName, startDate, endDate);
	}

	function startEditTripName() {
		if (!trip) return;
		setEditTripName(trip.name);
		setIsEditingTripName(true);
	}

	function saveTripNameEdit() {
		if (!trip) return;
		presenterRef.current?.updateTrip(editTripName, trip.startDate, trip.endDate);
		setIsEditingTripName(false);
	}

	function saveTripDatesEditWith(newStart: string, newEnd: string) {
		if (!trip) return;
		const newDateRange = generateDateRangeArray(newStart, newEnd);
		const newDateSet = new Set(newDateRange);

		const datesWithEvents = new Set(items.map((i) => i.day));
		const potentiallyDeletedDates = Array.from(datesWithEvents).filter((d) => !newDateSet.has(d));

		if (potentiallyDeletedDates.length > 0) {
			setPendingTripEdit({ name: trip.name, start: newStart, end: newEnd, potentiallyDeletedDates });
		} else {
			presenterRef.current?.updateTrip(trip.name, newStart, newEnd);
		}
	}

	function handleStartDateChange(date: Date | null) {
		if (!date || !trip) return;
		saveTripDatesEditWith(formatDateObj(date), trip.endDate);
	}

	function handleEndDateChange(date: Date | null) {
		if (!date || !trip) return;
		saveTripDatesEditWith(trip.startDate, formatDateObj(date));
	}

	function confirmDeleteEvents() {
		if (!pendingTripEdit) return;
		const idsToDelete = items
			.filter((i) => pendingTripEdit.potentiallyDeletedDates.includes(i.day))
			.map((i) => i.id);
		presenterRef.current?.removeItemsBulk(idsToDelete);
		presenterRef.current?.updateTrip(pendingTripEdit.name, pendingTripEdit.start, pendingTripEdit.end);
		setPendingTripEdit(null);
	}

	function confirmKeepEvents() {
		if (!pendingTripEdit) return;
		presenterRef.current?.updateTrip(pendingTripEdit.name, pendingTripEdit.start, pendingTripEdit.end);
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
		<>
			{/* Trip code bar */}
			<div className="trip-code-bar">
				<span className="trip-code-label">
					Trip code: <code className="trip-code-value">{props.tripId}</code>
				</span>
				<button
					className="trip-code-action"
					onClick={() => navigator.clipboard?.writeText(props.tripId)}
					title="Copy trip code"
				>
					Copy code
				</button>
				<button
					className="trip-code-action trip-code-action--invite"
					onClick={() => navigator.clipboard?.writeText(window.location.href)}
					title="Copy invite link"
				>
					Invite a friend
				</button>
			</div>

			<div className="trip-content">
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
								<DatePicker
									className="date-input text-input"
									selected={parseDateString(startDate)}
									onChange={(date: Date | null) => setStartDate(formatDateObj(date))}
									selectsStart
									startDate={parseDateString(startDate)}
									endDate={parseDateString(endDate)}
									dateFormat="MM/dd/yyyy"
									placeholderText="Select date"
								/>
								<div className="divider" />
								<span className="input-label">To:</span>
								<DatePicker
									className="date-input text-input"
									selected={parseDateString(endDate)}
									onChange={(date: Date | null) => setEndDate(formatDateObj(date))}
									selectsEnd
									startDate={parseDateString(startDate)}
									endDate={parseDateString(endDate)}
									minDate={parseDateString(startDate) || undefined}
									dateFormat="MM/dd/yyyy"
									placeholderText="Select date"
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
									<button
										className="edit-icon-btn"
										onClick={startEditTripName}
										title="Edit Trip Name"
										aria-label="Edit Trip Name"
									>
										✎
									</button>
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
										<button
											className="add-btn edit-cancel-btn"
											style={{ padding: "8px 16px" }}
											onClick={() => setIsEditingTripName(false)}
										>
											Cancel
										</button>
									</div>
								</div>
							)}

							<div className="card-subtitle">
								<DatePicker
									selected={parseDateString(trip.startDate)}
									onChange={handleStartDateChange}
									maxDate={parseDateString(trip.endDate) || undefined}
									dateFormat="MM/dd/yyyy"
									portalId="datepicker-portal"
									customInput={<DateEditButton displayText={formatDisplayDate(trip.startDate)} />}
								/>
								{' — '}
								<DatePicker
									selected={parseDateString(trip.endDate)}
									onChange={handleEndDateChange}
									minDate={parseDateString(trip.startDate) || undefined}
									dateFormat="MM/dd/yyyy"
									portalId="datepicker-portal"
									customInput={<DateEditButton displayText={formatDisplayDate(trip.endDate)} />}
								/>
							</div>
						</div>

						{categories.length > 0 && (
							<div className="cat-legend">
								{categories.map((cat) => (
									<div key={cat.id} className="cat-legend-item">
										<span className="cat-legend-dot" style={{ background: cat.color }} />
										{cat.name}
									</div>
								))}
							</div>
						)}

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
										categories={categories}
										onManageCategories={() => setIsManagingCategories(true)}
									/>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Modal Overlay Component */}
			{pendingTripEdit && (
				<div className="modal-overlay">
					<div className="modal-card">
						<h2 className="modal-title">Warning: Events Outside Range</h2>
						<p className="modal-text">
							You are trying to change the trip dates, but there are still events on the following dates
							that fall outside the new range:
						</p>
						<ul className="modal-list">
							{pendingTripEdit.potentiallyDeletedDates.sort().map((d) => (
								<li key={d}>{formatDisplayDate(d)}</li>
							))}
						</ul>
						<p className="modal-text" style={{ fontWeight: 600, marginTop: "20px" }}>
							What would you like to do?
						</p>
						<div className="modal-actions">
							<button
								className="add-btn"
								style={{ background: "var(--red)", boxShadow: "none" }}
								onClick={confirmDeleteEvents}
							>
								Delete Events
							</button>
							<button className="add-btn edit-keep-btn" onClick={confirmKeepEvents}>
								Keep Events
							</button>
							<button className="add-btn edit-cancel-btn" onClick={() => setPendingTripEdit(null)}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Category Management Modal */}
			{isManagingCategories && (
				<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setIsManagingCategories(false); setEditingCat(null); } }}>
					<div className="modal-card">
						<h2 className="modal-title">Categories</h2>

						<div className="cat-list">
							{categories.length === 0 && (
								<p className="modal-text" style={{ marginBottom: "20px" }}>No categories yet. Create one below.</p>
							)}
							{categories.map((cat) =>
								editingCat?.id === cat.id ? (
									<div key={cat.id} className="cat-row cat-row--editing">
										<input
											className="text-input cat-name-input"
											value={editingCat.name}
											onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
											onKeyDown={(e) => {
												if (e.key === "Enter" && editingCat.name.trim()) {
													presenterRef.current?.updateCategory(editingCat.id, editingCat.name, editingCat.color);
													setEditingCat(null);
												} else if (e.key === "Escape") setEditingCat(null);
											}}
											autoFocus
										/>
										<div className="color-swatches">
											{CATEGORY_COLORS.map((c) => (
												<button key={c}
													className={`color-swatch${editingCat.color === c ? " color-swatch--selected" : ""}`}
													style={{ background: c }}
													onClick={() => setEditingCat({ ...editingCat, color: c })}
												/>
											))}
										</div>
										<div className="cat-row-actions">
											<button className="add-btn" style={{ padding: "6px 14px" }}
												onClick={() => { presenterRef.current?.updateCategory(editingCat.id, editingCat.name, editingCat.color); setEditingCat(null); }}
												disabled={!editingCat.name.trim()}
											>Save</button>
											<button className="add-btn edit-cancel-btn" style={{ padding: "6px 14px" }}
												onClick={() => setEditingCat(null)}
											>Cancel</button>
										</div>
									</div>
								) : (
									<div key={cat.id} className="cat-row">
										<span className="cat-dot" style={{ background: cat.color }} />
										<span className="cat-name">{cat.name}</span>
										<div className="cat-row-actions">
											<button className="add-btn" style={{ padding: "6px 14px" }}
												onClick={() => setEditingCat({ id: cat.id, name: cat.name, color: cat.color })}
											>Edit</button>
											<button className="add-btn edit-cancel-btn" style={{ padding: "6px 14px" }}
												onClick={() => presenterRef.current?.removeCategory(cat.id)}
											>Delete</button>
										</div>
									</div>
								)
							)}
						</div>

						<div className="cat-add-form">
							<p className="cat-add-label">New category</p>
							<div className="input-bar trip-name-bar" style={{ marginBottom: "12px" }}>
								<input
									className="text-input"
									placeholder="Name (e.g. Meals, Transport)"
									value={newCatName}
									onChange={(e) => setNewCatName(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && newCatName.trim()) {
											presenterRef.current?.addCategory(newCatName, newCatColor);
											setNewCatName("");
										}
									}}
								/>
							</div>
							<div className="color-swatches" style={{ marginBottom: "14px" }}>
								{CATEGORY_COLORS.map((c) => (
									<button key={c}
										className={`color-swatch${newCatColor === c ? " color-swatch--selected" : ""}`}
										style={{ background: c }}
										onClick={() => setNewCatColor(c)}
									/>
								))}
							</div>
							<button className="add-btn" style={{ width: "100%" }}
								onClick={() => { presenterRef.current?.addCategory(newCatName, newCatColor); setNewCatName(""); }}
								disabled={!newCatName.trim()}
							>Add Category</button>
						</div>

						<div className="modal-actions">
							<button className="add-btn" onClick={() => { setIsManagingCategories(false); setEditingCat(null); }}>Done</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}

export default Homepage;

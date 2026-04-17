import { useState } from "react";
import { type SavedTrip } from "../utils/tripStore";
import "../App.css";

interface SidePanelProps {
	trips: SavedTrip[];
	activeTripId: string | null;
	collapsed: boolean;
	onToggle: () => void;
	onSelectTrip: (tripId: string) => void;
	onGoHome: () => void;
	onLogout: () => void;
	onDeleteTrip: (tripId: string) => void;
}

export function SidePanel({ trips, activeTripId, collapsed, onToggle, onSelectTrip, onGoHome, onLogout, onDeleteTrip }: SidePanelProps) {
	const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

	return (
		<div className={`side-panel ${collapsed ? "side-panel--collapsed" : ""}`}>
			<div className="side-panel-header">
				<button className="logo side-panel-logo" onClick={onGoHome}>
					{collapsed ? "A" : "Agenda"}
				</button>
				<button className="side-panel-toggle" onClick={onToggle} title={collapsed ? "Expand" : "Collapse"}>
					{collapsed ? "▶" : "◀"}
				</button>
			</div>
			<div className="side-panel-content">
				<h3 className="side-panel-section-title">My Trips</h3>
				{trips.length === 0 ? (
					<p className="side-panel-empty">No trips yet. Create or join one!</p>
				) : (
					<ul className="side-panel-trip-list">
						{trips.map((t) => (
							<li key={t.tripId} className="side-panel-trip-item">
								<button
									className={`side-panel-trip-btn ${activeTripId === t.tripId ? "side-panel-trip-btn--active" : ""}`}
									onClick={() => onSelectTrip(t.tripId)}
								>
									<span className="side-panel-trip-name">{t.name || t.tripId}</span>
								</button>
								<button
									className="side-panel-trip-delete"
									onClick={(e) => { e.stopPropagation(); setConfirmingDelete(t.tripId); }}
									title="Delete trip"
								>
									✕
								</button>
							</li>
						))}
					</ul>
				)}
				<button className="side-panel-logout" onClick={onLogout}>
					Log out
				</button>
			</div>

			{confirmingDelete && (
				<div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmingDelete(null); }}>
					<div className="modal-card">
						<h2 className="modal-title">Delete trip?</h2>
						<p className="modal-text">
							This will remove the trip from your list. Other collaborators will still have access.
						</p>
						<div className="modal-actions">
							<button
								className="add-btn"
								style={{ background: "var(--red)", boxShadow: "none" }}
								onClick={() => { onDeleteTrip(confirmingDelete); setConfirmingDelete(null); }}
							>
								Yes, delete
							</button>
							<button className="add-btn edit-cancel-btn" onClick={() => setConfirmingDelete(null)}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

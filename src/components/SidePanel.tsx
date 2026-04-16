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
}

export function SidePanel({ trips, activeTripId, collapsed, onToggle, onSelectTrip, onGoHome, onLogout }: SidePanelProps) {
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
							<li key={t.tripId}>
								<button
									className={`side-panel-trip-btn ${activeTripId === t.tripId ? "side-panel-trip-btn--active" : ""}`}
									onClick={() => onSelectTrip(t.tripId)}
								>
									<span className="side-panel-trip-name">{t.name || t.tripId}</span>
								</button>
							</li>
						))}
					</ul>
				)}
				<button className="side-panel-logout" onClick={onLogout}>
					Log out
				</button>
			</div>
		</div>
	);
}

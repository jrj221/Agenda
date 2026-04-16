import { useState } from "react";
import "../App.css";

function randomTripId(): string {
	const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
	let out = "";
	for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
	return out;
}

interface TripGateProps {
	onNavigateToTrip: (tripId: string) => void;
}

export function TripGate({ onNavigateToTrip }: TripGateProps) {
	const [joinId, setJoinId] = useState("");

	function createTrip() {
		onNavigateToTrip(randomTripId());
	}

	function joinTrip() {
		const id = joinId.trim().toLowerCase();
		if (id) onNavigateToTrip(id);
	}

	return (
		<div className="card" style={{ maxWidth: 500 }}>
			<div className="card-header">
				<h1 className="card-title">Welcome to Agenda</h1>
				<p className="card-subtitle">Start a new trip or join an existing one with its code.</p>
			</div>
			<button className="create-btn add-btn" onClick={createTrip}>
				Create new trip
			</button>
			<div className="input-group" style={{ marginTop: "20px" }}>
				<div className="input-bar trip-name-bar">
					<input
						className="text-input trip-name-input"
						type="text"
						placeholder="Trip code (e.g. abc12def)"
						value={joinId}
						onChange={(e) => setJoinId(e.target.value)}
						onKeyDown={(e) => { if (e.key === "Enter" && joinId.trim()) joinTrip(); }}
					/>
				</div>
			</div>
			<button
				className="add-btn"
				style={{ width: "100%" }}
				onClick={joinTrip}
				disabled={!joinId.trim()}
			>
				Join trip
			</button>
		</div>
	);
}

import { useState } from "react";
import { getVacationDAO } from "../data";
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
	const [error, setError] = useState<string | null>(null);
	const [joining, setJoining] = useState(false);

	function createTrip() {
		onNavigateToTrip(randomTripId());
	}

	async function joinTrip() {
		const id = joinId.trim().toLowerCase();
		if (!id) return;
		setJoining(true);
		setError(null);
		try {
			const existing = await getVacationDAO().findByCode(id);
			if (!existing) {
				setError("No trip found with that code.");
				return;
			}
			onNavigateToTrip(id);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to look up trip.");
		} finally {
			setJoining(false);
		}
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
						onChange={(e) => { setJoinId(e.target.value); setError(null); }}
						onKeyDown={(e) => { if (e.key === "Enter" && joinId.trim()) void joinTrip(); }}
						disabled={joining}
					/>
				</div>
			</div>
			<button
				className="add-btn"
				style={{ width: "100%" }}
				onClick={() => void joinTrip()}
				disabled={!joinId.trim() || joining}
			>
				{joining ? "Joining…" : "Join trip"}
			</button>
			{error && (
				<p style={{ color: "var(--red)", marginTop: "12px", textAlign: "center" }}>
					{error}
				</p>
			)}
		</div>
	);
}

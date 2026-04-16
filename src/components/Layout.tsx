import { useState, useEffect, useCallback } from "react";
import { SidePanel } from "./SidePanel";
import { TripGate } from "./TripGate";
import Homepage from "./Homepage";
import { HomepagePresenter } from "../presenters/HomepagePresenter";
import { acquireTripDoc, releaseTripDoc, type TripDoc } from "../sync/ydoc";
import { getSavedTrips, saveTrip, removeTrip, type SavedTrip } from "../utils/tripStore";
import { logout, type User } from "../utils/auth";
import "../App.css";

function readTripIdFromHash(): string | null {
	const m = window.location.hash.match(/^#\/trip\/(.+)$/);
	return m ? m[1] : null;
}

interface LayoutProps {
	user: User;
	onLogout: () => void;
}

export function Layout({ user, onLogout }: LayoutProps) {
	const [tripId, setTripId] = useState<string | null>(readTripIdFromHash());
	const [collapsed, setCollapsed] = useState(false);
	const [trips, setTrips] = useState<SavedTrip[]>(() => getSavedTrips(user.email));

	useEffect(() => {
		const onHashChange = () => setTripId(readTripIdFromHash());
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	function navigateToTrip(id: string) {
		window.location.hash = `#/trip/${id}`;
	}

	function goHome() {
		window.location.hash = "#/";
	}

	// When a trip is entered, ensure it's in the saved list
	useEffect(() => {
		if (tripId) {
			const existing = trips.find((t) => t.tripId === tripId);
			if (!existing) {
				saveTrip(user.email, tripId, tripId);
				setTrips(getSavedTrips(user.email));
			}
		}
	}, [tripId]);

	const handleTripNamed = useCallback((name: string) => {
		if (!tripId) return;
		saveTrip(user.email, tripId, name);
		setTrips(getSavedTrips(user.email));
	}, [tripId, user.email]);

	return (
		<div className="app-layout">
			<SidePanel
				trips={trips}
				activeTripId={tripId}
				collapsed={collapsed}
				onToggle={() => setCollapsed(!collapsed)}
				onSelectTrip={navigateToTrip}
				onGoHome={goHome}
				onLogout={() => { logout(); onLogout(); }}
			onDeleteTrip={(id) => {
				removeTrip(user.email, id);
				setTrips(getSavedTrips(user.email));
				if (tripId === id) goHome();
			}}
			/>
			<div className="app-main">
				{!tripId ? (
					<div className="page">
						<main className="main">
							<TripGate onNavigateToTrip={navigateToTrip} />
						</main>
					</div>
				) : (
					<TripViewLoader
						key={tripId}
						tripId={tripId}
						onTripNamed={handleTripNamed}
					/>
				)}
			</div>
		</div>
	);
}

function TripViewLoader({ tripId, onTripNamed }: { tripId: string; onTripNamed: (name: string) => void }) {
	const [doc, setDoc] = useState<TripDoc | null>(null);

	useEffect(() => {
		const d = acquireTripDoc(tripId);
		setDoc(d);
		return () => {
			setDoc(null);
			releaseTripDoc(tripId);
		};
	}, [tripId]);

	if (!doc) return null;
	return (
		<Homepage
			tripId={tripId}
			presenterFactory={(listener) => new HomepagePresenter(listener, doc)}
			onTripNamed={onTripNamed}
		/>
	);
}

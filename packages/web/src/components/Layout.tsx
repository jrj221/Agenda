import { useState, useEffect, useCallback } from "react";
import { SidePanel } from "./SidePanel";
import { TripGate } from "./TripGate";
import Homepage from "./Homepage";
import { HomepagePresenter } from "../presenters/HomepagePresenter";
import { acquireTripDoc, releaseTripDoc, type TripDoc } from "../sync/ydoc";
import { getSavedTrips, saveTrip, removeTrip, type SavedTrip } from "../utils/tripStore";
import { getVacationDAO } from "../data";
import { logout, type User } from "../utils/auth";
import "../App.css";

function readTripIdFromHash(): string | null {
	const m = window.location.hash.match(/^#\/trip\/(.+)$/);
	return m ? m[1] : null;
}

interface LayoutProps {
	user: User;
	onLogout: () => void;
	initialTrips?: SavedTrip[];
}

export function Layout({ user, onLogout, initialTrips }: LayoutProps) {
	const [tripId, setTripId] = useState<string | null>(readTripIdFromHash());
	const [collapsed, setCollapsed] = useState(false);
	const [trips, setTrips] = useState<SavedTrip[]>(initialTrips ?? []);

	const refreshTrips = useCallback(async () => {
		setTrips(await getSavedTrips(user.username));
	}, [user.username]);

	useEffect(() => {
		if (!initialTrips) {
			void refreshTrips();
		}
	}, [initialTrips, refreshTrips]);

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

	// When a trip is entered via URL/share link, add the user to it if it
	// already exists server-side. Brand-new trips (random codes from
	// "Create new trip") are persisted later by handleTripNamed once the
	// user picks a name. Depends only on tripId so refreshTrips()
	// triggered by deletion doesn't re-fire this and re-add the user.
	useEffect(() => {
		if (!tripId) return;
		let cancelled = false;
		void (async () => {
			const existing = await getVacationDAO().findByCode(tripId);
			if (cancelled || !existing) return;
			if (!existing.usernames.includes(user.username)) {
				await getVacationDAO().addUser(tripId, user.username);
				if (!cancelled) await refreshTrips();
			}
		})();
		return () => { cancelled = true; };
	}, [tripId, user.username, refreshTrips]);

	const handleTripNamed = useCallback(async (name: string) => {
		if (!tripId) return;
		await saveTrip(user.username, tripId, name);
		await refreshTrips();
	}, [tripId, user.username, refreshTrips]);

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
				onDeleteTrip={async (id) => {
					await removeTrip(user.username, id);
					await refreshTrips();
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
		let cancelled = false;
		void acquireTripDoc(tripId).then((d) => {
			if (!cancelled) setDoc(d);
		});
		return () => {
			cancelled = true;
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

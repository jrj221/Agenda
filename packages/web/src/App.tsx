import { useEffect, useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { Layout } from "./components/Layout";
import { LoadingScreen } from "./components/LoadingScreen";
import { getSession, type User } from "./utils/auth";
import { getHttpVacationDAO, isHttpBackend } from "./data";
import type { SavedTrip } from "./utils/tripStore";

function App() {
	const [user, setUser] = useState<User | null>(getSession);
	const [trips, setTrips] = useState<SavedTrip[] | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		if (!user) {
			setTrips(null);
			return;
		}
		// Only prefetch for the HTTP backend. LocalStorage is cheap enough to read per-call.
		if (!isHttpBackend()) {
			setTrips([]);
			return;
		}
		const dao = getHttpVacationDAO();
		if (!dao) {
			setTrips([]);
			return;
		}
		let cancelled = false;
		setTrips(null);
		setLoadError(null);
		dao.preload(user.username)
			.then((vacations) => {
				if (cancelled) return;
				setTrips(vacations.map((v) => ({ tripId: v.code, name: v.name })));
			})
			.catch((err) => {
				if (cancelled) return;
				setLoadError(err instanceof Error ? err.message : "Failed to load trips.");
				setTrips([]);
			});
		return () => {
			cancelled = true;
		};
	}, [user]);

	if (!user) return <AuthPage onAuth={setUser} />;
	if (trips === null) return <LoadingScreen />;
	if (loadError) return <LoadingScreen message={`Error: ${loadError}`} />;
	return (
		<Layout
			user={user}
			onLogout={() => {
				getHttpVacationDAO()?.clearCache();
				setUser(null);
			}}
			initialTrips={isHttpBackend() ? trips : undefined}
		/>
	);
}

export default App;

import { useEffect, useState } from "react";
import Homepage from "./components/Homepage";
import { TripGate } from "./components/TripGate";
import { HomepagePresenter } from "./presenters/HomepagePresenter";
import { acquireTripDoc, releaseTripDoc, type TripDoc } from "./sync/ydoc";

function readTripIdFromHash(): string | null {
	const m = window.location.hash.match(/^#\/trip\/(.+)$/);
	return m ? m[1] : null;
}

function App() {
	const [tripId, setTripId] = useState<string | null>(readTripIdFromHash());

	useEffect(() => {
		const onHashChange = () => setTripId(readTripIdFromHash());
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	if (!tripId) return <TripGate />;
	return <TripView key={tripId} tripId={tripId} />;
}

function TripView({ tripId }: { tripId: string }) {
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
		/>
	);
}

export default App;

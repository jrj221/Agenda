export interface SavedTrip {
	tripId: string;
	name: string;
}

function storageKey(email: string): string {
	return `agenda_trips_${email}`;
}

export function getSavedTrips(email: string): SavedTrip[] {
	const raw = localStorage.getItem(storageKey(email));
	return raw ? JSON.parse(raw) : [];
}

function saveTripList(email: string, trips: SavedTrip[]): void {
	localStorage.setItem(storageKey(email), JSON.stringify(trips));
}

export function saveTrip(email: string, tripId: string, name: string): void {
	const trips = getSavedTrips(email);
	const existing = trips.find((t) => t.tripId === tripId);
	if (existing) {
		existing.name = name;
	} else {
		trips.push({ tripId, name });
	}
	saveTripList(email, trips);
}

export function removeTrip(email: string, tripId: string): void {
	const trips = getSavedTrips(email).filter((t) => t.tripId !== tripId);
	saveTripList(email, trips);
}

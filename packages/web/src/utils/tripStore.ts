import { getVacationDAO } from "../data";

export interface SavedTrip {
	tripId: string;
	name: string;
}

export async function getSavedTrips(username: string): Promise<SavedTrip[]> {
	const vacations = await getVacationDAO().findByUser(username);
	return vacations.map((v) => ({ tripId: v.code, name: v.name }));
}

export async function saveTrip(username: string, tripId: string, name: string): Promise<void> {
	const dao = getVacationDAO();
	const existing = await dao.findByCode(tripId);
	if (existing) {
		await dao.update(tripId, { name });
		await dao.addUser(tripId, username);
	} else {
		await dao.create(tripId, name, username);
	}
}

export async function removeTrip(username: string, tripId: string): Promise<void> {
	await getVacationDAO().removeUser(tripId, username);
}

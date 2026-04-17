import type { VacationDTO, VacationUpdatable } from "@agenda/shared";
import type { VacationDAO } from "../../dao/VacationDAO";

const VACATIONS_KEY = "agenda_vacations";

export class LocalStorageVacationDAO implements VacationDAO {
	private load(): VacationDTO[] {
		const raw = localStorage.getItem(VACATIONS_KEY);
		return raw ? JSON.parse(raw) : [];
	}

	private save(vacations: VacationDTO[]): void {
		localStorage.setItem(VACATIONS_KEY, JSON.stringify(vacations));
	}

	async create(code: string, name: string, creatorUsername: string): Promise<VacationDTO> {
		const vacations = this.load();
		const existing = vacations.find((v) => v.code === code);
		if (existing) {
			if (!existing.usernames.includes(creatorUsername)) {
				existing.usernames.push(creatorUsername);
				this.save(vacations);
			}
			return existing;
		}
		const vacation: VacationDTO = {
			code,
			name,
			startDate: "",
			endDate: "",
			usernames: [creatorUsername],
			events: [],
			categories: [],
		};
		vacations.push(vacation);
		this.save(vacations);
		return vacation;
	}

	async findByCode(code: string): Promise<VacationDTO | null> {
		return this.load().find((v) => v.code === code) ?? null;
	}

	async findByUser(username: string): Promise<VacationDTO[]> {
		return this.load().filter((v) => v.usernames.includes(username));
	}

	async update(code: string, data: VacationUpdatable): Promise<VacationDTO | null> {
		const vacations = this.load();
		const vacation = vacations.find((v) => v.code === code);
		if (!vacation) return null;
		if (data.name !== undefined) vacation.name = data.name;
		if (data.startDate !== undefined) vacation.startDate = data.startDate;
		if (data.endDate !== undefined) vacation.endDate = data.endDate;
		if (data.events !== undefined) vacation.events = data.events;
		if (data.categories !== undefined) vacation.categories = data.categories;
		this.save(vacations);
		return vacation;
	}

	async delete(code: string): Promise<boolean> {
		const vacations = this.load();
		const idx = vacations.findIndex((v) => v.code === code);
		if (idx === -1) return false;
		vacations.splice(idx, 1);
		this.save(vacations);
		return true;
	}

	async addUser(code: string, username: string): Promise<boolean> {
		const vacations = this.load();
		const vacation = vacations.find((v) => v.code === code);
		if (!vacation) return false;
		if (vacation.usernames.includes(username)) return true;
		vacation.usernames.push(username);
		this.save(vacations);
		return true;
	}

	async removeUser(code: string, username: string): Promise<boolean> {
		const vacations = this.load();
		const vacation = vacations.find((v) => v.code === code);
		if (!vacation) return false;
		vacation.usernames = vacation.usernames.filter((u) => u !== username);
		this.save(vacations);
		return true;
	}
}

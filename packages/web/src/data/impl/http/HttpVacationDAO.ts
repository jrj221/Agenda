import type { VacationDTO, VacationUpdatable } from "@agenda/shared";
import type { VacationDAO } from "../../dao/VacationDAO";
import { getServerFacade } from "../../../model/net/ServerFacade";
import { getAuthToken } from "../../../utils/auth";

function requireToken(): string {
	const token = getAuthToken();
	if (!token) throw new Error("Not authenticated");
	return token;
}

export class HttpVacationDAO implements VacationDAO {
	private cache = new Map<string, VacationDTO>();
	private fullListLoadedFor: string | null = null;

	clearCache(): void {
		this.cache.clear();
		this.fullListLoadedFor = null;
	}

	async preload(username: string): Promise<VacationDTO[]> {
		const vacations = await getServerFacade().getVacationsForUser(requireToken(), username);
		this.cache.clear();
		for (const v of vacations) this.cache.set(v.code, v);
		this.fullListLoadedFor = username;
		return vacations;
	}

	async create(code: string, name: string, creatorUsername: string): Promise<VacationDTO> {
		const vacation = await getServerFacade().createVacation(requireToken(), code, name, creatorUsername);
		this.cache.set(vacation.code, vacation);
		return vacation;
	}

	async findByCode(code: string): Promise<VacationDTO | null> {
		const cached = this.cache.get(code);
		if (cached) return cached;
		const vacation = await getServerFacade().getVacation(requireToken(), code);
		if (vacation) this.cache.set(code, vacation);
		return vacation;
	}

	async findByUser(username: string): Promise<VacationDTO[]> {
		if (this.fullListLoadedFor === username) {
			return Array.from(this.cache.values()).filter((v) => v.usernames.includes(username));
		}
		return this.preload(username);
	}

	async update(code: string, data: VacationUpdatable): Promise<VacationDTO | null> {
		const vacation = await getServerFacade().updateVacation(requireToken(), code, data);
		if (vacation) this.cache.set(code, vacation);
		return vacation;
	}

	async delete(code: string): Promise<boolean> {
		const ok = await getServerFacade().deleteVacation(requireToken(), code);
		if (ok) this.cache.delete(code);
		return ok;
	}

	async addUser(code: string, username: string): Promise<boolean> {
		const ok = await getServerFacade().addUserToVacation(requireToken(), code, username);
		if (ok) {
			const v = this.cache.get(code);
			if (v && !v.usernames.includes(username)) v.usernames.push(username);
		}
		return ok;
	}

	async removeUser(code: string, username: string): Promise<boolean> {
		const ok = await getServerFacade().removeUserFromVacation(requireToken(), code, username);
		if (ok) {
			const v = this.cache.get(code);
			if (v) v.usernames = v.usernames.filter((u) => u !== username);
		}
		return ok;
	}
}

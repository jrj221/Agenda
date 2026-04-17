import type { VacationDTO, VacationUpdatable } from "@agenda/shared";
import { Service } from "./Service";

export class VacationService extends Service {
	async getVacationsForUser(authToken: string, username: string): Promise<VacationDTO[]> {
		const caller = await this.requireAuth(authToken);
		if (caller !== username) throw new Error("Cannot fetch another user's trips.");
		return this.factory.createVacationDAO().findByUser(username);
	}

	async getVacation(authToken: string, code: string): Promise<VacationDTO | null> {
		const caller = await this.requireAuth(authToken);
		const vacation = await this.factory.createVacationDAO().findByCode(code);
		if (!vacation) return null;
		if (!vacation.usernames.includes(caller)) throw new Error("Not a member of this trip.");
		return vacation;
	}

	async createVacation(
		authToken: string,
		code: string,
		name: string,
		creatorUsername: string,
	): Promise<VacationDTO> {
		const caller = await this.requireAuth(authToken);
		if (caller !== creatorUsername) throw new Error("Creator must match caller.");
		return this.factory.createVacationDAO().create(code, name, creatorUsername);
	}

	async updateVacation(
		authToken: string,
		code: string,
		data: VacationUpdatable,
	): Promise<VacationDTO | null> {
		const caller = await this.requireAuth(authToken);
		const dao = this.factory.createVacationDAO();
		const existing = await dao.findByCode(code);
		if (!existing) return null;
		if (!existing.usernames.includes(caller)) throw new Error("Not a member of this trip.");
		return dao.update(code, data);
	}

	async deleteVacation(authToken: string, code: string): Promise<boolean> {
		const caller = await this.requireAuth(authToken);
		const dao = this.factory.createVacationDAO();
		const existing = await dao.findByCode(code);
		if (!existing) return false;
		if (!existing.usernames.includes(caller)) throw new Error("Not a member of this trip.");
		return dao.delete(code);
	}

	async addUser(authToken: string, code: string, username: string): Promise<boolean> {
		const caller = await this.requireAuth(authToken);
		const dao = this.factory.createVacationDAO();
		const existing = await dao.findByCode(code);
		if (!existing) return false;
		if (!existing.usernames.includes(caller)) throw new Error("Not a member of this trip.");
		return dao.addUser(code, username);
	}

	async removeUser(authToken: string, code: string, username: string): Promise<boolean> {
		const caller = await this.requireAuth(authToken);
		const dao = this.factory.createVacationDAO();
		const existing = await dao.findByCode(code);
		if (!existing) return false;
		if (!existing.usernames.includes(caller)) throw new Error("Not a member of this trip.");
		return dao.removeUser(code, username);
	}
}

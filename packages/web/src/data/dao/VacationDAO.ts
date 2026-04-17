import type { VacationDTO, VacationUpdatable } from "@agenda/shared";

export type { VacationUpdatable };

export interface VacationDAO {
	create(code: string, name: string, creatorUsername: string): Promise<VacationDTO>;
	findByCode(code: string): Promise<VacationDTO | null>;
	findByUser(username: string): Promise<VacationDTO[]>;
	update(code: string, data: VacationUpdatable): Promise<VacationDTO | null>;
	delete(code: string): Promise<boolean>;
	addUser(code: string, username: string): Promise<boolean>;
	removeUser(code: string, username: string): Promise<boolean>;
}

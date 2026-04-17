import type { UserDTO, VacationDTO, VacationUpdatable } from "@agenda/shared";

export interface UserDAO {
	create(username: string, hashedPassword: string): Promise<UserDTO | null>;
	findByUsername(username: string): Promise<UserDTO | null>;
	updatePassword(username: string, newHashedPassword: string): Promise<boolean>;
	delete(username: string): Promise<boolean>;
}

export interface VacationDAO {
	create(code: string, name: string, creatorUsername: string): Promise<VacationDTO>;
	findByCode(code: string): Promise<VacationDTO | null>;
	findByUser(username: string): Promise<VacationDTO[]>;
	update(code: string, data: VacationUpdatable): Promise<VacationDTO | null>;
	delete(code: string): Promise<boolean>;
	addUser(code: string, username: string): Promise<boolean>;
	removeUser(code: string, username: string): Promise<boolean>;
}

export interface AuthTokenDAO {
	create(username: string): Promise<string>;
	validate(token: string): Promise<string | null>;
	delete(token: string): Promise<boolean>;
}

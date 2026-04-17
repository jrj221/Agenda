import type { UserDTO } from "@agenda/shared";

export interface UserDAO {
	create(username: string, password: string): Promise<UserDTO | string>;
	authenticate(username: string, password: string): Promise<UserDTO | null>;
	findByUsername(username: string): Promise<UserDTO | null>;
	updatePassword(username: string, newPassword: string): Promise<boolean>;
	delete(username: string): Promise<boolean>;
}

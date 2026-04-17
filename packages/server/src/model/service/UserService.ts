import { createHash } from "node:crypto";
import type { UserDTO } from "@agenda/shared";
import { Service } from "./Service";

function hashPassword(password: string): string {
	// Placeholder hash — swap for bcrypt/argon2 before going to production.
	return createHash("sha256").update(password).digest("hex");
}

export interface AuthResult {
	user: UserDTO;
	authToken: string;
}

export class UserService extends Service {
	async register(username: string, password: string): Promise<AuthResult> {
		if (!username || !password) throw new Error("Username and password are required.");
		const userDAO = this.factory.createUserDAO();
		const created = await userDAO.create(username, hashPassword(password));
		if (!created) throw new Error("An account with this username already exists.");
		const authToken = await this.factory.createAuthTokenDAO().create(username);
		return { user: created, authToken };
	}

	async login(username: string, password: string): Promise<AuthResult> {
		const userDAO = this.factory.createUserDAO();
		const user = await userDAO.findByUsername(username);
		if (!user || user.hashedPassword !== hashPassword(password)) {
			throw new Error("Invalid username or password.");
		}
		const authToken = await this.factory.createAuthTokenDAO().create(username);
		return { user, authToken };
	}

	async logout(authToken: string): Promise<void> {
		await this.factory.createAuthTokenDAO().delete(authToken);
	}
}

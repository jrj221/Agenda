import type { UserDTO } from "@agenda/shared";
import type { UserDAO } from "../../dao/UserDAO";

const USERS_KEY = "agenda_users";

function hashPassword(password: string): string {
	// Placeholder hash — swap for bcrypt/argon2 when wired to a real backend.
	let hash = 0;
	for (let i = 0; i < password.length; i++) {
		hash = ((hash << 5) - hash + password.charCodeAt(i)) | 0;
	}
	return hash.toString(36);
}

export class LocalStorageUserDAO implements UserDAO {
	private load(): UserDTO[] {
		const raw = localStorage.getItem(USERS_KEY);
		return raw ? JSON.parse(raw) : [];
	}

	private save(users: UserDTO[]): void {
		localStorage.setItem(USERS_KEY, JSON.stringify(users));
	}

	async create(username: string, password: string): Promise<UserDTO | string> {
		const users = this.load();
		if (users.find((u) => u.username === username)) {
			return "An account with this username already exists.";
		}
		const user: UserDTO = { username, hashedPassword: hashPassword(password) };
		users.push(user);
		this.save(users);
		return user;
	}

	async authenticate(username: string, password: string): Promise<UserDTO | null> {
		const users = this.load();
		const hashed = hashPassword(password);
		return users.find((u) => u.username === username && u.hashedPassword === hashed) ?? null;
	}

	async findByUsername(username: string): Promise<UserDTO | null> {
		return this.load().find((u) => u.username === username) ?? null;
	}

	async updatePassword(username: string, newPassword: string): Promise<boolean> {
		const users = this.load();
		const user = users.find((u) => u.username === username);
		if (!user) return false;
		user.hashedPassword = hashPassword(newPassword);
		this.save(users);
		return true;
	}

	async delete(username: string): Promise<boolean> {
		const users = this.load();
		const idx = users.findIndex((u) => u.username === username);
		if (idx === -1) return false;
		users.splice(idx, 1);
		this.save(users);
		return true;
	}
}

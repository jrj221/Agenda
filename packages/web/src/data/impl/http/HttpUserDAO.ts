import type { UserDTO } from "@agenda/shared";
import type { UserDAO } from "../../dao/UserDAO";
import { getServerFacade } from "../../../model/net/ServerFacade";
import { setAuthToken } from "../../../utils/auth";

export class HttpUserDAO implements UserDAO {
	async create(username: string, password: string): Promise<UserDTO | string> {
		try {
			const { user, authToken } = await getServerFacade().register(username, password);
			setAuthToken(authToken);
			return user;
		} catch (err) {
			return err instanceof Error ? err.message : "Registration failed.";
		}
	}

	async authenticate(username: string, password: string): Promise<UserDTO | null> {
		try {
			const { user, authToken } = await getServerFacade().login(username, password);
			setAuthToken(authToken);
			return user;
		} catch {
			return null;
		}
	}

	async findByUsername(_username: string): Promise<UserDTO | null> {
		// Server-side concern; not exposed to the client in this app.
		return null;
	}

	async updatePassword(_username: string, _newPassword: string): Promise<boolean> {
		throw new Error("updatePassword is not implemented over HTTP");
	}

	async delete(_username: string): Promise<boolean> {
		throw new Error("delete is not implemented over HTTP");
	}
}

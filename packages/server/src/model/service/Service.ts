import type { DAOFactory } from "../../dao/DAOFactory";

export abstract class Service {
	constructor(protected readonly factory: DAOFactory) {}

	protected async requireAuth(authToken: string | null): Promise<string> {
		if (!authToken) throw new Error("Missing auth token");
		const username = await this.factory.createAuthTokenDAO().validate(authToken);
		if (!username) throw new Error("Invalid or expired auth token");
		return username;
	}
}

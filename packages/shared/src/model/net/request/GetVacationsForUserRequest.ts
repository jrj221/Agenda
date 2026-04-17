import { AgendaRequest } from "./AgendaRequest";

export class GetVacationsForUserRequest extends AgendaRequest {
	constructor(authToken: string, public username: string) {
		super(authToken);
	}
}

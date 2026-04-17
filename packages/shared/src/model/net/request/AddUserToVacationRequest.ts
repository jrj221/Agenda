import { AgendaRequest } from "./AgendaRequest";

export class AddUserToVacationRequest extends AgendaRequest {
	constructor(authToken: string, public code: string, public username: string) {
		super(authToken);
	}
}

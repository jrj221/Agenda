import { AgendaRequest } from "./AgendaRequest";

export class RemoveUserFromVacationRequest extends AgendaRequest {
	constructor(authToken: string, public code: string, public username: string) {
		super(authToken);
	}
}

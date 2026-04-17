import { AgendaRequest } from "./AgendaRequest";

export class LogoutRequest extends AgendaRequest {
	constructor(authToken: string) {
		super(authToken);
	}
}

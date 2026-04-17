import { AgendaRequest } from "./AgendaRequest";

export class LoginRequest extends AgendaRequest {
	constructor(public username: string, public password: string) {
		super();
	}
}

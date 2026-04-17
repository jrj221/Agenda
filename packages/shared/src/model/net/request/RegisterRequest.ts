import { AgendaRequest } from "./AgendaRequest";

export class RegisterRequest extends AgendaRequest {
	constructor(public username: string, public password: string) {
		super();
	}
}

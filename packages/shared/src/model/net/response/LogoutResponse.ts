import { AgendaResponse } from "./AgendaResponse";

export class LogoutResponse extends AgendaResponse {
	constructor(success: boolean, message: string | null) {
		super(success, message);
	}
}

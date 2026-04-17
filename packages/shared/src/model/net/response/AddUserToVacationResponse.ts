import { AgendaResponse } from "./AgendaResponse";

export class AddUserToVacationResponse extends AgendaResponse {
	constructor(success: boolean, message: string | null) {
		super(success, message);
	}
}

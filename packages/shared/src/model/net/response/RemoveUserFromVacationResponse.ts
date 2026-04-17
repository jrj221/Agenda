import { AgendaResponse } from "./AgendaResponse";

export class RemoveUserFromVacationResponse extends AgendaResponse {
	constructor(success: boolean, message: string | null) {
		super(success, message);
	}
}

import { AgendaResponse } from "./AgendaResponse";

export class DeleteVacationResponse extends AgendaResponse {
	constructor(success: boolean, message: string | null) {
		super(success, message);
	}
}

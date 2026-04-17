import { AgendaRequest } from "./AgendaRequest";

export class DeleteVacationRequest extends AgendaRequest {
	constructor(authToken: string, public code: string) {
		super(authToken);
	}
}

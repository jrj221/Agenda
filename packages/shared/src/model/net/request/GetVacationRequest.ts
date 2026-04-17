import { AgendaRequest } from "./AgendaRequest";

export class GetVacationRequest extends AgendaRequest {
	constructor(authToken: string, public code: string) {
		super(authToken);
	}
}

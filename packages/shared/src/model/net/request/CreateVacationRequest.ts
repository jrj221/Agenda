import { AgendaRequest } from "./AgendaRequest";

export class CreateVacationRequest extends AgendaRequest {
	constructor(
		authToken: string,
		public code: string,
		public name: string,
		public creatorUsername: string,
	) {
		super(authToken);
	}
}

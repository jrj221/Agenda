import { AgendaResponse } from "./AgendaResponse";
import type { VacationDTO } from "../../dto/VacationDTO";

export class GetVacationsForUserResponse extends AgendaResponse {
	constructor(
		success: boolean,
		message: string | null,
		public vacations: VacationDTO[],
	) {
		super(success, message);
	}
}

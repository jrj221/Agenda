import { AgendaResponse } from "./AgendaResponse";
import type { VacationDTO } from "../../dto/VacationDTO";

export class UpdateVacationResponse extends AgendaResponse {
	constructor(
		success: boolean,
		message: string | null,
		public vacation: VacationDTO | null,
	) {
		super(success, message);
	}
}

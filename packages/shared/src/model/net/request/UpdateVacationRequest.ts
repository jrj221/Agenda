import { AgendaRequest } from "./AgendaRequest";
import type { EventDTO } from "../../dto/EventDTO";
import type { CategoryDTO } from "../../dto/CategoryDTO";

export interface VacationUpdatable {
	name?: string;
	startDate?: string;
	endDate?: string;
	events?: EventDTO[];
	categories?: CategoryDTO[];
}

export class UpdateVacationRequest extends AgendaRequest {
	constructor(authToken: string, public code: string, public data: VacationUpdatable) {
		super(authToken);
	}
}

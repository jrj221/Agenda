import type { EventDTO } from "./EventDTO";
import type { CategoryDTO } from "./CategoryDTO";

export interface VacationDTO {
	code: string;
	name: string;
	startDate: string;
	endDate: string;
	usernames: string[];
	events: EventDTO[];
	categories: CategoryDTO[];
}

export interface EventDTO {
	id: number;
	name: string;
	day: string;
	startTime: string;
	endTime: string;
	categoryId?: number;
	notes?: string;
	location?: string;
}

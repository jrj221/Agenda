export abstract class AgendaResponse {
	constructor(public success: boolean, public message: string | null = null) {}
}

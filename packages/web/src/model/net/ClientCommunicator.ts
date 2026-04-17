import type { AgendaRequest, AgendaResponse } from "@agenda/shared";

const SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export class ClientCommunicator {
	async doPost<REQ extends AgendaRequest, RES extends AgendaResponse>(
		req: REQ,
		endpoint: string,
	): Promise<RES> {
		const url = `${SERVER_URL}${endpoint}`;
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(req),
		});
		if (!res.ok) {
			throw new Error(`Request to ${endpoint} failed with ${res.status}`);
		}
		const response = (await res.json()) as RES;
		if (!response.success) {
			throw new Error(response.message ?? `Request to ${endpoint} failed`);
		}
		return response;
	}
}

import { AgendaResponse } from "./AgendaResponse";
import type { UserDTO } from "../../dto/UserDTO";

export class RegisterResponse extends AgendaResponse {
	constructor(
		success: boolean,
		message: string | null,
		public user: UserDTO | null,
		public authToken: string | null,
	) {
		super(success, message);
	}
}

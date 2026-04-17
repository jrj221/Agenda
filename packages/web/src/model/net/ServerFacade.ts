import {
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	RegisterResponse,
	LogoutRequest,
	LogoutResponse,
	GetVacationsForUserRequest,
	GetVacationsForUserResponse,
	GetVacationRequest,
	GetVacationResponse,
	CreateVacationRequest,
	CreateVacationResponse,
	UpdateVacationRequest,
	UpdateVacationResponse,
	DeleteVacationRequest,
	DeleteVacationResponse,
	AddUserToVacationRequest,
	AddUserToVacationResponse,
	RemoveUserFromVacationRequest,
	RemoveUserFromVacationResponse,
	type UserDTO,
	type VacationDTO,
	type VacationUpdatable,
} from "@agenda/shared";
import { ClientCommunicator } from "./ClientCommunicator";

export interface LoginResult {
	user: UserDTO;
	authToken: string;
}

export class ServerFacade {
	private readonly client = new ClientCommunicator();

	async login(username: string, password: string): Promise<LoginResult> {
		const res = await this.client.doPost<LoginRequest, LoginResponse>(
			new LoginRequest(username, password),
			"/user/login",
		);
		if (!res.user || !res.authToken) throw new Error("Login response missing user or token");
		return { user: res.user, authToken: res.authToken };
	}

	async register(username: string, password: string): Promise<LoginResult> {
		const res = await this.client.doPost<RegisterRequest, RegisterResponse>(
			new RegisterRequest(username, password),
			"/user/register",
		);
		if (!res.user || !res.authToken) throw new Error("Register response missing user or token");
		return { user: res.user, authToken: res.authToken };
	}

	async logout(authToken: string): Promise<void> {
		await this.client.doPost<LogoutRequest, LogoutResponse>(
			new LogoutRequest(authToken),
			"/user/logout",
		);
	}

	async getVacationsForUser(authToken: string, username: string): Promise<VacationDTO[]> {
		const res = await this.client.doPost<GetVacationsForUserRequest, GetVacationsForUserResponse>(
			new GetVacationsForUserRequest(authToken, username),
			"/vacation/getForUser",
		);
		return res.vacations;
	}

	async getVacation(authToken: string, code: string): Promise<VacationDTO | null> {
		const res = await this.client.doPost<GetVacationRequest, GetVacationResponse>(
			new GetVacationRequest(authToken, code),
			"/vacation/get",
		);
		return res.vacation;
	}

	async createVacation(
		authToken: string,
		code: string,
		name: string,
		creatorUsername: string,
	): Promise<VacationDTO> {
		const res = await this.client.doPost<CreateVacationRequest, CreateVacationResponse>(
			new CreateVacationRequest(authToken, code, name, creatorUsername),
			"/vacation/create",
		);
		if (!res.vacation) throw new Error("Create vacation returned no vacation");
		return res.vacation;
	}

	async updateVacation(
		authToken: string,
		code: string,
		data: VacationUpdatable,
	): Promise<VacationDTO | null> {
		const res = await this.client.doPost<UpdateVacationRequest, UpdateVacationResponse>(
			new UpdateVacationRequest(authToken, code, data),
			"/vacation/update",
		);
		return res.vacation;
	}

	async deleteVacation(authToken: string, code: string): Promise<boolean> {
		const res = await this.client.doPost<DeleteVacationRequest, DeleteVacationResponse>(
			new DeleteVacationRequest(authToken, code),
			"/vacation/delete",
		);
		return res.success;
	}

	async addUserToVacation(authToken: string, code: string, username: string): Promise<boolean> {
		const res = await this.client.doPost<AddUserToVacationRequest, AddUserToVacationResponse>(
			new AddUserToVacationRequest(authToken, code, username),
			"/vacation/addUser",
		);
		return res.success;
	}

	async removeUserFromVacation(authToken: string, code: string, username: string): Promise<boolean> {
		const res = await this.client.doPost<RemoveUserFromVacationRequest, RemoveUserFromVacationResponse>(
			new RemoveUserFromVacationRequest(authToken, code, username),
			"/vacation/removeUser",
		);
		return res.success;
	}
}

let instance: ServerFacade | null = null;
export function getServerFacade(): ServerFacade {
	if (!instance) instance = new ServerFacade();
	return instance;
}

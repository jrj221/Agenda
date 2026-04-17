import type { DAOFactory } from "./DAOFactory";
import type { UserDAO } from "./dao/UserDAO";
import type { VacationDAO } from "./dao/VacationDAO";
import { LocalStorageDAOFactory } from "./impl/localstorage/LocalStorageDAOFactory";
import { HttpDAOFactory } from "./impl/http/HttpDAOFactory";
import { HttpVacationDAO } from "./impl/http/HttpVacationDAO";

const backend = import.meta.env.VITE_BACKEND ?? "localstorage";

const factory: DAOFactory = backend === "http"
	? new HttpDAOFactory()
	: new LocalStorageDAOFactory();

let userDAO: UserDAO | null = null;
let vacationDAO: VacationDAO | null = null;

export function getUserDAO(): UserDAO {
	if (!userDAO) userDAO = factory.createUserDAO();
	return userDAO;
}

export function getVacationDAO(): VacationDAO {
	if (!vacationDAO) vacationDAO = factory.createVacationDAO();
	return vacationDAO;
}

export function isHttpBackend(): boolean {
	return backend === "http";
}

export function getHttpVacationDAO(): HttpVacationDAO | null {
	const dao = getVacationDAO();
	return dao instanceof HttpVacationDAO ? dao : null;
}

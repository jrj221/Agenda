import type { UserDAO, VacationDAO, AuthTokenDAO } from "./DAO";

export interface DAOFactory {
	createUserDAO(): UserDAO;
	createVacationDAO(): VacationDAO;
	createAuthTokenDAO(): AuthTokenDAO;
}

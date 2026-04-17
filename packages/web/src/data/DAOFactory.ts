import type { UserDAO } from "./dao/UserDAO";
import type { VacationDAO } from "./dao/VacationDAO";

export interface DAOFactory {
	createUserDAO(): UserDAO;
	createVacationDAO(): VacationDAO;
}

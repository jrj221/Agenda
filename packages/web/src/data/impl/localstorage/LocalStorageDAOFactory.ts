import type { DAOFactory } from "../../DAOFactory";
import type { UserDAO } from "../../dao/UserDAO";
import type { VacationDAO } from "../../dao/VacationDAO";
import { LocalStorageUserDAO } from "./LocalStorageUserDAO";
import { LocalStorageVacationDAO } from "./LocalStorageVacationDAO";

export class LocalStorageDAOFactory implements DAOFactory {
	createUserDAO(): UserDAO {
		return new LocalStorageUserDAO();
	}

	createVacationDAO(): VacationDAO {
		return new LocalStorageVacationDAO();
	}
}

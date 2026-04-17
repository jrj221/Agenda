import type { DAOFactory } from "../../DAOFactory";
import type { UserDAO } from "../../dao/UserDAO";
import type { VacationDAO } from "../../dao/VacationDAO";
import { HttpUserDAO } from "./HttpUserDAO";
import { HttpVacationDAO } from "./HttpVacationDAO";

export class HttpDAOFactory implements DAOFactory {
	private readonly userDAO = new HttpUserDAO();
	private readonly vacationDAO = new HttpVacationDAO();

	createUserDAO(): UserDAO {
		return this.userDAO;
	}

	createVacationDAO(): VacationDAO {
		return this.vacationDAO;
	}
}

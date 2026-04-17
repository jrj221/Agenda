import type { DAOFactory } from "../DAOFactory";
import type { UserDAO, VacationDAO, AuthTokenDAO } from "../DAO";
import { DynamoDBUserDAO } from "./DynamoDBUserDAO";
import { DynamoDBVacationDAO } from "./DynamoDBVacationDAO";
import { DynamoDBAuthTokenDAO } from "./DynamoDBAuthTokenDAO";

export class DynamoDBFactory implements DAOFactory {
	createUserDAO(): UserDAO {
		return new DynamoDBUserDAO();
	}

	createVacationDAO(): VacationDAO {
		return new DynamoDBVacationDAO();
	}

	createAuthTokenDAO(): AuthTokenDAO {
		return new DynamoDBAuthTokenDAO();
	}
}

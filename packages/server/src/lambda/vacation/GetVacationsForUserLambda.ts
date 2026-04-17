import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetVacationsForUserRequest, GetVacationsForUserResponse } from "@agenda/shared";
import { VacationService } from "../../model/service/VacationService";
import { DynamoDBFactory } from "../../dao/dynamodb/DynamoDBFactory";
import { ok, parseBody, failure } from "../lambdaHelpers";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const req = parseBody<GetVacationsForUserRequest>(event);
		const vacations = await new VacationService(new DynamoDBFactory()).getVacationsForUser(
			req.authToken!,
			req.username,
		);
		return ok(new GetVacationsForUserResponse(true, null, vacations));
	} catch (err) {
		return failure((success, message) => new GetVacationsForUserResponse(success, message, []), err);
	}
};

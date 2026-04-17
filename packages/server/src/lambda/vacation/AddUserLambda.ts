import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AddUserToVacationRequest, AddUserToVacationResponse } from "@agenda/shared";
import { VacationService } from "../../model/service/VacationService";
import { DynamoDBFactory } from "../../dao/dynamodb/DynamoDBFactory";
import { ok, parseBody, failure } from "../lambdaHelpers";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const req = parseBody<AddUserToVacationRequest>(event);
		const added = await new VacationService(new DynamoDBFactory()).addUser(
			req.authToken!,
			req.code,
			req.username,
		);
		return ok(new AddUserToVacationResponse(added, added ? null : "Vacation not found."));
	} catch (err) {
		return failure((success, message) => new AddUserToVacationResponse(success, message), err);
	}
};

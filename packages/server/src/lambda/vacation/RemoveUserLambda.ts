import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RemoveUserFromVacationRequest, RemoveUserFromVacationResponse } from "@agenda/shared";
import { VacationService } from "../../model/service/VacationService";
import { DynamoDBFactory } from "../../dao/dynamodb/DynamoDBFactory";
import { ok, parseBody, failure } from "../lambdaHelpers";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const req = parseBody<RemoveUserFromVacationRequest>(event);
		const removed = await new VacationService(new DynamoDBFactory()).removeUser(
			req.authToken!,
			req.code,
			req.username,
		);
		return ok(new RemoveUserFromVacationResponse(removed, removed ? null : "Vacation not found."));
	} catch (err) {
		return failure((success, message) => new RemoveUserFromVacationResponse(success, message), err);
	}
};

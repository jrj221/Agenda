import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CreateVacationRequest, CreateVacationResponse } from "@agenda/shared";
import { VacationService } from "../../model/service/VacationService";
import { DynamoDBFactory } from "../../dao/dynamodb/DynamoDBFactory";
import { ok, parseBody, failure } from "../lambdaHelpers";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const req = parseBody<CreateVacationRequest>(event);
		const vacation = await new VacationService(new DynamoDBFactory()).createVacation(
			req.authToken!,
			req.code,
			req.name,
			req.creatorUsername,
		);
		return ok(new CreateVacationResponse(true, null, vacation));
	} catch (err) {
		return failure((success, message) => new CreateVacationResponse(success, message, null), err);
	}
};

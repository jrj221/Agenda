import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetVacationRequest, GetVacationResponse } from "@agenda/shared";
import { VacationService } from "../../model/service/VacationService";
import { DynamoDBFactory } from "../../dao/dynamodb/DynamoDBFactory";
import { ok, parseBody, failure } from "../lambdaHelpers";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const req = parseBody<GetVacationRequest>(event);
		const vacation = await new VacationService(new DynamoDBFactory()).getVacation(req.authToken!, req.code);
		return ok(new GetVacationResponse(true, null, vacation));
	} catch (err) {
		return failure((success, message) => new GetVacationResponse(success, message, null), err);
	}
};

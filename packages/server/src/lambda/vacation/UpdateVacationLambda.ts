import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UpdateVacationRequest, UpdateVacationResponse } from "@agenda/shared";
import { VacationService } from "../../model/service/VacationService";
import { DynamoDBFactory } from "../../dao/dynamodb/DynamoDBFactory";
import { ok, parseBody, failure } from "../lambdaHelpers";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const req = parseBody<UpdateVacationRequest>(event);
		const vacation = await new VacationService(new DynamoDBFactory()).updateVacation(
			req.authToken!,
			req.code,
			req.data,
		);
		return ok(new UpdateVacationResponse(true, null, vacation));
	} catch (err) {
		return failure((success, message) => new UpdateVacationResponse(success, message, null), err);
	}
};

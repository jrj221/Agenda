import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DeleteVacationRequest, DeleteVacationResponse } from "@agenda/shared";
import { VacationService } from "../../model/service/VacationService";
import { DynamoDBFactory } from "../../dao/dynamodb/DynamoDBFactory";
import { ok, parseBody, failure } from "../lambdaHelpers";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const req = parseBody<DeleteVacationRequest>(event);
		const ok_ = await new VacationService(new DynamoDBFactory()).deleteVacation(req.authToken!, req.code);
		return ok(new DeleteVacationResponse(ok_, ok_ ? null : "Vacation not found."));
	} catch (err) {
		return failure((success, message) => new DeleteVacationResponse(success, message), err);
	}
};

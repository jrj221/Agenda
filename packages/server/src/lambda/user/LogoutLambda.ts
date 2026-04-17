import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LogoutRequest, LogoutResponse } from "@agenda/shared";
import { UserService } from "../../model/service/UserService";
import { DynamoDBFactory } from "../../dao/dynamodb/DynamoDBFactory";
import { ok, parseBody, failure } from "../lambdaHelpers";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const req = parseBody<LogoutRequest>(event);
		if (!req.authToken) throw new Error("Missing auth token");
		await new UserService(new DynamoDBFactory()).logout(req.authToken);
		return ok(new LogoutResponse(true, null));
	} catch (err) {
		return failure((success, message) => new LogoutResponse(success, message), err);
	}
};

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LoginRequest, LoginResponse } from "@agenda/shared";
import { UserService } from "../../model/service/UserService";
import { DynamoDBFactory } from "../../dao/dynamodb/DynamoDBFactory";
import { ok, parseBody, failure } from "../lambdaHelpers";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const req = parseBody<LoginRequest>(event);
		const { user, authToken } = await new UserService(new DynamoDBFactory()).login(req.username, req.password);
		return ok(new LoginResponse(true, null, user, authToken));
	} catch (err) {
		return failure((success, message) => new LoginResponse(success, message, null, null), err);
	}
};

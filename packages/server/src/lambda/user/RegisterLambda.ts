import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { RegisterRequest, RegisterResponse } from "@agenda/shared";
import { UserService } from "../../model/service/UserService";
import { DynamoDBFactory } from "../../dao/dynamodb/DynamoDBFactory";
import { ok, parseBody, failure } from "../lambdaHelpers";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
	try {
		const req = parseBody<RegisterRequest>(event);
		const { user, authToken } = await new UserService(new DynamoDBFactory()).register(req.username, req.password);
		return ok(new RegisterResponse(true, null, user, authToken));
	} catch (err) {
		return failure((success, message) => new RegisterResponse(success, message, null, null), err);
	}
};

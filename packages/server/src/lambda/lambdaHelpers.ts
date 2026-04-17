import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { AgendaResponse } from "@agenda/shared";

const CORS_HEADERS = {
	"Content-Type": "application/json",
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export function ok(body: AgendaResponse): APIGatewayProxyResult {
	return {
		statusCode: 200,
		headers: CORS_HEADERS,
		body: JSON.stringify(body),
	};
}

export function parseBody<T>(event: APIGatewayProxyEvent): T {
	if (!event.body) throw new Error("Request body is empty");
	return JSON.parse(event.body) as T;
}

export function failure<R extends AgendaResponse>(
	build: (success: boolean, message: string | null) => R,
	err: unknown,
): APIGatewayProxyResult {
	const message = err instanceof Error ? err.message : "Internal error";
	return {
		statusCode: 200,
		headers: CORS_HEADERS,
		body: JSON.stringify(build(false, message)),
	};
}

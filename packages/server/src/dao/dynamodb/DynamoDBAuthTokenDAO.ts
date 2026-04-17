import { randomBytes } from "node:crypto";
import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { AuthTokenDAO } from "../DAO";
import { DynamoDBDAO } from "./DynamoDBDAO";

const TABLE = process.env.AUTH_TOKENS_TABLE ?? "AuthTokens";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export class DynamoDBAuthTokenDAO extends DynamoDBDAO implements AuthTokenDAO {
	async create(username: string): Promise<string> {
		const token = randomBytes(32).toString("hex");
		const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
		await this.client.send(new PutCommand({
			TableName: TABLE,
			Item: { token, username, expiresAt },
		}));
		return token;
	}

	async validate(token: string): Promise<string | null> {
		const res = await this.client.send(new GetCommand({
			TableName: TABLE,
			Key: { token },
		}));
		if (!res.Item) return null;
		const expiresAt = res.Item.expiresAt as number | undefined;
		if (expiresAt && expiresAt < Math.floor(Date.now() / 1000)) return null;
		return res.Item.username as string;
	}

	async delete(token: string): Promise<boolean> {
		const res = await this.client.send(new DeleteCommand({
			TableName: TABLE,
			Key: { token },
			ReturnValues: "ALL_OLD",
		}));
		return res.Attributes !== undefined;
	}
}

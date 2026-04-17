import { GetCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import type { UserDTO } from "@agenda/shared";
import type { UserDAO } from "../DAO";
import { DynamoDBDAO } from "./DynamoDBDAO";

const TABLE = process.env.USERS_TABLE ?? "Users";

export class DynamoDBUserDAO extends DynamoDBDAO implements UserDAO {
	async create(username: string, hashedPassword: string): Promise<UserDTO | null> {
		try {
			await this.client.send(new PutCommand({
				TableName: TABLE,
				Item: { username, hashedPassword },
				ConditionExpression: "attribute_not_exists(username)",
			}));
			return { username, hashedPassword };
		} catch (err: unknown) {
			const name = (err as { name?: string }).name;
			if (name === "ConditionalCheckFailedException") return null;
			throw err;
		}
	}

	async findByUsername(username: string): Promise<UserDTO | null> {
		const res = await this.client.send(new GetCommand({
			TableName: TABLE,
			Key: { username },
		}));
		if (!res.Item) return null;
		return { username: res.Item.username, hashedPassword: res.Item.hashedPassword };
	}

	async updatePassword(username: string, newHashedPassword: string): Promise<boolean> {
		try {
			await this.client.send(new UpdateCommand({
				TableName: TABLE,
				Key: { username },
				UpdateExpression: "SET hashedPassword = :p",
				ExpressionAttributeValues: { ":p": newHashedPassword },
				ConditionExpression: "attribute_exists(username)",
			}));
			return true;
		} catch (err: unknown) {
			const name = (err as { name?: string }).name;
			if (name === "ConditionalCheckFailedException") return false;
			throw err;
		}
	}

	async delete(username: string): Promise<boolean> {
		const res = await this.client.send(new DeleteCommand({
			TableName: TABLE,
			Key: { username },
			ReturnValues: "ALL_OLD",
		}));
		return res.Attributes !== undefined;
	}
}

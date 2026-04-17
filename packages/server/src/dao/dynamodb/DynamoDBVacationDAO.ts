import {
	GetCommand,
	PutCommand,
	UpdateCommand,
	DeleteCommand,
	QueryCommand,
	BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";
import type { VacationDTO, VacationUpdatable } from "@agenda/shared";
import type { VacationDAO } from "../DAO";
import { DynamoDBDAO } from "./DynamoDBDAO";

const VACATIONS_TABLE = process.env.VACATIONS_TABLE ?? "Vacations";
const MEMBERSHIP_TABLE = process.env.VACATION_MEMBERSHIP_TABLE ?? "VacationMembership";

function toVacationDTO(item: Record<string, unknown>): VacationDTO {
	return {
		code: item.code as string,
		name: (item.name as string) ?? "",
		startDate: (item.startDate as string) ?? "",
		endDate: (item.endDate as string) ?? "",
		usernames: (item.usernames as string[]) ?? [],
		events: (item.events as VacationDTO["events"]) ?? [],
		categories: (item.categories as VacationDTO["categories"]) ?? [],
	};
}

export class DynamoDBVacationDAO extends DynamoDBDAO implements VacationDAO {
	async create(code: string, name: string, creatorUsername: string): Promise<VacationDTO> {
		const existing = await this.findByCode(code);
		if (existing) {
			if (!existing.usernames.includes(creatorUsername)) {
				await this.addUser(code, creatorUsername);
				existing.usernames.push(creatorUsername);
			}
			return existing;
		}
		const vacation: VacationDTO = {
			code,
			name,
			startDate: "",
			endDate: "",
			usernames: [creatorUsername],
			events: [],
			categories: [],
		};
		await this.client.send(new PutCommand({
			TableName: VACATIONS_TABLE,
			Item: vacation,
		}));
		await this.client.send(new PutCommand({
			TableName: MEMBERSHIP_TABLE,
			Item: { username: creatorUsername, code },
		}));
		return vacation;
	}

	async findByCode(code: string): Promise<VacationDTO | null> {
		const res = await this.client.send(new GetCommand({
			TableName: VACATIONS_TABLE,
			Key: { code },
		}));
		return res.Item ? toVacationDTO(res.Item) : null;
	}

	async findByUser(username: string): Promise<VacationDTO[]> {
		const q = await this.client.send(new QueryCommand({
			TableName: MEMBERSHIP_TABLE,
			KeyConditionExpression: "username = :u",
			ExpressionAttributeValues: { ":u": username },
		}));
		const codes = (q.Items ?? []).map((i) => i.code as string);
		if (codes.length === 0) return [];

		const vacations: VacationDTO[] = [];
		// BatchGetItem max 100 keys per request.
		for (let i = 0; i < codes.length; i += 100) {
			const batch = codes.slice(i, i + 100);
			const res = await this.client.send(new BatchGetCommand({
				RequestItems: {
					[VACATIONS_TABLE]: {
						Keys: batch.map((code) => ({ code })),
					},
				},
			}));
			const items = res.Responses?.[VACATIONS_TABLE] ?? [];
			for (const item of items) vacations.push(toVacationDTO(item));
		}
		return vacations;
	}

	async update(code: string, data: VacationUpdatable): Promise<VacationDTO | null> {
		const sets: string[] = [];
		const names: Record<string, string> = {};
		const values: Record<string, unknown> = {};
		let n = 0;
		for (const [key, value] of Object.entries(data) as [string, unknown][]) {
			if (value === undefined) continue;
			const nameKey = `#n${n}`;
			const valKey = `:v${n}`;
			names[nameKey] = key;
			values[valKey] = value;
			sets.push(`${nameKey} = ${valKey}`);
			n++;
		}
		if (sets.length === 0) return this.findByCode(code);

		const res = await this.client.send(new UpdateCommand({
			TableName: VACATIONS_TABLE,
			Key: { code },
			UpdateExpression: `SET ${sets.join(", ")}`,
			ExpressionAttributeNames: names,
			ExpressionAttributeValues: values,
			ConditionExpression: "attribute_exists(code)",
			ReturnValues: "ALL_NEW",
		}));
		return res.Attributes ? toVacationDTO(res.Attributes) : null;
	}

	async delete(code: string): Promise<boolean> {
		const existing = await this.findByCode(code);
		if (!existing) return false;
		await this.client.send(new DeleteCommand({
			TableName: VACATIONS_TABLE,
			Key: { code },
		}));
		for (const username of existing.usernames) {
			await this.client.send(new DeleteCommand({
				TableName: MEMBERSHIP_TABLE,
				Key: { username, code },
			}));
		}
		return true;
	}

	async addUser(code: string, username: string): Promise<boolean> {
		const existing = await this.findByCode(code);
		if (!existing) return false;
		if (existing.usernames.includes(username)) return true;
		await this.client.send(new UpdateCommand({
			TableName: VACATIONS_TABLE,
			Key: { code },
			UpdateExpression: "SET usernames = list_append(if_not_exists(usernames, :empty), :u)",
			ExpressionAttributeValues: { ":empty": [], ":u": [username] },
		}));
		await this.client.send(new PutCommand({
			TableName: MEMBERSHIP_TABLE,
			Item: { username, code },
		}));
		return true;
	}

	async removeUser(code: string, username: string): Promise<boolean> {
		const existing = await this.findByCode(code);
		if (!existing) return false;
		const next = existing.usernames.filter((u) => u !== username);
		await this.client.send(new UpdateCommand({
			TableName: VACATIONS_TABLE,
			Key: { code },
			UpdateExpression: "SET usernames = :u",
			ExpressionAttributeValues: { ":u": next },
		}));
		await this.client.send(new DeleteCommand({
			TableName: MEMBERSHIP_TABLE,
			Key: { username, code },
		}));
		return true;
	}
}

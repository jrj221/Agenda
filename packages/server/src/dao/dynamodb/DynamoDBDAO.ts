import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION ?? "us-east-1";

let sharedClient: DynamoDBDocumentClient | null = null;

function getClient(): DynamoDBDocumentClient {
	if (!sharedClient) {
		const raw = new DynamoDBClient({ region });
		sharedClient = DynamoDBDocumentClient.from(raw, {
			marshallOptions: { removeUndefinedValues: true },
		});
	}
	return sharedClient;
}

export abstract class DynamoDBDAO {
	protected readonly client: DynamoDBDocumentClient = getClient();
}

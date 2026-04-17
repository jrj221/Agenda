// ../shared/dist/model/net/response/AgendaResponse.js
var AgendaResponse = class {
  success;
  message;
  constructor(success, message = null) {
    this.success = success;
    this.message = message;
  }
};

// ../shared/dist/model/net/response/GetVacationsForUserResponse.js
var GetVacationsForUserResponse = class extends AgendaResponse {
  vacations;
  constructor(success, message, vacations) {
    super(success, message);
    this.vacations = vacations;
  }
};

// src/model/service/Service.ts
var Service = class {
  constructor(factory) {
    this.factory = factory;
  }
  async requireAuth(authToken) {
    if (!authToken) throw new Error("Missing auth token");
    const username = await this.factory.createAuthTokenDAO().validate(authToken);
    if (!username) throw new Error("Invalid or expired auth token");
    return username;
  }
};

// src/model/service/VacationService.ts
var VacationService = class extends Service {
  async getVacationsForUser(authToken, username) {
    const caller = await this.requireAuth(authToken);
    if (caller !== username) throw new Error("Cannot fetch another user's trips.");
    return this.factory.createVacationDAO().findByUser(username);
  }
  async getVacation(authToken, code) {
    const caller = await this.requireAuth(authToken);
    const vacation = await this.factory.createVacationDAO().findByCode(code);
    if (!vacation) return null;
    if (!vacation.usernames.includes(caller)) throw new Error("Not a member of this trip.");
    return vacation;
  }
  async createVacation(authToken, code, name, creatorUsername) {
    const caller = await this.requireAuth(authToken);
    if (caller !== creatorUsername) throw new Error("Creator must match caller.");
    return this.factory.createVacationDAO().create(code, name, creatorUsername);
  }
  async updateVacation(authToken, code, data) {
    const caller = await this.requireAuth(authToken);
    const dao = this.factory.createVacationDAO();
    const existing = await dao.findByCode(code);
    if (!existing) return null;
    if (!existing.usernames.includes(caller)) throw new Error("Not a member of this trip.");
    return dao.update(code, data);
  }
  async deleteVacation(authToken, code) {
    const caller = await this.requireAuth(authToken);
    const dao = this.factory.createVacationDAO();
    const existing = await dao.findByCode(code);
    if (!existing) return false;
    if (!existing.usernames.includes(caller)) throw new Error("Not a member of this trip.");
    return dao.delete(code);
  }
  async addUser(authToken, code, username) {
    const caller = await this.requireAuth(authToken);
    const dao = this.factory.createVacationDAO();
    const existing = await dao.findByCode(code);
    if (!existing) return false;
    if (!existing.usernames.includes(caller)) throw new Error("Not a member of this trip.");
    return dao.addUser(code, username);
  }
  async removeUser(authToken, code, username) {
    const caller = await this.requireAuth(authToken);
    const dao = this.factory.createVacationDAO();
    const existing = await dao.findByCode(code);
    if (!existing) return false;
    if (!existing.usernames.includes(caller)) throw new Error("Not a member of this trip.");
    return dao.removeUser(code, username);
  }
};

// src/dao/dynamodb/DynamoDBUserDAO.ts
import { GetCommand, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// src/dao/dynamodb/DynamoDBDAO.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
var region = process.env.AWS_REGION ?? "us-east-1";
var sharedClient = null;
function getClient() {
  if (!sharedClient) {
    const raw = new DynamoDBClient({ region });
    sharedClient = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true }
    });
  }
  return sharedClient;
}
var DynamoDBDAO = class {
  client = getClient();
};

// src/dao/dynamodb/DynamoDBUserDAO.ts
var TABLE = process.env.USERS_TABLE ?? "Users";
var DynamoDBUserDAO = class extends DynamoDBDAO {
  async create(username, hashedPassword) {
    try {
      await this.client.send(new PutCommand({
        TableName: TABLE,
        Item: { username, hashedPassword },
        ConditionExpression: "attribute_not_exists(username)"
      }));
      return { username, hashedPassword };
    } catch (err) {
      const name = err.name;
      if (name === "ConditionalCheckFailedException") return null;
      throw err;
    }
  }
  async findByUsername(username) {
    const res = await this.client.send(new GetCommand({
      TableName: TABLE,
      Key: { username }
    }));
    if (!res.Item) return null;
    return { username: res.Item.username, hashedPassword: res.Item.hashedPassword };
  }
  async updatePassword(username, newHashedPassword) {
    try {
      await this.client.send(new UpdateCommand({
        TableName: TABLE,
        Key: { username },
        UpdateExpression: "SET hashedPassword = :p",
        ExpressionAttributeValues: { ":p": newHashedPassword },
        ConditionExpression: "attribute_exists(username)"
      }));
      return true;
    } catch (err) {
      const name = err.name;
      if (name === "ConditionalCheckFailedException") return false;
      throw err;
    }
  }
  async delete(username) {
    const res = await this.client.send(new DeleteCommand({
      TableName: TABLE,
      Key: { username },
      ReturnValues: "ALL_OLD"
    }));
    return res.Attributes !== void 0;
  }
};

// src/dao/dynamodb/DynamoDBVacationDAO.ts
import {
  GetCommand as GetCommand2,
  PutCommand as PutCommand2,
  UpdateCommand as UpdateCommand2,
  DeleteCommand as DeleteCommand2,
  QueryCommand,
  BatchGetCommand
} from "@aws-sdk/lib-dynamodb";
var VACATIONS_TABLE = process.env.VACATIONS_TABLE ?? "Vacations";
var MEMBERSHIP_TABLE = process.env.VACATION_MEMBERSHIP_TABLE ?? "VacationMembership";
function toVacationDTO(item) {
  return {
    code: item.code,
    name: item.name ?? "",
    startDate: item.startDate ?? "",
    endDate: item.endDate ?? "",
    usernames: item.usernames ?? [],
    events: item.events ?? [],
    categories: item.categories ?? []
  };
}
var DynamoDBVacationDAO = class extends DynamoDBDAO {
  async create(code, name, creatorUsername) {
    const existing = await this.findByCode(code);
    if (existing) {
      if (!existing.usernames.includes(creatorUsername)) {
        await this.addUser(code, creatorUsername);
        existing.usernames.push(creatorUsername);
      }
      return existing;
    }
    const vacation = {
      code,
      name,
      startDate: "",
      endDate: "",
      usernames: [creatorUsername],
      events: [],
      categories: []
    };
    await this.client.send(new PutCommand2({
      TableName: VACATIONS_TABLE,
      Item: vacation
    }));
    await this.client.send(new PutCommand2({
      TableName: MEMBERSHIP_TABLE,
      Item: { username: creatorUsername, code }
    }));
    return vacation;
  }
  async findByCode(code) {
    const res = await this.client.send(new GetCommand2({
      TableName: VACATIONS_TABLE,
      Key: { code }
    }));
    return res.Item ? toVacationDTO(res.Item) : null;
  }
  async findByUser(username) {
    const q = await this.client.send(new QueryCommand({
      TableName: MEMBERSHIP_TABLE,
      KeyConditionExpression: "username = :u",
      ExpressionAttributeValues: { ":u": username }
    }));
    const codes = (q.Items ?? []).map((i) => i.code);
    if (codes.length === 0) return [];
    const vacations = [];
    for (let i = 0; i < codes.length; i += 100) {
      const batch = codes.slice(i, i + 100);
      const res = await this.client.send(new BatchGetCommand({
        RequestItems: {
          [VACATIONS_TABLE]: {
            Keys: batch.map((code) => ({ code }))
          }
        }
      }));
      const items = res.Responses?.[VACATIONS_TABLE] ?? [];
      for (const item of items) vacations.push(toVacationDTO(item));
    }
    return vacations;
  }
  async update(code, data) {
    const sets = [];
    const names = {};
    const values = {};
    let n = 0;
    for (const [key, value] of Object.entries(data)) {
      if (value === void 0) continue;
      const nameKey = `#n${n}`;
      const valKey = `:v${n}`;
      names[nameKey] = key;
      values[valKey] = value;
      sets.push(`${nameKey} = ${valKey}`);
      n++;
    }
    if (sets.length === 0) return this.findByCode(code);
    const res = await this.client.send(new UpdateCommand2({
      TableName: VACATIONS_TABLE,
      Key: { code },
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(code)",
      ReturnValues: "ALL_NEW"
    }));
    return res.Attributes ? toVacationDTO(res.Attributes) : null;
  }
  async delete(code) {
    const existing = await this.findByCode(code);
    if (!existing) return false;
    await this.client.send(new DeleteCommand2({
      TableName: VACATIONS_TABLE,
      Key: { code }
    }));
    for (const username of existing.usernames) {
      await this.client.send(new DeleteCommand2({
        TableName: MEMBERSHIP_TABLE,
        Key: { username, code }
      }));
    }
    return true;
  }
  async addUser(code, username) {
    const existing = await this.findByCode(code);
    if (!existing) return false;
    if (existing.usernames.includes(username)) return true;
    await this.client.send(new UpdateCommand2({
      TableName: VACATIONS_TABLE,
      Key: { code },
      UpdateExpression: "SET usernames = list_append(if_not_exists(usernames, :empty), :u)",
      ExpressionAttributeValues: { ":empty": [], ":u": [username] }
    }));
    await this.client.send(new PutCommand2({
      TableName: MEMBERSHIP_TABLE,
      Item: { username, code }
    }));
    return true;
  }
  async removeUser(code, username) {
    const existing = await this.findByCode(code);
    if (!existing) return false;
    const next = existing.usernames.filter((u) => u !== username);
    await this.client.send(new UpdateCommand2({
      TableName: VACATIONS_TABLE,
      Key: { code },
      UpdateExpression: "SET usernames = :u",
      ExpressionAttributeValues: { ":u": next }
    }));
    await this.client.send(new DeleteCommand2({
      TableName: MEMBERSHIP_TABLE,
      Key: { username, code }
    }));
    return true;
  }
};

// src/dao/dynamodb/DynamoDBAuthTokenDAO.ts
import { randomBytes } from "node:crypto";
import { GetCommand as GetCommand3, PutCommand as PutCommand3, DeleteCommand as DeleteCommand3 } from "@aws-sdk/lib-dynamodb";
var TABLE2 = process.env.AUTH_TOKENS_TABLE ?? "AuthTokens";
var TTL_SECONDS = 60 * 60 * 24 * 7;
var DynamoDBAuthTokenDAO = class extends DynamoDBDAO {
  async create(username) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = Math.floor(Date.now() / 1e3) + TTL_SECONDS;
    await this.client.send(new PutCommand3({
      TableName: TABLE2,
      Item: { token, username, expiresAt }
    }));
    return token;
  }
  async validate(token) {
    const res = await this.client.send(new GetCommand3({
      TableName: TABLE2,
      Key: { token }
    }));
    if (!res.Item) return null;
    const expiresAt = res.Item.expiresAt;
    if (expiresAt && expiresAt < Math.floor(Date.now() / 1e3)) return null;
    return res.Item.username;
  }
  async delete(token) {
    const res = await this.client.send(new DeleteCommand3({
      TableName: TABLE2,
      Key: { token },
      ReturnValues: "ALL_OLD"
    }));
    return res.Attributes !== void 0;
  }
};

// src/dao/dynamodb/DynamoDBFactory.ts
var DynamoDBFactory = class {
  createUserDAO() {
    return new DynamoDBUserDAO();
  }
  createVacationDAO() {
    return new DynamoDBVacationDAO();
  }
  createAuthTokenDAO() {
    return new DynamoDBAuthTokenDAO();
  }
};

// src/lambda/lambdaHelpers.ts
var CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function ok(body) {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}
function parseBody(event) {
  if (!event.body) throw new Error("Request body is empty");
  return JSON.parse(event.body);
}
function failure(build, err) {
  const message = err instanceof Error ? err.message : "Internal error";
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify(build(false, message))
  };
}

// src/lambda/vacation/GetVacationsForUserLambda.ts
var handler = async (event) => {
  try {
    const req = parseBody(event);
    const vacations = await new VacationService(new DynamoDBFactory()).getVacationsForUser(
      req.authToken,
      req.username
    );
    return ok(new GetVacationsForUserResponse(true, null, vacations));
  } catch (err) {
    return failure((success, message) => new GetVacationsForUserResponse(success, message, []), err);
  }
};
export {
  handler
};
//# sourceMappingURL=GetVacationsForUserLambda.mjs.map

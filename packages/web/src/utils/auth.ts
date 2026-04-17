import { getUserDAO } from "../data";

export interface User {
	username: string;
}

const SESSION_KEY = "agenda_session";
const AUTH_TOKEN_KEY = "agenda_auth_token";

export async function signup(username: string, password: string): Promise<User | string> {
	const result = await getUserDAO().create(username, password);
	if (typeof result === "string") return result;
	localStorage.setItem(SESSION_KEY, result.username);
	return { username: result.username };
}

export async function login(username: string, password: string): Promise<User | string> {
	const user = await getUserDAO().authenticate(username, password);
	if (!user) return "Invalid username or password.";
	localStorage.setItem(SESSION_KEY, user.username);
	return { username: user.username };
}

export function getSession(): User | null {
	const username = localStorage.getItem(SESSION_KEY);
	return username ? { username } : null;
}

export function logout(): void {
	localStorage.removeItem(SESSION_KEY);
	localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthToken(): string | null {
	return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
	localStorage.setItem(AUTH_TOKEN_KEY, token);
}

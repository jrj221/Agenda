export interface User {
	email: string;
}

interface StoredUser {
	email: string;
	password: string;
}

const USERS_KEY = "agenda_users";
const SESSION_KEY = "agenda_session";

function getStoredUsers(): StoredUser[] {
	const raw = localStorage.getItem(USERS_KEY);
	return raw ? JSON.parse(raw) : [];
}

function saveStoredUsers(users: StoredUser[]): void {
	localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function signup(email: string, password: string): User | string {
	const users = getStoredUsers();
	if (users.find((u) => u.email === email)) {
		return "An account with this email already exists.";
	}
	users.push({ email, password });
	saveStoredUsers(users);
	localStorage.setItem(SESSION_KEY, email);
	return { email };
}

export function login(email: string, password: string): User | string {
	const users = getStoredUsers();
	const user = users.find((u) => u.email === email);
	if (!user || user.password !== password) {
		return "Invalid email or password.";
	}
	localStorage.setItem(SESSION_KEY, email);
	return { email };
}

export function getSession(): User | null {
	const email = localStorage.getItem(SESSION_KEY);
	return email ? { email } : null;
}

export function logout(): void {
	localStorage.removeItem(SESSION_KEY);
}

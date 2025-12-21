import { z } from "zod";

// In-memory store
const users = [
	{ id: "1", name: "Alice", email: "alice@example.com" },
	{ id: "2", name: "Bob", email: "bob@example.com" },
];

// Get user by ID
export async function getUser({ id }) {
	return users.find((u) => u.id === id) || null;
}

getUser.schema = z.object({
	id: z.string().describe("The user ID"),
});

// Create a new user
export async function createUser({ name, email }) {
	const newUser = {
		id: String(users.length + 1),
		name,
		email,
	};
	users.push(newUser);
	return newUser;
}

createUser.schema = z.object({
	name: z.string().min(1).describe("User's full name"),
	email: z.string().email().describe("User's email address"),
});

// List all users
export async function listUsers() {
	return users;
}

listUsers.schema = z.object({}).describe("No parameters required");

import { getUser, createUser, listUsers } from "./actions/api.server.js";

async function test() {
	console.log("Testing API functions...");

	const users = await listUsers();
	console.log("Users:", users);

	const user = await getUser({ id: "1" });
	console.log("User:", user);

	const newUser = await createUser({ name: "John", email: "john@example.com" });
	console.log("Created:", newUser);
}

test();

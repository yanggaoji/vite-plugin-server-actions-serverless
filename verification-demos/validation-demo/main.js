import { createUser } from "./actions/user.server.js";

async function test() {
	try {
		const result = await createUser({
			name: "Test User",
			email: "test@example.com",
			age: 25,
		});
		console.log("Result:", result);
	} catch (error) {
		console.error("Error:", error);
	}
}

test();

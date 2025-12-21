import { z } from "zod";

export async function createUser(data) {
	console.log("Creating user:", data);
	return {
		id: Math.random().toString(36).substr(2, 9),
		...data,
		createdAt: new Date().toISOString(),
	};
}

createUser.schema = z.tuple([
	z.object({
		name: z.string().min(1, "Name is required"),
		email: z.string().email("Invalid email format"),
		age: z.number().optional(),
	}),
]);

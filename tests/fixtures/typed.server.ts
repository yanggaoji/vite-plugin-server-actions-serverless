import { z } from "zod";

// Define schemas for validation
export const greetSchema = {
	input: z.object({
		name: z.string().min(1, "Name is required"),
		greeting: z.string().optional(),
	}),
	output: z.object({
		message: z.string(),
		timestamp: z.number(),
	}),
};

export const calculateSchema = {
	input: z.object({
		a: z.number(),
		b: z.number(),
		operation: z.enum(["add", "subtract", "multiply", "divide"]),
	}),
	output: z.object({
		result: z.number(),
		operation: z.string(),
	}),
};

// Type aliases for better DX
type GreetInput = z.infer<typeof greetSchema.input>;
type GreetOutput = z.infer<typeof greetSchema.output>;
type CalculateInput = z.infer<typeof calculateSchema.input>;
type CalculateOutput = z.infer<typeof calculateSchema.output>;

// Typed server actions
export async function greet(input: GreetInput): Promise<GreetOutput> {
	const greeting = input.greeting || "Hello";
	return {
		message: `${greeting}, ${input.name}!`,
		timestamp: Date.now(),
	};
}

export async function calculate(input: CalculateInput): Promise<CalculateOutput> {
	let result: number;

	switch (input.operation) {
		case "add":
			result = input.a + input.b;
			break;
		case "subtract":
			result = input.a - input.b;
			break;
		case "multiply":
			result = input.a * input.b;
			break;
		case "divide":
			if (input.b === 0) throw new Error("Division by zero");
			result = input.a / input.b;
			break;
	}

	return {
		result,
		operation: input.operation,
	};
}

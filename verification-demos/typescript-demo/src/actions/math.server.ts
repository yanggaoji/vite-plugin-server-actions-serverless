interface CalculationResult {
	input: { a: number; b: number };
	operations: {
		sum: number;
		difference: number;
		product: number;
	};
}

export async function calculate(a: number, b: number): Promise<CalculationResult> {
	return {
		input: { a, b },
		operations: {
			sum: a + b,
			difference: a - b,
			product: a * b,
		},
	};
}

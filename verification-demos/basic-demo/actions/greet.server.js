export async function greet(name) {
	return `Hello, ${name}!`;
}

export async function add(a, b) {
	return a + b;
}

export async function getFalsyValues() {
	return {
		zero: 0,
		empty: "",
		falseVal: false,
		nullVal: null,
	};
}

export async function returnsUndefined() {
	return undefined;
}

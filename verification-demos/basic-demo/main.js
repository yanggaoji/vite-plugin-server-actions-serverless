import { greet, add, getFalsyValues, returnsUndefined } from "./actions/greet.server.js";

async function runTests() {
	const output = document.getElementById("output");
	const results = [];

	try {
		const greeting = await greet("World");
		results.push(`greet("World"): ${greeting}`);

		const sum = await add(5, 3);
		results.push(`add(5, 3): ${sum}`);

		const falsy = await getFalsyValues();
		results.push(`getFalsyValues(): ${JSON.stringify(falsy)}`);

		const undef = await returnsUndefined();
		results.push(`returnsUndefined(): ${undef}`);
	} catch (error) {
		results.push(`Error: ${error.message}`);
	}

	output.innerHTML = results.map((r) => `<p>${r}</p>`).join("");
}

runTests();

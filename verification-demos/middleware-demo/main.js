import { getData } from "./actions/data.server.js";

async function runTests() {
	const output = document.getElementById("output");
	const results = [];

	try {
		const data = await getData();
		results.push(`getData(): ${JSON.stringify(data)}`);
	} catch (error) {
		results.push(`Error: ${error.message}`);
	}

	output.innerHTML = results.map((r) => `<p>${r}</p>`).join("");
}

runTests();

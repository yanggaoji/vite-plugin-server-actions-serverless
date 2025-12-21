import { calculate } from "./actions/math.server";

async function run() {
	const result = await calculate(10, 5);
	console.log("Calculation result:", result);
	document.getElementById("result")!.innerHTML = `
    <pre>${JSON.stringify(result, null, 2)}</pre>
  `;
}

run();

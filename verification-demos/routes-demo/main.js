import { getProducts, getProductById } from "./actions/products.server.js";

async function init() {
	const app = document.getElementById("app");

	try {
		const products = await getProducts();
		app.innerHTML = `<pre>${JSON.stringify(products, null, 2)}</pre>`;

		const product = await getProductById(1);
		console.log("Product by ID:", product);
	} catch (error) {
		app.innerHTML = `<p>Error: ${error.message}</p>`;
	}
}

init();

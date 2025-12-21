export async function getData() {
	return {
		message: "Hello from server action!",
		timestamp: Date.now(),
		items: ["apple", "banana", "cherry"],
	};
}

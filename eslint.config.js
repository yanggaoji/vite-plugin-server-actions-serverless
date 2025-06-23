import js from "@eslint/js";

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: {
				console: "readonly",
				process: "readonly",
				Buffer: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				global: "readonly",
				vi: "readonly",
				describe: "readonly",
				it: "readonly",
				expect: "readonly",
				beforeEach: "readonly",
				afterEach: "readonly",
			},
		},
		rules: {
			"no-unused-vars": "off",
			"no-console": "off", // Allow console in server-side code
			"prefer-const": "error",
			"no-var": "error",
			"eqeqeq": ["error", "always"],
			"curly": ["error", "all"],
			"indent": ["error", "tab"],
			"quotes": ["error", "double"],
			"semi": ["error", "always"],
		},
	},
	{
		files: ["**/*.test.js", "**/*.spec.js"],
		rules: {
			"no-unused-expressions": "off", // Allow for test assertions
		},
	},
	{
		ignores: ["node_modules/**", "dist/**", "examples/**/node_modules/**", "examples/**/dist/**", "*.min.js"],
	},
];

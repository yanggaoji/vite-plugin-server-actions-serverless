import { test, expect } from "@playwright/test";

test.describe("TypeScript React App", () => {
  test("should load and show todos", async ({ page }) => {
    // Navigate to the app
    await page.goto("http://localhost:5176");
    
    // Wait for the app to load
    await page.waitForSelector('h1:has-text("TODO App (TypeScript)")', { timeout: 10000 });
    
    // Check that the API call works
    const response = await page.request.post("http://localhost:5176/api/src/actions/todo/getTodos", {
      data: []
    });
    
    console.log("API Response Status:", response.status());
    console.log("API Response:", await response.text());
    
    expect(response.ok()).toBe(true);
    
    // Check that todos are displayed
    await page.waitForSelector(".todo-item", { timeout: 5000 });
    
    const todos = await page.locator(".todo-item").count();
    expect(todos).toBeGreaterThan(0);
  });
  
  test("API endpoints should work", async ({ request }) => {
    // Test getTodos
    const getTodosResponse = await request.post("http://localhost:5176/api/src/actions/todo/getTodos", {
      data: []
    });
    
    console.log("getTodos status:", getTodosResponse.status());
    console.log("getTodos response:", await getTodosResponse.text());
    
    expect(getTodosResponse.ok()).toBe(true);
    
    const todos = await getTodosResponse.json();
    expect(Array.isArray(todos)).toBe(true);
  });
});
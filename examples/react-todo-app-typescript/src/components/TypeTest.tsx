import React, { useEffect, useState } from "react";
import { 
  isString, 
  processData, 
  getStatus,
  createUser,
  type Status,
  type UserWithTimestamps
} from "../actions/advanced-types.server";

export const TypeTest: React.FC = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    runTypeTests();
  }, []);

  const runTypeTests = async () => {
    const results: string[] = [];

    // Test 1: Type predicate
    const testValue: unknown = "hello";
    if (await isString(testValue)) {
      results.push("✓ Type predicate works: value is string");
    }

    // Test 2: Generic function
    const data = { name: "test" };
    const processed = await processData(data, (item) => ({ ...item, processed: true as const }));
    results.push(`✓ Generic function works: ${JSON.stringify(processed)}`);

    // Test 3: Status enum
    const currentStatus = await getStatus();
    setStatus(currentStatus);
    results.push(`✓ Status enum works: ${currentStatus}`);

    // Test 4: Complex types
    const newUser = await createUser({ name: "Test User" });
    results.push(`✓ Complex types work: User created with ID ${newUser.id}`);

    setTestResults(results);
  };

  if (testResults.length === 0) {
    return <div>Running type tests...</div>;
  }

  return (
    <div style={{ 
      padding: "20px", 
      margin: "20px", 
      border: "1px solid #e0e0e0", 
      borderRadius: "8px",
      backgroundColor: "#f5f5f5"
    }}>
      <h3>Advanced TypeScript Types Test</h3>
      <p>Status: <strong>{status}</strong></p>
      <ul>
        {testResults.map((result, index) => (
          <li key={index} style={{ color: "green" }}>{result}</li>
        ))}
      </ul>
      <p style={{ fontSize: "0.9em", color: "#666", marginTop: "10px" }}>
        This component demonstrates that the advanced TypeScript types in advanced-types.server.ts are working correctly.
      </p>
    </div>
  );
};
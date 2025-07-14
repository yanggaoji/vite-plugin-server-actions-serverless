import React, { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { TypeFeatureCard } from "./components/TypeFeatureCard";

function App() {
  const [showTypeInfo, setShowTypeInfo] = useState(true);

  return (
    <div className="app">
      <header className="app-header">
        <h1>TypeScript Analytics Demo</h1>
        <p>Advanced TypeScript patterns with Vite Server Actions</p>
        <button 
          className="type-toggle"
          onClick={() => setShowTypeInfo(!showTypeInfo)}
        >
          {showTypeInfo ? "Hide" : "Show"} Type Info
        </button>
      </header>

      <main className="app-main">
        <Dashboard showTypeInfo={showTypeInfo} />
      </main>

      <footer className="app-footer">
        <p>
          This demo showcases advanced TypeScript features including branded types, 
          conditional types, template literals, and more.
        </p>
        <a href="/api/docs" target="_blank" rel="noopener noreferrer">
          View API Documentation
        </a>
      </footer>
    </div>
  );
}

export default App;
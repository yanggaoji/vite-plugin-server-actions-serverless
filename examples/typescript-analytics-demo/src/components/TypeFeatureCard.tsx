import React, { useState } from "react";

interface TypeFeatureCardProps {
  feature: string;
  description: string;
  example: string;
}

export const TypeFeatureCard: React.FC<TypeFeatureCardProps> = ({
  feature,
  description,
  example
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`type-feature-card ${expanded ? "expanded" : ""}`}>
      <div className="type-feature-header" onClick={() => setExpanded(!expanded)}>
        <h4>
          <span className="type-icon">TS</span>
          {feature}
        </h4>
        <button className="expand-button">
          {expanded ? "−" : "+"}
        </button>
      </div>
      
      <p className="type-feature-description">{description}</p>
      
      {expanded && (
        <pre className="type-feature-example">
          <code>{example}</code>
        </pre>
      )}
    </div>
  );
};
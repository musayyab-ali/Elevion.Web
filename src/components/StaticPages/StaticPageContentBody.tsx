"use client";

import React from "react";

interface StaticPageContentBodyProps {
  content: string;
}

const StaticPageContentBody: React.FC<StaticPageContentBodyProps> = ({
  content,
}) => {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletLines = lines.filter(
    (line) => line.startsWith("●") || line.startsWith("-") || line.startsWith("•"),
  );

  if (bulletLines.length > 0) {
    return (
      <ul className="space-y-2 pl-5 list-disc">
        {bulletLines.map((line, index) => (
          <li key={index} className="body1 text-secondary">
            {line.replace(/^[●•\-]\s*/, "")}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="body1 text-secondary whitespace-pre-line leading-relaxed">
      {content}
    </div>
  );
};

export default StaticPageContentBody;

"use client";

import React, { useState } from "react";
import * as Icon from "@phosphor-icons/react/dist/ssr";
import { StaticPageSection } from "@/lib/static-pages";
import StaticPageContentBody from "@/components/StaticPages/StaticPageContentBody";

interface StaticPageAccordionProps {
  sections: StaticPageSection[];
  defaultOpenId?: string;
}

const StaticPageAccordion: React.FC<StaticPageAccordionProps> = ({
  sections,
  defaultOpenId,
}) => {
  const [activeId, setActiveId] = useState<string | undefined>(
    defaultOpenId ?? sections[0]?.id,
  );

  if (!sections.length) {
    return (
      <p className="body1 text-secondary text-center py-10">
        No content available right now.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {sections.map((section) => {
        const isOpen = activeId === section.id;

        return (
          <div
            key={section.id}
            className={`question-item rounded-[20px] overflow-hidden border border-line cursor-pointer px-5 py-5 md:px-7 md:py-5 ${isOpen ? "open" : ""}`}
            onClick={() => setActiveId(isOpen ? undefined : section.id)}
          >
            <div className="heading flex items-center justify-between gap-4 md:gap-6">
              <div className="heading6 text-left">{section.title}</div>
              <Icon.CaretRight
                size={24}
                className={`shrink-0 duration-300 ${isOpen ? "rotate-90" : ""}`}
              />
            </div>
            {isOpen && (
              <div className="content mt-4">
                <StaticPageContentBody content={section.content} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StaticPageAccordion;

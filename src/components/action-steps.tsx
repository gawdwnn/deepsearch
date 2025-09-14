import { useState } from "react";
import { Search, Link } from "lucide-react";
import type { ActionStep } from "~/types/messages";
import { Markdown } from "./markdown";

interface ActionStepsProps {
  actionSteps: ActionStep[];
}

export const ActionSteps = ({ actionSteps }: ActionStepsProps) => {
  const [openStep, setOpenStep] = useState<number | null>(null);

  if (actionSteps.length === 0) return null;

  const getStatusColor = (phase: ActionStep["phase"]) => {
    switch (phase) {
      case "starting":
        return "border-yellow-400 text-yellow-400";
      case "in_progress":
        return "border-blue-400 text-blue-400";
      case "completed":
        return "border-green-400 text-green-400";
      case "failed":
        return "border-red-400 text-red-400";
      default:
        return "border-gray-500 text-gray-300";
    }
  };

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {actionSteps.map((step, index) => {
          const isOpen = openStep === index;
          return (
            <li key={index} className="relative">
              <button
                onClick={() => setOpenStep(isOpen ? null : index)}
                className={`flex w-full items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                  isOpen
                    ? "bg-gray-700 text-gray-200"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex size-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    isOpen
                      ? "border-blue-400 text-white"
                      : `bg-gray-800 ${getStatusColor(step.phase)}`
                  }`}
                >
                  {index + 1}
                </span>
                {step.title}
              </button>
              {isOpen && (
                <div className="mt-1 px-2 py-1">
                  <div className="text-sm italic text-gray-400">
                    <Markdown>{step.reasoning}</Markdown>
                  </div>
                  {step.action === "search" && step.metadata?.query && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                      <Search className="size-4" />
                      <span>{step.metadata.query}</span>
                    </div>
                  )}
                  {(step.metadata?.scrapedCount ?? step.metadata?.summarizedCount) && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                      <Link className="size-4" />
                      <span>
                        {step.metadata.summarizedCount
                          ? `Summarized ${step.metadata.summarizedCount} of ${step.metadata.scrapedCount ?? 0} scraped URLs`
                          : `Scraped ${step.metadata.scrapedCount} of ${step.metadata.resultCount} URLs`
                        }
                      </span>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
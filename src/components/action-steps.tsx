import { useState } from "react";
import { Search, Link, Brain, ArrowRight } from "lucide-react";
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
                  {step.action === "plan" && step.metadata?.plan && (
                    <div className="mt-2 rounded border border-gray-700 bg-gray-800 p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-400">
                        <Brain className="size-4" />
                        <span>Research Plan</span>
                      </div>
                      <div className="text-sm text-gray-300">
                        <Markdown>{step.metadata.plan}</Markdown>
                      </div>
                    </div>
                  )}
                  {step.action === "plan" && step.metadata?.queries && (
                    <div className="mt-2">
                      <div className="mb-2 text-sm font-medium text-blue-400">
                        Search Queries:
                      </div>
                      <ul className="list-inside list-decimal space-y-1 text-sm text-gray-300">
                        {step.metadata.queries.map((query, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-0.5 flex-shrink-0 text-blue-400">
                              {i + 1}.
                            </span>
                            <span>{query}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {step.action === "search" && step.metadata?.queries && (
                    <div className="mt-2">
                      <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
                        <Search className="size-4" />
                        <span>
                          Executed {step.metadata.queries.length} searches in
                          parallel
                        </span>
                      </div>
                      <ul className="ml-6 list-inside list-disc space-y-1 text-sm text-gray-400">
                        {step.metadata.queries.map((query, i) => (
                          <li key={i}>{query}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {step.action === "search" && step.metadata?.query && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                      <Search className="size-4" />
                      <span>{step.metadata.query}</span>
                    </div>
                  )}
                  {step.action === "continue" && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-orange-400">
                      <ArrowRight className="size-4" />
                      <span>Continuing research - need more information</span>
                    </div>
                  )}
                  {(step.metadata?.scrapedCount ??
                    step.metadata?.summarizedCount) && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                      <Link className="size-4" />
                      <span>
                        {step.metadata.summarizedCount
                          ? `Summarized ${step.metadata.summarizedCount} of ${step.metadata.scrapedCount ?? 0} scraped URLs`
                          : `Scraped ${step.metadata.scrapedCount} of ${step.metadata.resultCount} URLs`}
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

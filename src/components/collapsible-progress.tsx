import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ActionSteps } from "./action-steps";
import type { ActionStep } from "~/types/messages";

interface CollapsibleProgressProps {
  actionSteps: ActionStep[];
  defaultExpanded?: boolean;
}

export const CollapsibleProgress = ({ actionSteps, defaultExpanded = false }: CollapsibleProgressProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (actionSteps.length === 0) return null;

  // Calculate progress
  const completedSteps = actionSteps.filter(step => step.phase === 'completed').length;
  const totalSteps = actionSteps.length;
  const currentStep = actionSteps.find(step => step.phase === 'in_progress');
  
  // Create summary text
  const summaryText = currentStep 
    ? `Working on: ${currentStep.title}` 
    : `Working... (${completedSteps}/${totalSteps} steps complete)`;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm bg-gray-700/50 hover:bg-gray-700 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="size-4 text-gray-400" />
        ) : (
          <ChevronRight className="size-4 text-gray-400" />
        )}
        <span className="text-gray-300">{summaryText}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="text-xs text-gray-500">
            {completedSteps}/{totalSteps}
          </div>
          <div className="w-16 bg-gray-600 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }}
            />
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="mt-2 rounded border border-gray-600 bg-gray-800/50">
          <ActionSteps
            actionSteps={actionSteps.sort((a, b) => a.timestamp - b.timestamp)}
          />
        </div>
      )}
    </div>
  );
};
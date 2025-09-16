import type { ActionStep } from "~/types/messages";
import { logger } from "~/utils/logger";

export const createActionStep = (
  id: string,
  action: ActionStep["action"],
  title: string,
  reasoning: string,
): ActionStep => ({
  id,
  action,
  title,
  reasoning,
  phase: "starting",
  timestamp: Date.now(),
});

export const manageActionStep = (
  actionSteps: ActionStep[],
  streamActionStep: (step: ActionStep) => void,
  action: "create" | "update",
  stepData:
    | ActionStep
    | {
        id: string;
        phase: ActionStep["phase"];
        metadata?: ActionStep["metadata"];
      },
) => {
  if (action === "create") {
    const step = stepData as ActionStep;
    actionSteps.push(step);
    streamActionStep(step);
  } else if (action === "update") {
    const { id, phase, metadata } = stepData;
    const currentStep = actionSteps.find((s) => s.id === id);

    if (currentStep) {
      const updatedStep = {
        ...currentStep,
        phase,
        metadata: metadata
          ? { ...currentStep.metadata, ...metadata }
          : currentStep.metadata,
        timestamp: Date.now(),
      };

      const stepIndex = actionSteps.findIndex((s) => s.id === id);
      actionSteps[stepIndex] = updatedStep;
      streamActionStep(updatedStep);
    } else {
      logger.warn("Attempted to update non-existent step", {
        stepId: id,
        phase,
      });
    }
  }
};

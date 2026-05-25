"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { TourStep } from "@/types/tour";
import { globalTourRegistry } from "@/lib/tour/registry";

interface TourContextProps {
  isActive: boolean;
  currentStep: TourStep | null;
  startTour: () => void;
  nextStep: () => void;
  closeTour: () => void;
}

const TourContext = createContext<TourContextProps | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [stepIndex, setStepIndex] = useState<number | null>(null);

  const isActive = stepIndex !== null;
  const currentStep = isActive && stepIndex < globalTourRegistry.length 
    ? globalTourRegistry[stepIndex] 
    : null;

  const startTour = useCallback(async () => {
    const firstStep = globalTourRegistry[0];
    if (!firstStep) return;

    // Se a primeira etapa tiver alguma preparação (como abrir um menu), executa antes
    if (firstStep.onBeforeEnter) {
      await firstStep.onBeforeEnter();
    }
    
    setStepIndex(0);
  }, []);

  const closeTour = useCallback(() => {
    setStepIndex(null);
  }, []);

  const nextStep = useCallback(async () => {
    if (stepIndex === null) return;
    
    const nextIndex = stepIndex + 1;
    
    // Se não houver mais etapas, finaliza o tour
    if (nextIndex >= globalTourRegistry.length) {
      closeTour();
      return;
    }

    const nextStepConfig = globalTourRegistry[nextIndex];
    
    // Prepara a interface para a próxima etapa, caso necessário
    if (nextStepConfig.onBeforeEnter) {
      await nextStepConfig.onBeforeEnter();
    }

    setStepIndex(nextIndex);
  }, [stepIndex, closeTour]);

  return (
    <TourContext.Provider value={{ isActive, currentStep, startTour, nextStep, closeTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour deve ser usado dentro de um TourProvider");
  }
  return context;
}
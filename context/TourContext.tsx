"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TourStep } from "@/types/tour";
import { globalTourRegistry } from "@/lib/tour/registry";

interface TourContextProps {
  isActive: boolean;
  currentStep: TourStep | null;
  isNavigating: boolean;
  startTour: () => void;
  nextStep: () => void;
  closeTour: () => void;
}

const TourContext = createContext<TourContextProps | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  const isActive = stepIndex !== null;
  const currentStep = isActive && stepIndex < globalTourRegistry.length 
    ? globalTourRegistry[stepIndex] 
    : null;

  const startTour = useCallback(async () => {
    const firstStep = globalTourRegistry[0];
    if (!firstStep) return;

    if (firstStep.onBeforeEnter) {
      await firstStep.onBeforeEnter();
    }

    if (firstStep.route && firstStep.route !== pathname) {
      setIsNavigating(true);
      router.push(firstStep.route);
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    setStepIndex(0);
    setIsNavigating(false);
  }, [pathname, router]);

  const closeTour = useCallback(() => {
    setStepIndex(null);
    setIsNavigating(false);
  }, []);

  const nextStep = useCallback(async () => {
    if (stepIndex === null) return;
    
    const nextIndex = stepIndex + 1;
    
    if (nextIndex >= globalTourRegistry.length) {
      closeTour();
      return;
    }

    const nextStepConfig = globalTourRegistry[nextIndex];
    
    if (nextStepConfig.onBeforeEnter) {
      await nextStepConfig.onBeforeEnter();
    }

    if (nextStepConfig.route && nextStepConfig.route !== pathname) {
      setIsNavigating(true); 
      router.push(nextStepConfig.route);
      await new Promise(resolve => setTimeout(resolve, 300)); 
    }

    setStepIndex(nextIndex);
    setIsNavigating(false); 
  }, [stepIndex, closeTour, pathname, router]);

  return (
    <TourContext.Provider value={{ isActive, currentStep, isNavigating, startTour, nextStep, closeTour }}>
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
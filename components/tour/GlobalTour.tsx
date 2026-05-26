"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTour } from "@/context/TourContext";

export function GlobalTour() {
  const { isActive, currentStep, nextStep, closeTour, isNavigating } =
    useTour();
  const cardRef = useRef<HTMLDivElement>(null);
  const isMovingRef = useRef(false);

  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({
    opacity: 0,
  });

  const CARD_WIDTH = 280;
  const GAP_Y = 16;
  const OFFSET_X = -40;
  const SCROLL_MARGIN = 260;

  useEffect(() => {
    if (!isActive || !currentStep || isNavigating) {
      setSpotlightStyle({});
      setCardStyle({ opacity: 0 });
      return;
    }

    isMovingRef.current = true;
    const transitionTimer = setTimeout(() => {
      isMovingRef.current = false;
    }, 400);

    const element = document.querySelector(
      `[data-tour-id="${currentStep.targetId}"]`,
    );
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.top < SCROLL_MARGIN || rect.bottom > window.innerHeight) {
        const targetScroll = window.scrollY + rect.top - SCROLL_MARGIN;
        window.scrollTo({ top: Math.max(0, targetScroll), behavior: "smooth" });
      }
    }

    let animationFrameId: number;
    let lastRectString = "";

    const trackElement = () => {
      const el = document.querySelector(
        `[data-tour-id="${currentStep.targetId}"]`,
      );
      if (el) {
        const rect = el.getBoundingClientRect();
        const newRectString = `${rect.top}-${rect.left}-${rect.width}-${rect.height}`;

        if (newRectString !== lastRectString) {
          lastRectString = newRectString;

          const cardHeight = cardRef.current?.offsetHeight || 180;
          const viewportHeight = window.innerHeight;
          const viewportWidth = window.innerWidth;

          const sTop = rect.top - 12;
          const sLeft = rect.left - 12;
          const sWidth = rect.width + 24;
          const sHeight = rect.height + 24;

          setSpotlightStyle({
            transform: `translate(${sLeft}px, ${sTop}px)`,
            width: `${sWidth}px`,
            height: `${sHeight}px`,
            boxShadow: "0 0 0 calc(200vw + 200vh) rgba(14, 14, 16, 0.7)",
            transition: isMovingRef.current
              ? "transform 0.4s ease-out, width 0.4s ease-out, height 0.4s ease-out"
              : "none",
          });

          let cTop;
          let cLeft = sLeft + sWidth / 2 - CARD_WIDTH / 2 + OFFSET_X;

          if (currentStep.placement === "overlay") {
            cTop = sTop + GAP_Y;
            if (cTop < 16) cTop = 16;
            if (cTop + cardHeight > viewportHeight - 16)
              cTop = viewportHeight - cardHeight - 16;
          } else if (currentStep.placement === "left") {
            cTop = sTop + 40;
            cLeft = sLeft - CARD_WIDTH - GAP_Y;
            if (cTop + cardHeight > viewportHeight - 16)
              cTop = viewportHeight - cardHeight - 16;
            if (cLeft < 16) cLeft = 16;
          } else {
            cTop = sTop - cardHeight - GAP_Y;
            if (cTop < 16) cTop = sTop + sHeight + GAP_Y;
            if (cTop + cardHeight > viewportHeight - 16)
              cTop = viewportHeight - cardHeight - 16;
          }

          if (cLeft < 16) cLeft = 16;
          if (cLeft + CARD_WIDTH > viewportWidth - 16)
            cLeft = viewportWidth - CARD_WIDTH - 16;

          setCardStyle({
            transform: `translate(${cLeft}px, ${cTop}px)`,
            transition: isMovingRef.current
              ? "transform 0.4s ease-out, opacity 0.3s ease-out"
              : "none",
            opacity: 1,
          });
        }
      }
      animationFrameId = requestAnimationFrame(trackElement);
    };

    trackElement();

    return () => {
      clearTimeout(transitionTimer);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, currentStep, isNavigating]);

  if (!isActive || !currentStep || isNavigating) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div
        className="absolute top-0 left-0 border-2 border-primary shadow-[0_0_30px_rgba(173,198,255,0.4)] rounded-2xl pointer-events-none will-change-transform"
        style={spotlightStyle}
      />

      <div
        ref={cardRef}
        className="absolute top-0 left-0 z-50 bg-surface-container-high/95 backdrop-blur-md border border-outline-variant rounded-xl p-5 shadow-2xl will-change-transform opacity-0 pointer-events-auto"
        style={{
          ...cardStyle,
          width: `${CARD_WIDTH}px`,
        }}
      >
        <h3 className="text-lg font-bold text-on-surface mb-1 font-inter">
          {currentStep.title}
        </h3>
        <p className="text-on-surface-variant text-sm mb-5 leading-relaxed">
          {currentStep.description}
        </p>
        <div className="flex justify-between items-center mt-2">
          <button
            onClick={closeTour}
            className="text-xs text-outline font-medium hover:text-on-surface transition-colors"
          >
            Pular
          </button>
          <button
            onClick={nextStep}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold shadow-[0_4px_14px_rgba(173,198,255,0.25)] hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  );
}

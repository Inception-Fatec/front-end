export type TourPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
  id: string;
  targetId: string;
  route: string;
  title: string;
  description: string;
  placement?: TourPlacement;
  /**
   * Gatilho opcional executado antes da etapa ser renderizada.
   * Útil para abrir modais, menus ou drawers antes do spotlight.
   */
  onBeforeEnter?: () => void | Promise<void>;
}
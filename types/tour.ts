export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'outside' | 'overlay';

export interface TourStep {
  id: string;
  targetId: string;
  route: string;
  title: string;
  description: string;
  placement?: TourPlacement;
  onBeforeEnter?: () => void | Promise<void>;
}
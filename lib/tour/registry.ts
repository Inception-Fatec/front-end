// lib/tour/registry.ts

import { TourStep } from "@/types/tour";

export const globalTourRegistry: TourStep[] = [
  {
    id: 'step-1-dashboard-stations',
    targetId: 'tour-dashboard-stations-card',
    route: '/dashboard',
    title: 'Visão Geral das Estações',
    description: 'Aqui você acompanha o status em tempo real de todas as estações de monitoramento. Clique em "Ver detalhes" para análises aprofundadas.',
    placement: 'bottom' // O card vai preferencialmente aparecer abaixo do componente
  }
  // Os próximos passos (Notificações, Parâmetros, etc) entrarão aqui depois.
];
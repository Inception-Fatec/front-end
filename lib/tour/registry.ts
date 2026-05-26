import { TourStep } from "@/types/tour";

export const globalTourRegistry: TourStep[] = [
  {
    id: 'step-1-dashboard-stations',
    targetId: 'tour-dashboard-stations-card',
    route: '/dashboard',
    title: 'Visão Geral das Estações',
    description: 'Aqui você acompanha o status em tempo real de todas as estações de monitoramento. Clique em "Ver detalhes" para análises aprofundadas.',
    placement: 'outside'
  },
  {
    id: 'step-2-notifications',
    targetId: 'tour-header-notifications', 
    route: '/dashboard', 
    title: 'Central de Notificações',
    description: 'Fique de olho aqui! Todos os alertas críticos, moderados ou menores gerados pelas estações aparecerão neste painel em tempo real.',
    onBeforeEnter: async () => {
      const bellButton = document.getElementById('notification-bell-btn');
      if (bellButton) {
        bellButton.click(); 
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  },
  {
    id: 'step-3-parameters',
    targetId: 'tour-parameters-summary',
    route: '/dashboard/parametros', 
    title: 'Monitorização de Parâmetros',
    description: 'Este é o coração da sua rede IoT. Aqui pode gerir as variáveis telemetradas (Temperatura, Humidade, etc.) e verificar rapidamente o status global.',
    onBeforeEnter: async () => {
      // Procura o sino e o menu. Se estiver aberto, fecha-o antes de viajar!
      const bellButton = document.getElementById('notification-bell-btn');
      const dropdown = document.querySelector('[data-tour-id="tour-header-notifications"]');
      if (bellButton && dropdown) {
         bellButton.click(); 
         await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  },
  {
    id: 'step-4-stations-page',
    targetId: 'tour-stations-table',
    route: '/dashboard/estacoes', 
    title: 'Gestão de Estações',
    description: 'Aqui você tem controle total sobre os equipamentos. Pode visualizar o status, editar informações ou cadastrar novas estações na rede.',
    placement: 'overlay', 
  },
  {
    id: 'step-5-station-drawer',
    targetId: 'tour-station-drawer',
    route: '/dashboard/estacoes',
    title: 'Detalhes da Estação',
    description: 'Aqui você tem acesso à ficha técnica completa da estação selecionada, podendo verificar o histórico recente de dados e o status de bateria e sinal.',
    placement: 'left', 
    onBeforeEnter: async () => {
      let btn = null;
      for (let i = 0; i < 15; i++) {
        btn = document.querySelector('.tour-open-drawer-btn');
        if (btn) break;
        await new Promise(resolve => setTimeout(resolve, 200)); 
      }
      if (btn) {
        (btn as HTMLButtonElement).click();
        await new Promise(resolve => setTimeout(resolve, 200)); 
      }
    }
  },
  {
    id: 'step-6-station-filters',
    targetId: 'tour-station-groups-filter',
    route: '/dashboard/estacoes',
    title: 'Filtro por Grupos',
    description: 'Organize a sua visualização! Use este filtro para isolar rapidamente as estações que pertencem a um grupo específico, facilitando a gestão de grandes redes.',
    placement: 'outside', 
    onBeforeEnter: async () => {
      const closeDrawerBtn = document.querySelector('[data-tour-id="tour-station-drawer"] button');
      if (closeDrawerBtn) {
        (closeDrawerBtn as HTMLButtonElement).click();
        await new Promise(resolve => setTimeout(resolve, 400)); 
      }
    }
  },
  {
    id: 'step-7-alerts',
    targetId: 'tour-alerts-row',
    route: '/dashboard/alertas',
    title: 'Gestão de Alertas',
    description: 'Aqui ficam registados todos os alertas críticos e anomalias detetadas pelos sensores. Mantenha esta lista sob controlo para garantir a saúde da rede.',
    placement: 'outside', 
  }
];
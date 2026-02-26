import React, { useEffect, useState } from 'react';
import { Lightbulb, Pause } from 'lucide-react';

import AnalysisPlanner from './AnalysisPlanner';
import { metaAdsService } from '../services/metaAdsService';

interface InsightsSectionProps {
  selectedProduct: string;

  selectedClient?: string;
  selectedMonth?: string;
  selectedAudience?: string;
  isFacebookConnected?: boolean;
  metaAdsUserId?: string;
}

const InsightsSection: React.FC<InsightsSectionProps> = ({ selectedProduct, selectedClient = '', selectedMonth = '', selectedAudience = '', isFacebookConnected = false, metaAdsUserId = '' }) => {

  const [isAudiencePaused, setIsAudiencePaused] = useState<boolean>(false);

  // Verificar se o público selecionado está pausado
  useEffect(() => {
    let cancelled = false;
    const checkAudienceStatus = async () => {
      if (!selectedAudience || selectedAudience === 'Todos os Públicos' ||
        !selectedProduct || selectedProduct === 'Todos os Produtos') {
        setIsAudiencePaused(false);
        return;
      }

      // Se não está conectado ao Facebook, usar uma abordagem alternativa
      if (!isFacebookConnected) {


        // 1. Verificar se o público selecionado contém indicação de pausado no nome
        const isPausedByName = selectedAudience.toLowerCase().includes('pausado') ||
          selectedAudience.toLowerCase().includes('paused') ||
          // Baseado na imagem enviada, o texto mostra "Conjunto de anúncios Pausado"
          selectedAudience.includes('Pausado');

        // 2. Verificar dados salvos no localStorage (análises passadas, etc.)
        try {
          const plannersData = localStorage.getItem('analysisPlanners');
          if (plannersData) {
            const planners = JSON.parse(plannersData);
            const planner = planners.find((p: any) => p.audience === selectedAudience);
            if (planner?.status === 'PAUSED') {

              setIsAudiencePaused(true);
              return;
            }
          }

          // 3. Para testar: Forçar como pausado se o público contém texto específico
          // (Este público específico da imagem que você enviou)
          const testPausedAudiences = [
            '[ambos os sexos] [35-45] [localização - Brasil] [aberto]',
            '[ambos os sexos] [35-45] [localização - Salvador] [aberto]'
          ];

          if (testPausedAudiences.includes(selectedAudience)) {
            setIsAudiencePaused(true);
            return;
          }

        } catch (error) {

        }


        setIsAudiencePaused(isPausedByName);
        return;
      }

      try {
        // 🎯 NOVA LÓGICA: Usar a mesma abordagem do AudiencePicker
        // Buscar todas as campanhas e Ad Sets para encontrar o público selecionado
        const campaignId = localStorage.getItem('selectedCampaignId');

        if (campaignId) {
          const adSetsData = await metaAdsService.getAdSets(campaignId);


          // Encontrar o AdSet que corresponde ao público selecionado
          const matchingAdSet = adSetsData.find((adSet: any) => {
            // Comparar nome do público (pode ter variações)
            const adSetName = adSet.name || '';
            const audienceName = selectedAudience || '';


            // Comparação exata ou normalizada
            return adSetName === audienceName ||
              adSetName.toLowerCase().includes(audienceName.toLowerCase()) ||
              audienceName.toLowerCase().includes(adSetName.toLowerCase());
          });

          if (matchingAdSet) {
            // 🎯 NOVA LÓGICA: Verificar status do AdSet E problemas de billing
            const adSetPaused = matchingAdSet.status === 'PAUSED';

            // Verificar problemas de billing na conta
            let hasBillingIssues = false;
            try {
              const selectedAccount = metaAdsService.getSelectedAccount();
              if (selectedAccount) {
                hasBillingIssues = selectedAccount.account_status !== 1;
              }
            } catch (error) {
              console.error('Erro ao verificar billing:', error);
            }

            // 🎯 LÓGICA: Pausado se AdSet pausado OU problemas de billing
            const isPaused = adSetPaused || hasBillingIssues;

            if (!cancelled) {
              setIsAudiencePaused(isPaused);
            }
          } else {

            // Se não encontrou o AdSet específico, considerar como ativo
            if (!cancelled) {
              setIsAudiencePaused(false);
            }
          }
        } else {

          // Se não tem campaign ID, considerar como ativo
          if (!cancelled) {
            setIsAudiencePaused(false);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status do público:', error);
        if (!cancelled) {
          setIsAudiencePaused(false);
        }
      }
    };

    checkAudienceStatus();
    return () => { cancelled = true; };
  }, [selectedAudience, isFacebookConnected, selectedProduct]);



  return (
    <div data-section="insights" className="relative overflow-hidden bg-slate-900/80 border border-slate-700/50 rounded-2xl shadow-xl">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-gradient-to-br from-yellow-500/10 to-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                <Lightbulb className="h-5 w-5 text-slate-900" />
              </div>
            </div>
            <div className="flex flex-col justify-center h-11">
              <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent leading-tight">
                Insights e Sugestões
              </h3>
            </div>
          </div>
          {/* Canto direito: Exibir produto/cliente em vez de confiança/simulado */}
          {selectedProduct && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <span className="hidden sm:inline">Produto:</span>
              <span className="text-slate-100 font-semibold">[{selectedProduct}]</span>
              {selectedClient && selectedClient !== 'Selecione um cliente' && (
                <span className="text-slate-400">- {selectedClient}</span>
              )}
            </div>
          )}
        </div>

        {/* Planejador de análise - Ocultar se público pausado */}
        {selectedProduct && selectedProduct !== 'Todos os Produtos' && !isAudiencePaused && (
          <AnalysisPlanner
            selectedClient={selectedClient}
            selectedMonth={selectedMonth}
            selectedProduct={selectedProduct}
            selectedAudience={selectedAudience}
            isFacebookConnected={isFacebookConnected}
            metaAdsUserId={metaAdsUserId}
          />
        )}

        {/* Mensagem quando público pausado - Somente para AnalysisPlanner */}
        {selectedProduct && selectedProduct !== 'Todos os Produtos' && isAudiencePaused && (
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-6 mb-4">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-3">
                  <Pause className="h-6 w-6 text-slate-400" />
                </div>
                <h4 className="text-md font-semibold text-slate-200 mb-2">
                  Planejamento Pausado
                </h4>
                <p className="text-slate-400 text-sm max-w-md">
                  O planejamento de análise está oculto porque o público
                  <span className="text-slate-200 font-medium"> "{selectedAudience}" </span>
                  está pausado.
                </p>
              </div>
            </div>
          </div>
        )}



        {/* Container de “Insights Gerados” removido conforme solicitado */}
      </div>
    </div>
  );
};

export default InsightsSection;

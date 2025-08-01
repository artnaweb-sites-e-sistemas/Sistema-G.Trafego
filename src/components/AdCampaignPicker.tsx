import React, { useState, useEffect } from 'react';
import { ChevronDown, Target } from 'lucide-react';
import { metaAdsService, MetaAdsCampaign } from '../services/metaAdsService';

interface AdCampaignPickerProps {
  selectedCampaign: string;
  setSelectedCampaign: (campaign: string) => void;
}

const AdCampaignPicker: React.FC<AdCampaignPickerProps> = ({ 
  selectedCampaign, 
  setSelectedCampaign 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<MetaAdsCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (metaAdsService.isConfigured()) {
      loadCampaigns();
    }
  }, []);

  const loadCampaigns = async () => {
    if (!metaAdsService.isConfigured()) {
      setCampaigns([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const campaignsData = await metaAdsService.getCampaigns();
      setCampaigns(campaignsData);
      
      // Se não há campanha selecionada e há campanhas disponíveis, selecionar a primeira
      if (!selectedCampaign && campaignsData.length > 0) {
        setSelectedCampaign(campaignsData[0].id);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Erro ao carregar campanhas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    setIsOpen(false);
  };

  const getSelectedCampaignName = () => {
    if (!selectedCampaign) return 'Selecionar Anúncio';
    
    const campaign = campaigns.find(c => c.id === selectedCampaign);
    return campaign ? campaign.name : 'Anúncio Selecionado';
  };

  const isConnected = metaAdsService.isConfigured();

  return (
    <div className="relative">
      <button
        onClick={() => isConnected && setIsOpen(!isOpen)}
        disabled={!isConnected || loading}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-[200px] ${
          isConnected 
            ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 hover:border-gray-500' 
            : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
        }`}
        title={isConnected ? 'Selecionar anúncio do Meta Ads' : 'Conecte o Meta Ads primeiro'}
      >
        <Target className={`w-4 h-4 ${isConnected ? 'text-blue-400' : 'text-gray-500'}`} />
        <span className="truncate">
          {loading ? 'Carregando...' : getSelectedCampaignName()}
        </span>
        {isConnected && !loading && (
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
          !selectedCampaign 
            ? 'bg-gray-500' 
            : 'bg-green-500 shadow-lg shadow-green-500/50'
        }`}></div>
      </button>

      {isOpen && isConnected && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
          <div className="p-2">
            {error ? (
              <div className="text-red-400 text-sm p-2 text-center">
                {error}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-gray-400 text-sm p-2 text-center">
                Nenhuma campanha encontrada
              </div>
            ) : (
              <div className="space-y-1">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => handleCampaignSelect(campaign.id)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                      selectedCampaign === campaign.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium truncate">{campaign.name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {campaign.status} • {campaign.objective}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay para fechar ao clicar fora */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default AdCampaignPicker; 
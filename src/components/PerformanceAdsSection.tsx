import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointer, 
  DollarSign, 
  Target, 
  Play, 
  Pause,
  BarChart3,
  Crown,
  Star,
  Zap,
  MoreVertical,
  Settings,
  Download,
  Share2,
  ArrowLeft
} from 'lucide-react';

interface AdMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
  spend: number;
  revenue: number;
}

interface AdData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  status: 'active' | 'paused' | 'draft';
  rank: number;
  metrics: AdMetrics;
  trend: 'up' | 'down' | 'stable';
  category: string;
  lastUpdated: string;
}

interface PerformanceAdsSectionProps {
  onBack?: () => void;
}

const mockAds: AdData[] = [
  {
    id: '1',
    title: 'Premium Tech Gadgets',
    description: 'Discover the latest in cutting-edge technology with exclusive deals',
    imageUrl: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&h=300&fit=crop',
    status: 'active',
    rank: 1,
    metrics: {
      impressions: 125000,
      clicks: 3750,
      ctr: 3.0,
      cpc: 1.25,
      conversions: 187,
      roas: 4.2,
      spend: 4687.50,
      revenue: 19687.50
    },
    trend: 'up',
    category: 'Technology',
    lastUpdated: '2 hours ago'
  },
  {
    id: '2',
    title: 'Fashion Forward Collection',
    description: 'Trendy styles for the modern professional',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    status: 'active',
    rank: 2,
    metrics: {
      impressions: 98000,
      clicks: 2940,
      ctr: 3.0,
      cpc: 0.95,
      conversions: 147,
      roas: 3.8,
      spend: 2793.00,
      revenue: 10613.40
    },
    trend: 'up',
    category: 'Fashion',
    lastUpdated: '4 hours ago'
  },
  {
    id: '3',
    title: 'Home & Garden Essentials',
    description: 'Transform your space with premium home solutions',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
    status: 'paused',
    rank: 3,
    metrics: {
      impressions: 87500,
      clicks: 2187,
      ctr: 2.5,
      cpc: 1.10,
      conversions: 109,
      roas: 3.2,
      spend: 2405.70,
      revenue: 7698.24
    },
    trend: 'down',
    category: 'Home',
    lastUpdated: '1 day ago'
  },
  {
    id: '4',
    title: 'Fitness & Wellness Pro',
    description: 'Transform your lifestyle with premium fitness solutions',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
    status: 'active',
    rank: 4,
    metrics: {
      impressions: 75000,
      clicks: 2250,
      ctr: 3.0,
      cpc: 0.85,
      conversions: 135,
      roas: 4.5,
      spend: 1912.50,
      revenue: 8606.25
    },
    trend: 'up',
    category: 'Fitness',
    lastUpdated: '6 hours ago'
  },
  {
    id: '5',
    title: 'Digital Marketing Solutions',
    description: 'Boost your business with our comprehensive digital marketing packages',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    status: 'active',
    rank: 5,
    metrics: {
      impressions: 65000,
      clicks: 1950,
      ctr: 3.0,
      cpc: 1.50,
      conversions: 117,
      roas: 3.9,
      spend: 2925.00,
      revenue: 11407.50
    },
    trend: 'stable',
    category: 'Marketing',
    lastUpdated: '8 hours ago'
  },
  {
    id: '6',
    title: 'Luxury Travel Experiences',
    description: 'Exclusive travel packages for discerning travelers',
    imageUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop',
    status: 'draft',
    rank: 6,
    metrics: {
      impressions: 45000,
      clicks: 1350,
      ctr: 3.0,
      cpc: 2.20,
      conversions: 81,
      roas: 2.8,
      spend: 2970.00,
      revenue: 8316.00
    },
    trend: 'down',
    category: 'Travel',
    lastUpdated: '2 days ago'
  }
];

const PerformanceAdsSection: React.FC<PerformanceAdsSectionProps> = ({ onBack }) => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [hoveredAd, setHoveredAd] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<string | null>(null);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Star className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Zap className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-slate-400">#{rank}</span>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <BarChart3 className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'paused':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'draft':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const filteredAds = mockAds.filter(ad => {
    switch (selectedTab) {
      case 'active':
        return ad.status === 'active';
      case 'paused':
        return ad.status === 'paused';
      case 'top':
        return ad.rank <= 3;
      default:
        return true;
    }
  });

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          {onBack && (
            <div className="flex justify-start mb-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg transition-all duration-300 border border-slate-700/50"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Dashboard
              </button>
            </div>
          )}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full border border-purple-500/20">
            <Target className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Performance Analytics</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Anúncios por Performance
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Acompanhe o desempenho dos seus anúncios em tempo real com métricas avançadas e insights acionáveis
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total de Anúncios</p>
                <p className="text-2xl font-bold text-white">{mockAds.length}</p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Anúncios Ativos</p>
                <p className="text-2xl font-bold text-green-400">
                  {mockAds.filter(ad => ad.status === 'active').length}
                </p>
              </div>
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Play className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">ROAS Médio</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {(mockAds.reduce((acc, ad) => acc + ad.metrics.roas, 0) / mockAds.length).toFixed(1)}x
                </p>
              </div>
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Receita Total</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatCurrency(mockAds.reduce((acc, ad) => acc + ad.metrics.revenue, 0))}
                </p>
              </div>
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { value: 'all', label: 'Todos', color: 'from-slate-600 to-slate-500' },
            { value: 'active', label: 'Ativos', color: 'from-green-500 to-emerald-500' },
            { value: 'paused', label: 'Pausados', color: 'from-orange-500 to-red-500' },
            { value: 'top', label: 'Top Performance', color: 'from-yellow-500 to-amber-500' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedTab(tab.value)}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                selectedTab === tab.value
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 border border-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ads Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAds.map((ad) => (
            <div
              key={ad.id}
              className={`group relative overflow-hidden bg-gradient-to-br from-slate-800/80 via-slate-800 to-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 ${
                hoveredAd === ad.id ? 'ring-2 ring-purple-500/50' : ''
              }`}
              onMouseEnter={() => setHoveredAd(ad.id)}
              onMouseLeave={() => setHoveredAd(null)}
            >
              {/* Rank Badge */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                {getRankIcon(ad.rank)}
                <span className="text-sm font-semibold text-white">#{ad.rank}</span>
              </div>

              {/* Status Badge */}
              <div className="absolute top-4 right-4 z-10">
                <div className={`px-3 py-1 rounded-full border backdrop-blur-sm ${getStatusColor(ad.status)}`}>
                  <div className="flex items-center gap-1">
                    {ad.status === 'active' ? (
                      <Play className="w-3 h-3" />
                    ) : ad.status === 'paused' ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Settings className="w-3 h-3" />
                    )}
                    <span className="text-xs font-medium">
                      {ad.status === 'active' ? 'Ativo' : ad.status === 'paused' ? 'Pausado' : 'Rascunho'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ad Preview */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={ad.imageUrl}
                  alt={ad.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                        {ad.title}
                      </h3>
                      {getTrendIcon(ad.trend)}
                    </div>
                    <button
                      onClick={() => setSelectedAd(selectedAd === ad.id ? null : ad.id)}
                      className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {ad.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="px-2 py-1 bg-slate-700/50 rounded-full">{ad.category}</span>
                    <span>{ad.lastUpdated}</span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-slate-400">Impressões</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {formatNumber(ad.metrics.impressions)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-slate-400">CTR</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {ad.metrics.ctr.toFixed(1)}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-yellow-400" />
                      <span className="text-xs text-slate-400">ROAS</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {ad.metrics.roas.toFixed(1)}x
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-slate-400">Conversões</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {ad.metrics.conversions}
                    </p>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Performance Score</span>
                    <span className="text-white font-medium">
                      {Math.round((ad.metrics.roas / 5) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/30 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(ad.metrics.roas / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Revenue & Spend */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Gasto</p>
                    <p className="text-sm font-semibold text-red-400">
                      {formatCurrency(ad.metrics.spend)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Receita</p>
                    <p className="text-sm font-semibold text-green-400">
                      {formatCurrency(ad.metrics.revenue)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300">
                    Ver Detalhes
                  </button>
                  <button className="px-4 py-2 border border-slate-600 text-slate-300 hover:bg-slate-700/50 rounded-lg font-medium transition-all duration-300">
                    {ad.status === 'active' ? 'Pausar' : 'Ativar'}
                  </button>
                </div>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredAds.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">Nenhum anúncio encontrado</h3>
            <p className="text-slate-400">Não há anúncios que correspondam aos filtros selecionados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceAdsSection; 
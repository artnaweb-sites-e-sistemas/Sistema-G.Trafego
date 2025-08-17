import React, { useState, useEffect } from 'react';

interface RateLimitStatus {
  userId: string;
  isActive: boolean;
  remainingTime?: number;
  canMakeRequest: boolean;
}

interface RateLimitManagerProps {
  isAdmin?: boolean;
}

const RateLimitManager: React.FC<RateLimitManagerProps> = ({ isAdmin = false }) => {
  const [rateLimits, setRateLimits] = useState<RateLimitStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserStatus, setCurrentUserStatus] = useState<RateLimitStatus | null>(null);

  // Verificar status do usuário atual
  const checkCurrentUserStatus = async () => {
    if ((window as any).metaAdsService?.getUserRateLimitStatus) {
      try {
        const status = await (window as any).metaAdsService.getUserRateLimitStatus();
        setCurrentUserStatus(status);
      } catch (error) {
        console.error('Erro ao verificar status do usuário atual:', error);
      }
    }
  };

  // Verificar todos os rate limits (admin)
  const checkAllRateLimits = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      const allKeys = Object.keys(localStorage);
      const globalRateLimitKeys = allKeys.filter(key => key.includes('metaAdsGlobalRateLimit_'));
      
      const statuses: RateLimitStatus[] = [];
      
      for (const key of globalRateLimitKeys) {
        const userId = key.replace('metaAdsGlobalRateLimit_', '');
        if ((window as any).metaAdsService?.getUserRateLimitStatus) {
          const status = await (window as any).metaAdsService.getUserRateLimitStatus(userId);
          statuses.push(status);
        }
      }
      
      setRateLimits(statuses);
    } catch (error) {
      console.error('Erro ao verificar rate limits:', error);
    } finally {
      setLoading(false);
    }
  };

  // Resetar rate limit do usuário atual
  const resetCurrentUserRateLimit = async () => {
    if ((window as any).metaAdsService?.resetApiRateLimit) {
      try {
        (window as any).metaAdsService.resetApiRateLimit();
        await checkCurrentUserStatus();
        console.log('✅ Rate limit do usuário atual resetado');
      } catch (error) {
        console.error('Erro ao resetar rate limit:', error);
      }
    }
  };

  // Resetar todos os rate limits (admin)
  const resetAllRateLimits = async () => {
    if (!isAdmin) return;
    
    if ((window as any).metaAdsService?.resetAllUsersRateLimit) {
      try {
        (window as any).metaAdsService.resetAllUsersRateLimit();
        await checkAllRateLimits();
        console.log('✅ Todos os rate limits resetados');
      } catch (error) {
        console.error('Erro ao resetar rate limits:', error);
      }
    }
  };

  useEffect(() => {
    checkCurrentUserStatus();
    if (isAdmin) {
      checkAllRateLimits();
    }
  }, [isAdmin]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (!isAdmin && !currentUserStatus) {
    return null; // Não mostrar para usuários não-admin se não há status
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        🚨 Gerenciador de Rate Limits
      </h3>

      {/* Status do Usuário Atual */}
      {currentUserStatus && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Seu Status:</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Usuário: <span className="font-mono text-xs">{currentUserStatus.userId}</span>
              </p>
              <p className="text-sm text-gray-600">
                Status: 
                <span className={`ml-1 px-2 py-1 rounded text-xs ${
                  currentUserStatus.isActive 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {currentUserStatus.isActive ? 'Bloqueado' : 'Liberado'}
                </span>
              </p>
              {currentUserStatus.isActive && currentUserStatus.remainingTime && (
                <p className="text-sm text-red-600">
                  Tempo restante: {formatTime(currentUserStatus.remainingTime)}
                </p>
              )}
            </div>
            {currentUserStatus.isActive && (
              <button
                onClick={resetCurrentUserRateLimit}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Resetar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista de Todos os Usuários (Admin) */}
      {isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-700">Todos os Usuários:</h4>
            <div className="flex gap-2">
              <button
                onClick={checkAllRateLimits}
                disabled={loading}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Carregando...' : 'Atualizar'}
              </button>
              <button
                onClick={resetAllRateLimits}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
              >
                Resetar Todos
              </button>
            </div>
          </div>

          {rateLimits.length > 0 ? (
            <div className="space-y-2">
              {rateLimits.map((status, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-mono text-gray-700">{status.userId}</p>
                    <p className="text-xs text-gray-500">
                      Status: 
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs ${
                        status.isActive 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {status.isActive ? 'Bloqueado' : 'Liberado'}
                      </span>
                    </p>
                    {status.isActive && status.remainingTime && (
                      <p className="text-xs text-red-600">
                        Restante: {formatTime(status.remainingTime)}
                      </p>
                    )}
                  </div>
                  {status.isActive && (
                    <button
                      onClick={() => {
                        if ((window as any).metaAdsService?.getUserRateLimitStatus) {
                          (window as any).metaAdsService.getUserRateLimitStatus(status.userId)
                            .then(() => checkAllRateLimits());
                        }
                      }}
                      className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                    >
                      Resetar
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum rate limit ativo encontrado.</p>
          )}
        </div>
      )}

      {/* Informações para Multi-Usuário */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">ℹ️ Informações para Multi-Usuário:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Cada usuário tem seu próprio rate limit independente</li>
          <li>• Rate limits são baseados no ID do usuário, conta ou cliente</li>
          <li>• Cache é isolado por usuário para evitar conflitos</li>
          <li>• Admins podem resetar rate limits de todos os usuários</li>
        </ul>
      </div>
    </div>
  );
};

export default RateLimitManager;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import { migrationService } from '../services/migrationService';
import { authService } from '../services/authService';

const MigrationStatus: React.FC = () => {
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'running' | 'completed' | 'error'>('pending');
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [hasDataToMigrate, setHasDataToMigrate] = useState(false);

  useEffect(() => {
    const checkMigrationStatus = async () => {
      const user = authService.getCurrentUser();
      if (!user) return;

      const status = migrationService.getMigrationStatus();
      const hasData = await migrationService.hasDataToMigrate();

      setHasDataToMigrate(hasData);

      // Mostrar banner se há dados para migrar e a migração não foi concluída
      if (hasData && !status.completed) {
        setShowMigrationBanner(true);
      }
    };

    // Verificar apenas após um breve delay para garantir que o usuário está carregado
    setTimeout(checkMigrationStatus, 2000);
  }, []);

  const handleMigrate = async () => {
    setMigrationStatus('running');
    
    try {
      const result = await migrationService.migrateAllData();
      setMigrationResult(result);
      
      if (result.success) {
        setMigrationStatus('completed');
        // Ocultar banner após sucesso
        setTimeout(() => {
          setShowMigrationBanner(false);
        }, 5000);
      } else {
        setMigrationStatus('error');
      }
    } catch (error) {
      console.error('Erro durante migração:', error);
      setMigrationStatus('error');
    }
  };

  const handleDismiss = () => {
    setShowMigrationBanner(false);
  };

  if (!showMigrationBanner || !hasDataToMigrate) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5" />
              <div>
                <h4 className="font-semibold text-sm">
                  {migrationStatus === 'pending' && 'Migração de Dados Disponível'}
                  {migrationStatus === 'running' && 'Migrando seus dados...'}
                  {migrationStatus === 'completed' && 'Migração Concluída!'}
                  {migrationStatus === 'error' && 'Erro na Migração'}
                </h4>
                <p className="text-xs text-blue-100">
                  {migrationStatus === 'pending' && 'Seus dados podem ser salvos na nuvem para acesso em qualquer dispositivo.'}
                  {migrationStatus === 'running' && 'Aguarde enquanto transferimos seus dados para a nuvem...'}
                  {migrationStatus === 'completed' && `${migrationResult?.totalMigrated || 0} itens migrados com sucesso! Agora seus dados estão seguros na nuvem.`}
                  {migrationStatus === 'error' && 'Houve um problema na migração. Seus dados locais estão seguros.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {migrationStatus === 'pending' && (
                <button
                  onClick={handleMigrate}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Cloud className="h-4 w-4" />
                  Migrar Agora
                </button>
              )}

              {migrationStatus === 'running' && (
                <div className="flex items-center gap-2 px-4 py-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Migrando...</span>
                </div>
              )}

              {migrationStatus === 'completed' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Sucesso!</span>
                </div>
              )}

              {migrationStatus === 'error' && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-200" />
                  <button
                    onClick={handleMigrate}
                    className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}

              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Detalhes da migração */}
          {migrationStatus === 'completed' && migrationResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 pt-2 border-t border-white/20"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-blue-100">Estratégias:</span>
                  <span className="ml-1 font-semibold">{migrationResult.strategiesMigrated}</span>
                </div>
                <div>
                  <span className="text-blue-100">Links:</span>
                  <span className="ml-1 font-semibold">{migrationResult.linksMigrated}</span>
                </div>
                <div>
                  <span className="text-blue-100">Benchmarks:</span>
                  <span className="ml-1 font-semibold">{migrationResult.benchmarksMigrated}</span>
                </div>
                <div>
                  <span className="text-blue-100">Detalhes:</span>
                  <span className="ml-1 font-semibold">{migrationResult.detailsMigrated}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Erros da migração */}
          {migrationStatus === 'error' && migrationResult?.errors && migrationResult.errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 pt-2 border-t border-white/20"
            >
              <p className="text-xs text-red-200">
                Erros: {migrationResult.errors.slice(0, 2).join(', ')}
                {migrationResult.errors.length > 2 && '...'}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MigrationStatus;

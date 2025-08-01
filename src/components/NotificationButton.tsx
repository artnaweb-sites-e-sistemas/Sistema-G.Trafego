import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

interface NotificationButtonProps {
  selectedClient: string;
  selectedProduct: string;
  selectedAudience: string;
  selectedCampaign: string;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({
  selectedClient,
  selectedProduct,
  selectedAudience,
  selectedCampaign
}) => {
  const [hasNotifications, setHasNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Simular notificações baseadas nas seleções
  useEffect(() => {
    const hasSpecificSelections = selectedClient !== 'Todos os Clientes' || 
                                 selectedProduct !== 'Todos os Produtos' || 
                                 selectedAudience !== 'Todos os Públicos' || 
                                 selectedCampaign !== '';
    
    // Contar quantas seleções específicas existem
    let count = 0;
    if (selectedClient !== 'Todos os Clientes') count++;
    if (selectedProduct !== 'Todos os Produtos') count++;
    if (selectedAudience !== 'Todos os Públicos') count++;
    if (selectedCampaign !== '') count++;
    
    setHasNotifications(hasSpecificSelections);
    setNotificationCount(count);
    
    console.log('NotificationButton - Status:', {
      selectedClient,
      selectedProduct,
      selectedAudience,
      selectedCampaign,
      hasSpecificSelections,
      count,
      hasNotifications
    });
  }, [selectedClient, selectedProduct, selectedAudience, selectedCampaign]);

  const handleClick = () => {
    console.log('NotificationButton clicado!');
    console.log('Estado atual:', {
      hasNotifications,
      notificationCount,
      selectedClient,
      selectedProduct,
      selectedAudience,
      selectedCampaign
    });
    
    alert(`Notificações: ${hasNotifications ? 'ATIVAS' : 'INATIVAS'}\nContagem: ${notificationCount}\n\nSeleções:\n- Cliente: ${selectedClient}\n- Produto: ${selectedProduct}\n- Público: ${selectedAudience}\n- Anúncio: ${selectedCampaign || 'Nenhum'}`);
  };

  return (
    <button 
      onClick={handleClick}
      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 group relative"
      title={hasNotifications ? `Há ${notificationCount} notificação(s) ativa(s)` : 'Sem notificações'}
    >
      <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
      
      {/* Indicador de Status */}
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
        hasNotifications 
          ? 'bg-green-500 shadow-lg shadow-green-500/50' 
          : 'bg-gray-500'
      }`}></div>
      
      {/* Contador de notificações (opcional) */}
      {hasNotifications && notificationCount > 0 && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
          {notificationCount > 9 ? '9+' : notificationCount}
        </div>
      )}
    </button>
  );
};

export default NotificationButton; 
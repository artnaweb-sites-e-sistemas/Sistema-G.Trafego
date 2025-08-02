# Dashboard Analytics Moderno

Um dashboard moderno e responsivo para análise de métricas de marketing digital, com integração ao Meta Ads e Firebase.

## 🚀 Funcionalidades

- **Dashboard Moderno**: Interface limpa e responsiva com Tailwind CSS
- **Integração Meta Ads**: Sincronização automática de dados do Facebook Ads
- **Firebase Integration**: Armazenamento seguro de dados na nuvem
- **Métricas em Tempo Real**: Visualização de leads, receita, investimento e ROI
- **Filtros Dinâmicos**: Filtro por mês e serviço
- **Gráficos Interativos**: Visualizações de dados com insights

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Backend**: Firebase (Firestore)
- **Integração**: Meta Ads API
- **Ícones**: Lucide React

## 📦 Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd dashboard-analytics
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto:
```env
REACT_APP_FACEBOOK_APP_ID=seu_app_id_aqui
```

4. **Execute o projeto**
```bash
npm run dev
```

## 🔧 Configuração do Meta Ads

Para usar a integração com Meta Ads, siga o guia completo em [META_ADS_SETUP.md](./META_ADS_SETUP.md).

### Resumo rápido:
1. Crie um app no [Facebook Developers](https://developers.facebook.com/)
2. Configure as permissões `ads_read` e `ads_management`
3. Adicione o App ID no arquivo `.env`
4. Configure os domínios válidos no Facebook Developers Console

## 📊 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── Header.tsx      # Header com filtros e Meta Ads
│   ├── MetricsGrid.tsx # Grid de métricas principais
│   ├── MetaAdsConfig.tsx # Configuração do Meta Ads
│   └── ...
├── services/           # Serviços de API
│   ├── metaAdsService.ts # Integração Meta Ads
│   ├── metricsService.ts # Serviço de métricas
│   └── ...
├── config/            # Configurações
│   └── firebase.ts    # Configuração Firebase
└── hooks/             # Custom hooks
    └── useFirestore.ts
```

## 🔥 Firebase Setup

O projeto já está configurado com Firebase. As configurações estão em `src/config/firebase.ts`.

Para configurar seu próprio projeto:
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative o Firestore Database
3. Substitua as configurações em `src/config/firebase.ts`

## 📈 Métricas Disponíveis

- **Leads**: Número de leads gerados
- **Receita**: Receita estimada baseada em leads
- **Investimento**: Valor investido em campanhas
- **Impressões**: Número de impressões
- **Cliques**: Número de cliques
- **CTR**: Taxa de cliques
- **CPM**: Custo por mil impressões
- **CPL**: Custo por lead
- **ROAS**: Retorno sobre investimento em anúncios
- **ROI**: Retorno sobre investimento
- **Agendamentos**: Estimativa de agendamentos (60% dos leads)
- **Vendas**: Estimativa de vendas (30% dos leads)

## 🎨 Customização

### Cores
As cores podem ser customizadas no arquivo `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          600: '#7c3aed', // Roxo principal
        }
      }
    }
  }
}
```

### Componentes
Todos os componentes estão em `src/components/` e podem ser facilmente modificados.

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Netlify
1. Build: `npm run build`
2. Publish directory: `dist`
3. Configure as variáveis de ambiente

## 🔒 Segurança

- App ID do Facebook é público (seguro)
- Access tokens são armazenados temporariamente
- Use HTTPS em produção
- Configure domínios válidos no Facebook Developers

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para dúvidas sobre:
- **Meta Ads**: Consulte [META_ADS_SETUP.md](./META_ADS_SETUP.md)
- **Firebase**: Consulte a [documentação oficial](https://firebase.google.com/docs)
- **React/Vite**: Consulte a [documentação oficial](https://vitejs.dev/)

## 🔄 Changelog

### v1.0.0
- Dashboard inicial com métricas básicas
- Integração com Meta Ads
- Integração com Firebase
- Interface responsiva com Tailwind CSS 
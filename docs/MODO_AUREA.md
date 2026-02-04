# 🦅 Modo Áurea - Manual de Operações

Bem-vindo ao **Modo Áurea**, a nova arquitetura do Sistema de Gestão de Tráfego focada em velocidade de decisão e clareza estratégia. Este documento serve como guia oficial para uso das novas funcionalidades e referência das regras de automação.

## 🧠 Lógica de Decisão Automática

O sistema agora opera com 4 "Guardrails" (regras de proteção) automáticas que monitoram as campanhas 24/7.

### 1. Regra Tiririca 🤡 (Stop Loss)
**"Pior que tá não fica"** - Proteção contra queima de verba.
- **Gatilho:** Se um conjunto gastou **3x o CPA Ideal** e gerou **0 conversões**.
- **Ação Recomendada:** Pausar imediatamente.
- **Status:** 🔴 CRÍTICO

### 2. Regra Bonanza 🤠 (Scale Up)
**"Achou ouro"** - Identificação de oportunidades de escala.
- **Gatilho:** Se o CPA atual é **< 80% do CPA Alvo** (20% mais barato) E tem volume significativo.
- **Ação Recomendada:** Aumentar orçamento em 20%.
- **Status:** 🟢 OPORTUNIDADE

### 3. Regra de Discrepância 🔎
Proteção contra falhas de pixel/tracking.
- **Gatilho:** Se [Leads Meta] > [Leads CRM] + 30% (margem erro).
- **Ação Recomendada:** Auditar pixel e eventos.
- **Status:** 🟡 ALERTA

### 4. Regra de Benchmark 📊
Diagnóstico de saúde do funil.
- **Gatilho:** CTR < 1% OU Taxa de Conversão da LP < 10%.
- **Ação Recomendada:** Trocar criativo (se CTR baixo) ou otimizar LP (se Conv. baixa).
- **Status:** 🟡 ALERTA

---

## 🧭 Navegação por Abas (Workflow)

O Dashboard foi reorganizado em 6 abas que seguem o fluxo de trabalho natural de um gestor de tráfego.

### 1. ⚡ Hoje (Decisão Rápida)
**Foco:** O que preciso fazer AGORA?
- Painel Áurea: Mostra alertas, orçamento restante e projeção.
- Grid de Métricas Compacto: Os 6 KPIs que importam (Investimento, CPL, Leads, CPV, Vendas, ROI).

### 2. 📅 Dia (Controle Diário)
**Foco:** Acompanhamento granular.
- Tabela dia-a-dia do mês atual.
- Identificação de padrões diários e sazonalidade semanal.

### 3. 📈 Mês (Visão Macro)
**Foco:** Cumprimento de metas mensais.
- Comparativos Mês a Mês.
- Análise de tendências de longo prazo.

### 4. 🎨 Assets (Criativos e Públicos)
**Foco:** O que está funcionando?
- Tabela de performance por Criativo.
- Tabela de performance por Público.
- Status de validação de novos testes.

### 5. 🎯 Estratégia
**Foco:** Planejamento e Inteligência.
- Criação e edição de Estratégias (Lançamento, Perpétuo, Negócio Local).
- Planejamento de Orçamento (Distribuição de Verba).
- Configuração de Remarketing (Funil de perseguição).

### 6. 👤 Cliente (Relatórios)
**Foco:** Transparência.
- **ShareReport:** Gerador de links públicos.
- Permite compartilhar apenas o que importa com o cliente, sem dar acesso ao Business Manager.
- **Novidade:** Sincronização de dados manuais (Vendas/Agendamentos) no link compartilhado.

---

## 💡 Recursos Avançados

### Cálculo de Pacing
O sistema calcula automaticamente se você está acelerado ou atrasado no orçamento:
- **On Track:** Gasto projetado = Orçamento ideal (±5%)
- **Overspending:** Projetado > Orçamento (Risco de faltar verba)
- **Underspending:** Projetado < Orçamento (Risco de sobrar verba/não bater meta)

### Inputs Manuais
Para clientes onde o pixel não pega a conversão final (ex: Negócios Locais, WPP Direto):
- Use a **Tabela de Detalhes Mensais** na aba "Mês" para inserir Vendas e Agendamentos reais.
- O sistema recalcula CPV e ROI automaticamente baseado nesses inputs manuais.

// ====== Relatório Estratégico de Campanha (v1) ======
// Entrada mínima: campaignType, productType, investmentBRL, ticketBRL
// Opções: remarketingPercent (0.2 a 0.3), cpcOverride, convOverrides

import { getRemarketingShare } from '../utils/budget';

type CampaignType = "sazonal" | "recorrente";
type ProductType =
  | "curso online"
  | "curso presencial"
  | "mentoria online"
  | "mentoria presencial"
  | "retiro imersao congresso"
  | "servico online"
  | "servico presencial"
  | "produto digital baixo"
  | "produto digital medio_alto"
  | "assinatura clube"
  | "ecommerce baixo medio"
  | "ecommerce alto"
  | "imovel investimento"
  | "sem_produto";

type TicketBand = "baixo" | "medio" | "alto";

type StrategyType = "lp_whatsapp" | "whatsapp_direto" | "lp_direto" | "impulsionar_post";

interface Inputs {
  campaignType: CampaignType;
  productType: ProductType;
  investmentBRL: number; // ex: 3550
  ticketBRL: number;     // ex: 3550
  objective?: string;    // ex: "crescimento_audiencia"
  strategyType?: StrategyType; // Nova: tipo de estratégia selecionada
  forceStrategy?: boolean; // Se true, não substitui a estratégia automaticamente
  remarketingPercent?: number; // 0.2 a 0.3 (default 0.2)
  cpcOverride?: { min: number; max: number }; // em R$
  convOverrides?: Partial<{
    lpToLeadMin: number; lpToLeadMax: number;   // 0.01 = 1%
    leadToSaleMin: number; leadToSaleMax: number;
    directSaleMin: number; directSaleMax: number;
    whatsappChatMin: number; whatsappChatMax: number; // Nova: conversão para chat WhatsApp
    whatsappSaleMin: number; whatsappSaleMax: number; // Nova: conversão chat para venda
  }>;
}

interface Sections {
  opcoesEstrategia: string;
  estrategiaRecomendada: string;
  margemRisco: string;
  proximosPassos: string;
}

export interface StrategyReportOutput {
  inputs: Inputs;
  metrics: {
    ticketBand: TicketBand;
    strategyType: StrategyType;
    cpcMin: number; cpcMax: number;
    dailyProspectionBRLMin: number; // verba diária líquida (20–30% remarketing)
    dailyProspectionBRLMax: number;
    dailyRemarketingBRLMin: number;
    dailyRemarketingBRLMax: number;
    clicksMin: number; clicksMax: number;
    accessesMin: number; accessesMax: number;
    leadsMin: number; leadsMax: number;
    salesMin: number; salesMax: number;
    whatsappChatsMin: number; whatsappChatsMax: number;
    revenueMin: number; revenueMax: number;
    roiMin: number; roiMax: number;
    conv: {
      lpToLeadMin: number; lpToLeadMax: number;
      leadToSaleMin: number; leadToSaleMax: number;
      directSaleMin: number; directSaleMax: number;
      whatsappChatMin: number; whatsappChatMax: number;
      whatsappSaleMin: number; whatsappSaleMax: number;
    };
  };
  sections: Sections;
  markdown: string; // documento final para exibir
}

// ---------- Utilidades ----------
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const round = (n: number) => Math.round(n);

// ---------- Faixas por ticket ----------
function getTicketBand(ticketBRL: number): TicketBand {
  if (ticketBRL <= 300) return "baixo";
  if (ticketBRL <= 2000) return "medio";
  return "alto";
}

// ---------- Benchmarks de CPC por tipo de produto ----------
function cpcBench(productType: ProductType): { min: number; max: number } {
  switch (productType) {
    case "retiro imersao congresso":
    case "mentoria presencial":
    case "imovel investimento":
    case "produto digital medio_alto":
    case "ecommerce alto":
      return { min: 3.0, max: 6.0 }; // Premium/segmentado
    case "servico presencial":
    case "mentoria online":
    case "servico online":
      return { min: 1.5, max: 3.5 }; // Serviços
    case "curso presencial":
      return { min: 1.5, max: 3.0 };
    case "curso online":
    case "produto digital baixo":
    case "ecommerce baixo medio":
    case "assinatura clube":
      return { min: 1.0, max: 2.5 }; // Volume/escala
    default:
      return { min: 1.5, max: 3.5 };
  }
}

// ---------- Benchmarks de conversão por faixa de ticket e estratégia ----------
function convBenchByTicketAndStrategy(band: TicketBand, strategyType: StrategyType = "lp_whatsapp") {
  if (band === "baixo") {
    if (strategyType === "lp_whatsapp") {
      return {
        lpToLeadMin: 0.15, lpToLeadMax: 0.35,
        leadToSaleMin: 0.05, leadToSaleMax: 0.10,
        directSaleMin: 0.005, directSaleMax: 0.02,
        whatsappChatMin: 0.03, whatsappChatMax: 0.08,
        whatsappSaleMin: 0.05, whatsappSaleMax: 0.10
      };
    } else if (strategyType === "whatsapp_direto") {
      return {
        lpToLeadMin: 0.02, lpToLeadMax: 0.05,
        leadToSaleMin: 0.05, leadToSaleMax: 0.10,
        directSaleMin: 0.005, directSaleMax: 0.02,
        whatsappChatMin: 0.30, whatsappChatMax: 0.60,
        whatsappSaleMin: 0.02, whatsappSaleMax: 0.10
      };
    } else { // lp_direto
      return {
        lpToLeadMin: 0.02, lpToLeadMax: 0.05,
        leadToSaleMin: 0.05, leadToSaleMax: 0.10,
        directSaleMin: 0.005, directSaleMax: 0.05,
        whatsappChatMin: 0.03, whatsappChatMax: 0.08,
        whatsappSaleMin: 0.05, whatsappSaleMax: 0.10
      };
    }
  }

  if (band === "medio") {
    if (strategyType === "lp_whatsapp") {
      return {
        lpToLeadMin: 0.12, lpToLeadMax: 0.25,
        leadToSaleMin: 0.10, leadToSaleMax: 0.20,
        directSaleMin: 0.005, directSaleMax: 0.01,
        whatsappChatMin: 0.02, whatsappChatMax: 0.05,
        whatsappSaleMin: 0.10, whatsappSaleMax: 0.15
      };
    } else if (strategyType === "whatsapp_direto") {
      return {
        lpToLeadMin: 0.02, lpToLeadMax: 0.03,
        leadToSaleMin: 0.10, leadToSaleMax: 0.20,
        directSaleMin: 0.005, directSaleMax: 0.01,
        whatsappChatMin: 0.25, whatsappChatMax: 0.50,
        whatsappSaleMin: 0.10, whatsappSaleMax: 0.15
      };
    } else { // lp_direto
      return {
        lpToLeadMin: 0.02, lpToLeadMax: 0.03,
        leadToSaleMin: 0.10, leadToSaleMax: 0.20,
        directSaleMin: 0.008, directSaleMax: 0.03,
        whatsappChatMin: 0.02, whatsappChatMax: 0.05,
        whatsappSaleMin: 0.10, whatsappSaleMax: 0.15
      };
    }
  }

  // alto
  if (strategyType === "lp_whatsapp") {
    return {
      lpToLeadMin: 0.08, lpToLeadMax: 0.18,
      leadToSaleMin: 0.20, leadToSaleMax: 0.30,
      directSaleMin: 0.002, directSaleMax: 0.005,
      whatsappChatMin: 0.01, whatsappChatMax: 0.03,
      whatsappSaleMin: 0.10, whatsappSaleMax: 0.20
    };
  } else if (strategyType === "whatsapp_direto") {
    return {
      lpToLeadMin: 0.01, lpToLeadMax: 0.015,
      leadToSaleMin: 0.20, leadToSaleMax: 0.30,
      directSaleMin: 0.002, directSaleMax: 0.005,
      whatsappChatMin: 0.20, whatsappChatMax: 0.40,
      whatsappSaleMin: 0.10, whatsappSaleMax: 0.20
    };
  } else { // lp_direto
    return {
      lpToLeadMin: 0.01, lpToLeadMax: 0.015,
      leadToSaleMin: 0.20, leadToSaleMax: 0.30,
      directSaleMin: 0.003, directSaleMax: 0.015,
      whatsappChatMin: 0.01, whatsappChatMax: 0.03,
      whatsappSaleMin: 0.10, whatsappSaleMax: 0.20
    };
  }
}

// ---------- Função de compatibilidade (mantém código existente funcionando) ----------
// function convBenchByTicket(band: TicketBand) {
//   return convBenchByTicketAndStrategy(band, "lp_whatsapp");
// }

// ---------- Estratégia recomendada por contexto ----------
export function pickRecommendedOption(ticketBand: TicketBand, productType: ProductType, campaignType: CampaignType) {
  console.log('🔍 [PICK_RECOMMENDED] Dados recebidos:', {
    ticketBand,
    productType,
    campaignType
  });

  // Opções: 1) LP → WhatsApp, 2) WhatsApp direto, 3) LP direto (checkout)

  // Casos especiais para produtos "híbridos"
  if (productType === "assinatura clube") {
    const result = ticketBand === "baixo" ? "lp_direto" : "lp_whatsapp";
    console.log('🔍 [PICK_RECOMMENDED] Assinatura clube:', result);
    return result;
  }

  if (productType === "curso online" && ticketBand === "medio") {
    console.log('🔍 [PICK_RECOMMENDED] Curso online médio:', "lp_whatsapp");
    return "lp_whatsapp";
  }

  if (ticketBand === "alto") {
    console.log('🔍 [PICK_RECOMMENDED] Ticket alto:', "lp_whatsapp");
    return "lp_whatsapp";
  }

  if (ticketBand === "baixo") {
    // produtos simples, escala
    if (["curso online", "produto digital baixo", "ecommerce baixo medio"].includes(productType)) {
      console.log('🔍 [PICK_RECOMMENDED] Ticket baixo - produto simples:', "lp_direto");
      return "lp_direto";
    }
    console.log('🔍 [PICK_RECOMMENDED] Ticket baixo - outros:', "whatsapp_direto");
    return "whatsapp_direto";
  }

  // ticket médio
  // serviços e mentoria geralmente funcionam melhor com LP → WhatsApp
  if (["servico online", "servico presencial", "mentoria online", "mentoria presencial"].includes(productType)) {
    console.log('🔍 [PICK_RECOMMENDED] Serviço/Mentoria:', "lp_whatsapp");
    return "lp_whatsapp";
  }

  // cursos médios podem ir direto pra LP ou LP→Zap
  if (productType === "curso online" || productType === "curso presencial") {
    const result = campaignType === "sazonal" ? "lp_whatsapp" : "lp_direto";
    console.log('🔍 [PICK_RECOMMENDED] Curso médio:', result);
    return result;
  }

  console.log('🔍 [PICK_RECOMMENDED] Padrão:', "lp_whatsapp");
  return "lp_whatsapp";
}

function renderOpcoesEstrategia(strategyType: StrategyType, objective?: string) {
  if (strategyType === "impulsionar_post") {
    return `## Opções de Estratégia
- **Crescimento de Audiência:** Foco em atrair novos seguidores pelo menor custo possível. Ideal para volume e branding.`;
  }

  // Captura de Lead: LP → Formulário (sem WhatsApp)
  if (objective === 'captura_leads') {
    return `## Opções de Estratégia
- **LP → Formulário:** O tráfego é direcionado a uma Landing Page com formulário de captação. Ideal para gerar leads qualificados sem necessidade de atendimento humano imediato. Funciona bem com ofertas de conteúdo, materiais ricos e inscrições.`;
  }

  if (strategyType === "lp_whatsapp") {
    return `## Opções de Estratégia
- **LP → WhatsApp:** Quem chega no WhatsApp já vem educado pela LP, com maior chance de fechamento. Oferece qualificação sem perder escala, principalmente para tickets médios/altos e vendas consultivas.`;
  } else if (strategyType === "whatsapp_direto") {
    return `## Opções de Estratégia
- **WhatsApp direto:** Gera mais conversas rapidamente, porém com mais curiosos e esforço de atendimento. Prioriza volume de conversas em ofertas simples/rápidas.`;
  } else {
    return `## Opções de Estratégia
- **LP direto (checkout):** Elimina contato humano; exige LP muito forte (preço, prova social, urgência). Funciona melhor quando o ticket é baixo e a oferta é clara, permitindo conversões rápidas em escala.`;
  }
}

function renderEstrategiaRecomendada(campaignType: CampaignType, productType: ProductType, ticketBand: TicketBand, strategyType: StrategyType) {
  let objetivo =
    campaignType === "sazonal"
      ? "Vender dentro do período definido (campanha com urgência)."
      : (ticketBand === "baixo" ? "Escalar em volume com custo controlado." : "Gerar leads qualificados de forma contínua.");

  let publico = "Segmentação por interesses relevantes, lookalike e remarketing.";
  if (productType === "servico presencial") publico = "Segmentação local/regional + interesses específicos + remarketing.";
  if (productType === "retiro imersao congresso") publico = "Público premium (yoga, bem-estar, viagens), lookalike de compradores e remarketing.";
  if (["imovel investimento"].includes(productType)) publico = "Segmentação premium e critérios demográficos/afinidade + remarketing forte.";

  let topo = "";
  let meio = "";
  let fundo = "";
  let comunicacao = "";

  if (strategyType === "impulsionar_post") {
    objetivo = "Crescimento de audiência e atração de novos seguidores.";
    publico = "Base aberta, lookalike de engajamento ou interesses amplos sem remarketing.";
    topo = "Atração (Inconsciente): Reels e Carrossel de alto impacto focados na dor ou desejo central.";
    meio = "Educação (Consciente do Problema): Conteúdo que gera conexão e mostra autoridade sobre o tema.";
    fundo = "Conversão em Seguidor (Consciente da Solução): CTA clara para seguir e acompanhar novos conteúdos.";
    comunicacao = "Tom inspirador e educativo com gatilhos de curiosidade e autoridade.";
  } else if (strategyType === "lp_whatsapp") {
    // LP → WhatsApp
    if (ticketBand === "alto") {
      topo = "Criativos inspiracionais para tráfego à LP.";
      meio = "LP educa e filtra; contato via WhatsApp/call para tirar objeções.";
      fundo = "Remarketing com escassez, depoimentos e bastidores.";
      comunicacao = "Exclusividade, transformação, vagas limitadas.";
    } else if (ticketBand === "baixo") {
      topo = "Anúncio direto para oferta.";
      meio = "LP simples + direcionamento ao WhatsApp.";
      fundo = "Remarketing simples.";
      comunicacao = "Oferta clara, urgência e prova social objetiva.";
    } else {
      // Ticket médio
      topo = "Anúncios com criativos adequados ao público.";
      meio = "LP educa e qualifica; direcionamento ao WhatsApp.";
      fundo = "Remarketing com urgência e prova social.";
      comunicacao = "Tom alinhado ao valor percebido (benefício claro e prova social).";
    }
  } else if (strategyType === "whatsapp_direto") {
    // WhatsApp Direto
    if (ticketBand === "alto") {
      topo = "Criativos que geram interesse imediato.";
      meio = "Link direto para WhatsApp; atendimento qualificado.";
      fundo = "Remarketing com escassez e depoimentos.";
      comunicacao = "Exclusividade, transformação, atendimento personalizado.";
    } else if (ticketBand === "baixo") {
      topo = "Anúncio direto para oferta.";
      meio = "Link direto para WhatsApp; atendimento rápido.";
      fundo = "Remarketing simples.";
      comunicacao = "Oferta clara, urgência e prova social objetiva.";
    } else {
      // Ticket médio
      topo = "Anúncios que geram interesse e curiosidade.";
      meio = "Link direto para WhatsApp; atendimento consultivo.";
      fundo = "Remarketing com urgência e prova social.";
      comunicacao = "Tom alinhado ao valor percebido (benefício claro e prova social).";
    }
  } else {
    // LP Direto (Checkout)
    if (ticketBand === "alto") {
      topo = "Criativos inspiracionais para tráfego à LP.";
      meio = "LP educa e converte; checkout otimizado.";
      fundo = "Remarketing com escassez e depoimentos.";
      comunicacao = "Exclusividade, transformação, processo simplificado.";
    } else if (ticketBand === "baixo") {
      topo = "Anúncio direto para oferta.";
      meio = "LP/checkout simplificado e otimizado.";
      fundo = "Remarketing simples.";
      comunicacao = "Oferta clara, urgência e prova social objetiva.";
    } else {
      // Ticket médio
      topo = "Anúncios com criativos adequados ao público.";
      meio = "LP educa e converte; checkout confiável.";
      fundo = "Remarketing com urgência e prova social.";
      comunicacao = "Tom alinhado ao valor percebido (benefício claro e prova social).";
    }
  }

  return `## Estratégia Recomendada
- **Objetivo:** ${objetivo}
- **Público:** ${publico}
- **Funil:**
Topo → ${topo}
Meio → ${meio}
Fundo → ${fundo}
- **Comunicação:** ${comunicacao}`;
}

// ---------- Cálculos principais ----------
export function buildStrategyReport(inputs: Inputs): StrategyReportOutput {
  console.log('🔍 [BUILD_REPORT] Inputs recebidos:', inputs);

  const { campaignType, productType, investmentBRL, ticketBRL, strategyType = "lp_whatsapp", objective, forceStrategy = false } = inputs;
  const ticketBand = getTicketBand(ticketBRL);

  const isGrowth = objective === 'crescimento_audiencia';
  const finalStrategyType = isGrowth ? 'impulsionar_post' : ((strategyType === 'lp_whatsapp' && !forceStrategy) ? pickRecommendedOption(ticketBand, productType, campaignType) : strategyType);

  console.log('🔍 [BUILD_REPORT] Dados processados:', {
    campaignType,
    productType,
    investmentBRL,
    ticketBRL,
    finalStrategyType,
    ticketBand,
    objective
  });

  const cpc = inputs.cpcOverride ?? cpcBench(productType);
  const convDefaults = convBenchByTicketAndStrategy(ticketBand, finalStrategyType);
  const conv = {
    lpToLeadMin: inputs.convOverrides?.lpToLeadMin ?? convDefaults.lpToLeadMin,
    lpToLeadMax: inputs.convOverrides?.lpToLeadMax ?? convDefaults.lpToLeadMax,
    leadToSaleMin: inputs.convOverrides?.leadToSaleMin ?? convDefaults.leadToSaleMin,
    leadToSaleMax: inputs.convOverrides?.leadToSaleMax ?? convDefaults.leadToSaleMax,
    directSaleMin: inputs.convOverrides?.directSaleMin ?? convDefaults.directSaleMin,
    directSaleMax: inputs.convOverrides?.directSaleMax ?? convDefaults.directSaleMax,
    whatsappChatMin: inputs.convOverrides?.whatsappChatMin ?? convDefaults.whatsappChatMin,
    whatsappChatMax: inputs.convOverrides?.whatsappChatMax ?? convDefaults.whatsappChatMax,
    whatsappSaleMin: inputs.convOverrides?.whatsappSaleMin ?? convDefaults.whatsappSaleMin,
    whatsappSaleMax: inputs.convOverrides?.whatsappSaleMax ?? convDefaults.whatsappSaleMax,
  };

  const rmShare = isGrowth ? 0 : getRemarketingShare(investmentBRL);

  // Verbas diárias com remarketing proporcional ao budget
  const dailyTotal = investmentBRL / 30;
  const dailyRemarketing = dailyTotal * rmShare;
  const dailyProspection = dailyTotal - dailyRemarketing;

  // Cliques estimados com CPC min/max usando TODO o investimento
  const clicksMin = Math.floor(investmentBRL / cpc.max);
  const clicksMax = Math.floor(investmentBRL / cpc.min);

  // Cálculos baseados na estratégia selecionada
  let accessesMin = 0, accessesMax = 0, leadsMin = 0, leadsMax = 0, salesMin = 0, salesMax = 0, whatsappChatsMin = 0, whatsappChatsMax = 0;

  if (finalStrategyType === "impulsionar_post") {
    // Crescimento de audiência: cliques = seguidores (ou custo por seguidor)
    // leads, sales, chats são 0
    accessesMin = 0; accessesMax = 0;
  } else if (finalStrategyType === "lp_whatsapp") {
    // LP → WhatsApp: Clique → Acesso LP → Lead → Venda
    accessesMin = clicksMin;
    accessesMax = clicksMax;
    leadsMin = Math.floor(accessesMin * conv.lpToLeadMin);
    leadsMax = Math.floor(accessesMax * conv.lpToLeadMax);
    salesMin = Math.max(0, Math.floor(leadsMin * conv.leadToSaleMin));
    salesMax = Math.max(0, Math.floor(leadsMax * conv.leadToSaleMax));
  } else if (finalStrategyType === "whatsapp_direto") {
    // WhatsApp Direto: Clique → Chat → Venda (sem LP)
    // Não há acessos à LP, apenas cliques diretos
    whatsappChatsMin = Math.floor(clicksMin * conv.whatsappChatMin);
    whatsappChatsMax = Math.floor(clicksMax * conv.whatsappChatMax);
    salesMin = Math.max(0, Math.floor(whatsappChatsMin * conv.whatsappSaleMin));
    salesMax = Math.max(0, Math.floor(whatsappChatsMax * conv.whatsappSaleMax));
    // Para compatibilidade com interface existente
    accessesMin = 0;
    accessesMax = 0;
    leadsMin = whatsappChatsMin;
    leadsMax = whatsappChatsMax;
  } else { // lp_direto
    // LP Direto: Clique → Acesso LP → Venda direta (sem leads)
    accessesMin = clicksMin;
    accessesMax = clicksMax;
    salesMin = Math.max(0, Math.floor(accessesMin * conv.directSaleMin));
    salesMax = Math.max(0, Math.floor(accessesMax * conv.directSaleMax));
    // Para compatibilidade com interface existente
    leadsMin = 0;
    leadsMax = 0;
  }

  const revenueMin = salesMin * ticketBRL;
  const revenueMax = salesMax * ticketBRL;

  const roiMin = revenueMin > 0 ? revenueMin / investmentBRL : 0;
  const roiMax = revenueMax > 0 ? revenueMax / investmentBRL : 0;

  // Seções

  const recommended = pickRecommendedOption(ticketBand, productType, campaignType);

  // 🎯 CORREÇÃO: Usar a estratégia recomendada quando strategyType é o padrão
  // Já foi definido o finalStrategyType acima, não precisa redeclarar

  console.log('🔍 [BUILD_REPORT] Estratégia final:', {
    strategyType,
    recommended,
    finalStrategyType
  });

  const opcoesEstrategia = renderOpcoesEstrategia(finalStrategyType, objective);
  const estrategiaRecomendada = renderEstrategiaRecomendada(campaignType, productType, ticketBand, finalStrategyType);

  // Resultados esperados e retorno estimado removidos conforme pedido do usuário

  // Margem de Risco personalizada por múltiplos fatores
  const getPersonalizedRiskLevel = () => {
    if (finalStrategyType === "impulsionar_post") {
      return "Médio a Alto - Experiência ruim pode perder clientes. Falta de retenção pode perder investimento.";
    }

    // Base por ticket
    let baseRisk = '';
    if (ticketBand === "alto") {
      baseRisk = "Baixo a Médio";
    } else if (ticketBand === "medio") {
      baseRisk = "Médio";
    } else {
      baseRisk = "Médio a Alto";
    }

    // Personalização por tipo de produto
    let productContext = '';
    if (productType.includes('ecommerce') || productType.includes('produto digital')) {
      productContext = ticketBand === "alto" ? " - Produto de alto valor reduz risco de perda" :
        ticketBand === "medio" ? " - Entrega rápida reduz risco de cancelamento" :
          " - Entrega demorada pode causar cancelamentos";
    } else if (productType.includes('servico')) {
      productContext = ticketBand === "alto" ? " - Serviço premium reduz risco de insatisfação" :
        ticketBand === "medio" ? " - Qualidade ruim pode causar perda de clientes" :
          " - Atendimento demorado pode perder vendas";
    } else { // curso, mentoria, retiro, etc
      productContext = ticketBand === "alto" ? " - Experiência premium reduz risco de abandono" :
        ticketBand === "medio" ? " - Conteúdo ruim pode causar desistência" :
          " - Experiência ruim pode perder clientes";
    }

    // Personalização por tipo de campanha
    let campaignContext = '';
    if (campaignType === 'sazonal') {
      campaignContext = " - Timing errado pode perder toda a temporada";
    } else { // recorrente
      campaignContext = " - Falta de retenção pode perder investimento";
    }

    // Personalização por estratégia
    let strategyContext = '';
    if (finalStrategyType === 'lp_whatsapp') {
      strategyContext = " - Landing page ruim pode perder leads";
    } else if (finalStrategyType === 'whatsapp_direto') {
      strategyContext = " - Resposta demorada pode perder vendas";
    } else { // lp_direto
      strategyContext = " - Checkout complicado pode perder compras";
    }

    return `${baseRisk}${productContext}${campaignContext}${strategyContext}`;
  };

  const getPersonalizedCriticalFactors = () => {
    if (finalStrategyType === "impulsionar_post") {
      return "Criativos ruins, Público mal direcionado, Experiência ruim do usuário, Falta de retenção de clientes, Falta de fidelização.";
    }

    let factors = [];

    // Fatores base por tipo de produto
    if (productType.includes('ecommerce') || productType.includes('produto digital')) {
      factors.push("Criativos ruins");
      factors.push("Público mal direcionado");
      if (ticketBand === "baixo") {
        factors.push("Entrega demorada");
      } else {
        factors.push("Suporte ruim");
      }
    } else if (productType.includes('servico')) {
      factors.push("Criativos ruins");
      factors.push("Público mal direcionado");
      if (ticketBand === "baixo") {
        factors.push("Atendimento demorado");
      } else {
        factors.push("Qualidade ruim do serviço");
      }
    } else { // curso, mentoria, retiro, etc
      factors.push("Criativos ruins");
      factors.push("Público mal direcionado");
      if (ticketBand === "baixo") {
        factors.push("Experiência ruim do usuário");
      } else {
        factors.push("Conteúdo de baixa qualidade");
      }
    }

    // Fatores por estratégia
    if (finalStrategyType === 'lp_whatsapp') {
      factors.push("Landing page mal otimizada");
      factors.push("Resposta demorada no WhatsApp");
    } else if (finalStrategyType === 'whatsapp_direto') {
      factors.push("Resposta demorada no WhatsApp");
      factors.push("Atendimento ruim");
    } else { // lp_direto
      factors.push("Checkout complicado");
      factors.push("Processo de compra difícil");
    }

    // Fatores por tipo de campanha
    if (campaignType === 'sazonal') {
      factors.push("Timing errado da campanha");
      factors.push("Falta de urgência na oferta");
    } else { // recorrente
      factors.push("Falta de retenção de clientes");
      factors.push("Falta de fidelização");
    }

    return factors.join(", ") + ".";
  };

  const riskLevel = getPersonalizedRiskLevel();

  const margemRisco =
    `## Margem de Risco no Investimento
- ${riskLevel}
- **Fatores críticos:** qualidade dos criativos, aderência do público e velocidade de resposta no WhatsApp.`;

  let proximosPassos =
    `## Próximos Passos
- Configurar a campanha no Gerenciador.
- **Verba diária (já descontado remarketing):**
  - **Prospecção:** ${brl(round(dailyProspection))} / dia
- **Reservar ${(rmShare * 100).toFixed(0)}% para remarketing:**
  - **Remarketing:** ${brl(round(dailyRemarketing))} / dia
- Alocar em **1 conjunto** (mais força) ou **2+ conjuntos** (testes).
- Garantir atendimento rápido e consultivo no WhatsApp.`;

  if (finalStrategyType === "impulsionar_post") {
    proximosPassos = `## Próximos Passos
- Configurar a campanha no Gerenciador selecionando objetivo de Engajamento ou Tráfego para o Perfil.
- **Verba diária (100% Prospecção):**
  - **Prospecção:** ${brl(round(dailyProspection))} / dia
- Não há remarketing para esta estratégia.
- Alocar em **2+ anúncios** de topo de funil para testar o melhor custo por seguidor.`;
  }

  const markdown = [
    "# Relatório Estratégico de Campanha",
    opcoesEstrategia,
    estrategiaRecomendada,
    "## Nível de Risco / Observações",
    `- **${riskLevel.split(' - ')[0]}**${riskLevel.includes(' - ') ? ' - ' + riskLevel.split(' - ').slice(1).join(' - ') : ''}
- **Fatores críticos:** ${getPersonalizedCriticalFactors()}`,
    proximosPassos
  ].filter(Boolean).join("\n\n");

  // Limpeza final do markdown para remover "#" soltos
  const markdownLimpo = markdown
    .replace(/^#\s*$/gm, '') // Remove linhas com apenas #
    .replace(/\n\s*#\s*\n/g, '\n') // Remove # isolado entre quebras
    .replace(/\s*#\s*$/gm, '') // Remove # no final de linhas
    .replace(/\n\s*#\s*$/gm, '\n') // Remove # no final + quebra
    .replace(/^\s*#\s*\n/gm, '') // Remove # no início + quebra
    .replace(/\n{3,}/g, '\n\n') // Remove quebras múltiplas excessivas
    .trim(); // Remove espaços no início/fim

  return {
    inputs,
    metrics: {
      ticketBand,
      strategyType: finalStrategyType,
      cpcMin: cpc.min, cpcMax: cpc.max,
      dailyProspectionBRLMin: round(dailyProspection),
      dailyProspectionBRLMax: round(dailyProspection),
      dailyRemarketingBRLMin: round(dailyRemarketing),
      dailyRemarketingBRLMax: round(dailyRemarketing),
      clicksMin, clicksMax,
      accessesMin, accessesMax,
      leadsMin, leadsMax,
      salesMin, salesMax,
      whatsappChatsMin, whatsappChatsMax,
      revenueMin, revenueMax,
      roiMin, roiMax,
      conv
    },
    sections: {
      opcoesEstrategia,
      estrategiaRecomendada,
      margemRisco,
      proximosPassos
    },
    markdown: markdownLimpo
  };
}

// Função auxiliar para converter os tipos do componente para o serviço
export function convertStrategyToReport(strategy: {
  product: {
    campaignType: 'sazonal' | 'recorrente';
    type: string;
    ticket: number;
    objective?: string;
  };
  budget: {
    planned: number;
  };
}, strategyType?: StrategyType): Inputs {
  console.log('🔍 [CONVERT] Dados recebidos:', {
    strategy,
    strategyType
  });

  const result: Inputs = {
    campaignType: strategy.product.campaignType,
    productType: strategy.product.type as ProductType,
    investmentBRL: strategy.budget.planned,
    ticketBRL: strategy.product.ticket,
    objective: strategy.product.objective,
    strategyType: strategyType || 'lp_whatsapp',
  };

  console.log('🔍 [CONVERT] Resultado:', result);
  return result;
}

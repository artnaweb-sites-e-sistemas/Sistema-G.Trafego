# Benchmark com IA - Instruções de Configuração

## O que foi implementado

Foi adicionada uma nova funcionalidade de **"Benchmark com IA"** que permite gerar automaticamente valores de benchmark para métricas de Facebook Ads usando inteligência artificial (GPT-3).

### Funcionalidades incluídas:

1. **Seção de Benchmark com IA**: Aparece quando um produto está selecionado no dashboard
2. **Formulário inteligente**: Coleta informações sobre:
   - Nicho do produto
   - Público-alvo (idade, gênero, interesses, localização)
   - Valor do produto
   - Tipo de produto
   - Objetivo da campanha
   - Informações adicionais (opcional)

3. **Integração com OpenAI**: Usa GPT-3 para gerar benchmarks realísticos baseados nos dados fornecidos

4. **Atualização automática**: Os valores gerados são automaticamente aplicados na tabela de detalhes mensais nas colunas de benchmark

### Métricas geradas pela IA:
- CPM (Custo por Mil Impressões)
- CPC (Custo por Clique)
- CTR (Taxa de Cliques)
- CPA (Custo por Aquisição)
- ROAS (Retorno sobre Investimento em Anúncios)
- Frequência
- Alcance
- Impressões

## Configuração necessária

### 1. Obter chave da OpenAI

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie uma conta ou faça login
3. Vá em "API Keys" no menu lateral
4. Clique em "Create new secret key"
5. Copie a chave gerada (começa com "sk-...")

### 2. Configurar variável de ambiente

1. Copie o arquivo `env.example` para `.env`:
   ```bash
   cp env.example .env
   ```

2. Edite o arquivo `.env` e adicione sua chave da OpenAI:
   ```
   VITE_OPENAI_API_KEY=sk-sua_chave_aqui
   ```

### 3. Reiniciar o servidor

Após configurar a variável de ambiente, reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

## Como usar

1. **Selecione um produto** no dashboard
2. **Localize a seção "Benchmark com IA"** que aparecerá acima da tabela de detalhes mensais
3. **Clique em "Gerar Benchmark"**
4. **Preencha o formulário** com as informações do seu produto:
   - Nicho (ex: Fitness, Educação Online, E-commerce)
   - Valor do produto em reais
   - Tipo de produto (Digital, Físico, Serviço, etc.)
   - Dados do público-alvo
   - Objetivo da campanha
5. **Clique em "Gerar Benchmark com IA"**
6. **Aguarde o processamento** (alguns segundos)
7. **Os valores serão automaticamente aplicados** na tabela de detalhes mensais

## Custos

- **OpenAI GPT-3.5-turbo**: ~$0.001 por requisição
- **Novos usuários**: Recebem créditos gratuitos da OpenAI
- **Uso estimado**: Muito baixo para testes e uso normal

## Informações técnicas

### Arquivos criados/modificados:

1. **`src/services/aiBenchmarkService.ts`** - Serviço para integração com OpenAI
2. **`src/components/AIBenchmark.tsx`** - Componente do formulário de benchmark
3. **`src/components/Dashboard.tsx`** - Integração do novo componente
4. **`src/components/MonthlyDetailsTable.tsx`** - Recebe e aplica os valores da IA
5. **`env.example`** - Adicionada variável de ambiente para OpenAI

### Dependências adicionadas:
- **`openai`** - Biblioteca oficial da OpenAI

## Segurança

⚠️ **Importante**: A chave da API está sendo usada no frontend por simplicidade de implementação. Para produção, considere:

1. Criar um proxy backend para ocultar a chave da API
2. Implementar rate limiting
3. Usar variáveis de ambiente do servidor

## Troubleshooting

### Erro: "VITE_OPENAI_API_KEY não encontrada"
- Verifique se o arquivo `.env` está na raiz do projeto
- Verifique se a variável tem o prefixo `VITE_`
- Reinicie o servidor após adicionar a variável

### Erro: "429 Too Many Requests" ou "Quota Exceeded"
- **Situação**: Você atingiu o limite de uso gratuito da OpenAI
- **Solução automática**: O sistema automaticamente usa valores simulados inteligentes
- **Identificação**: Benchmark aparece marcado como "Simulado" com ~75% de confiança
- **Para resolver**: 
  - Aguarde o reset do limite (geralmente 24h para contas gratuitas)
  - Ou adicione créditos na sua conta OpenAI
  - Os valores simulados são baseados em algoritmos de mercado brasileiro

### Valores Simulados vs IA
- **Valores da IA** (>80% confiança): Gerados pelo GPT-3 com base em dados reais
- **Valores Simulados** (75% confiança): Calculados por algoritmo local baseado em:
  - Multiplicadores por nicho de mercado
  - Ajustes por valor do produto
  - Fatores regionais (SP/RJ têm CPM maior)
  - Dados históricos de mercado brasileiro

### Outros erros
- Verifique sua conexão com a internet
- Verifique se a chave da API está correta
- Valores simulados serão usados automaticamente em caso de problemas

## Próximos passos sugeridos

1. **Testes com diferentes nichos** para validar a qualidade dos benchmarks
2. **Implementação de cache** para evitar requisições repetidas
3. **Histórico de benchmarks** gerados por produto
4. **Integração com outras IAs** (Claude, Gemini) como backup
5. **Melhorias na interface** baseadas no feedback dos usuários
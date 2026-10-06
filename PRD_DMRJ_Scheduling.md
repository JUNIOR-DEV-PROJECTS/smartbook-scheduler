# PRD — DMRJ Scheduling

**Versão:** 1.0 · **Objetivo deste documento:** servir de especificação única para a Lovable corrigir e completar o app. Implemente **por fase** (seção 15), uma fase por vez, e informe ao final de cada fase o que foi alterado e o que não foi possível testar.

---

## 1. Visão geral

- **Nome público:** DMRJ Scheduling (somente nome comercial; não alterar nome pessoal nem dados legais).
- **Descrição (EN):** Appointment scheduling software for salons, clinics, spas and practices.
- **Slogan (EN):** Smart scheduling for modern businesses.
- **Idioma da interface:** inglês. Mensagens de erro e ajuda devem ser claras e podem ter versão em português se já houver seletor de idioma; caso contrário, manter tudo em inglês de forma consistente.
- **Público:** donos de salões, clínicas, spas e consultórios.
- **Nunca usar** "SmartBook Scheduler" em nenhuma parte visível, nos metadados, e-mails ou textos de ajuda.

## 2. Regras que valem para o projeto inteiro

1. **Honestidade:** não mostrar ofertas, descontos, trials, créditos grátis, economia anual ou funcionalidades que não estejam realmente implementados e funcionando.
2. **Nada de dados falsos em produção:** sem assinaturas simuladas, sem usuários ou clientes de exemplo.
3. **Segredos:** nunca colocar chaves secretas, senhas, CPF, documentos ou dados bancários no código, no repositório ou no chat. Usar somente o gerenciador de segredos (Secrets) da Lovable. O arquivo `.env` só pode conter valores públicos (URL e chave publishable do banco).
4. **Não remover funcionalidades que já funcionam.** Se algo precisar ser removido, explicar o motivo no resumo final.
5. **Plano só é ativado por confirmação de pagamento vinda do Stripe (webhook).** Nunca por redirecionamento de página, clique de botão ou ação do navegador.

## 3. Problemas conhecidos a corrigir (resultado da auditoria)

| # | Problema | Local |
|---|----------|-------|
| 1 | O banco conectado não tinha tabelas da aplicação; sem elas, cadastro, login e telas internas falham | Backend |
| 2 | Campos de senha **sem ícone de mostrar/ocultar senha** | Cadastro e login |
| 3 | Erros de cadastro/login aparecem em inglês técnico (ex.: "Password is known to be weak and easy to guess") | Cadastro e login |
| 4 | A tela inicial **não tem os botões dos planos** | Home |
| 5 | Botões de planos e outros botões sem resposta ao clique | Preços |
| 6 | Falta toda a parte de pagamentos com Stripe | Billing |
| 7 | Texto "2 complimentary credits on sign-up" na página de preços **e** nos metadados de SEO (oferta não implementada) | Preços, SEO |
| 8 | Funcionalidades prometidas sem existir: SMS reminders, custom branding, advanced reporting, priority support, "breaks and time off", tags, spend, no-shows | Home, Preços |
| 9 | Status "trialing" na interface sem trial real | Billing |
| 10 | Moeda em dólar ($) sem decisão explícita | Preços, Billing |
| 11 | Selo "Edit with Lovable" no rodapé (só some em plano pago; não é bug) | Rodapé |

## 4. Marca e consistência de textos

Aplicar "DMRJ Scheduling" em: título do navegador, logotipo, cabeçalho, dashboard, login, cadastro, preços, billing, textos de ajuda, e-mails, metadados (title, description, og:*, twitter:*), rodapé e páginas públicas. Em componentes e variáveis internas, renomear somente quando não quebrar a aplicação.

Metadados padrão: `description` = a descrição oficial (EN). **Proibido** citar créditos grátis, trial ou descontos em qualquer metadado.

## 5. Tela inicial (pública, sem login)

Estrutura, nesta ordem:

1. **Cabeçalho:** logo "DMRJ Scheduling", links âncora (Features, Pricing), botões **Sign in** e **Get started**. Menu hambúrguer funcional no celular.
2. **Hero:** slogan, descrição oficial, botão principal **Get started** (leva ao cadastro) e botão secundário **See plans** (rola até a seção de planos).
3. **Funcionalidades:** apenas as que existem e funcionam (calendário, clientes, funcionários, serviços, disponibilidade, agendamentos). Cada frase deve corresponder a algo realmente implementado. Remover o resto.
4. **Seção de planos (NOVA — obrigatória na home):**
   - Seletor **Monthly / Annual** (mesmo componente da página de preços; ver seção 7).
   - Três cartões: **Starter**, **Professional**, **Business**, cada um com nome, preço do período selecionado, lista curta de recursos reais e **botão de ação funcional** ("Choose Starter", "Choose Professional", "Choose Business").
   - O botão envia o plano e a periodicidade selecionados (seção 8).
   - Professional pode ter destaque visual ("Most popular" somente se for uma escolha de design; não é promessa de oferta).
5. **Aviso de pagamento:** se o Stripe ainda não estiver conectado, exibir sob os planos: "Payment checkout is not available yet. Please try again later." Se estiver conectado, não exibir.
6. **Rodapé:** nome do produto, slogan, links (Pricing, Sign in, Sign up), ano. Sem textos de teste.

## 6. Página de preços (`/pricing`)

Mesma seção de planos da home (reutilizar o mesmo componente para não divergir), com tabela ou lista de recursos por plano. Regras de conteúdo:

- Listar apenas recursos que existem. Limites (ex.: número de agendamentos por mês) só aparecem se forem aplicados de verdade pelo sistema.
- Moeda **única** em todo o app. Padrão atual: USD ($). Se o dono decidir por BRL, trocar em todo lugar (home, preços, billing, Stripe) de uma só vez.
- Preços lidos de **um único arquivo de configuração** (ex.: `src/config/plans.ts`), nunca escritos à mão em vários componentes.

## 7. Seletor Monthly / Annual

- **Monthly** seleciona o preço mensal; **Annual** o anual; o preço exibido muda imediatamente.
- O plano selecionado permanece selecionado ao alternar a periodicidade.
- Estado preservado ao atualizar a página (guardar na URL, ex.: `?interval=annual`).
- Nunca misturar preço mensal com anual. Nunca exibir "economia anual" sem que esteja configurada.
- **Annual só fica habilitado se existir um Price ID anual real no Stripe** para o plano (ver `plans.ts`). Caso contrário, Annual aparece **desabilitado** com a mensagem "Annual billing is coming soon."
- Funciona com toque no celular e com teclado (acessibilidade: `role="tablist"` ou botões com `aria-pressed`).

## 8. Botões dos planos

Fluxo ao clicar em "Choose {Plano}":

1. **Usuário sem login:** guardar `plan` e `interval` (URL/sessão) e levar ao cadastro/login; após autenticar, retomar o fluxo com o plano preservado.
2. **Usuário com login e Stripe configurado:** chamar a função de backend que cria a sessão de checkout (seção 10) e redirecionar ao Stripe.
3. **Stripe não configurado:** mostrar mensagem visível "Payment checkout is not available yet. Please try again later." Não criar assinatura.
4. **Durante a chamada:** botão com estado de carregamento e desabilitado (evita clique duplo).
5. **Erro:** mensagem clara e visível, sem detalhes técnicos nem dados sensíveis, com opção de tentar de novo.
6. Nenhum botão pode ficar sem resposta. Verificar se nenhum elemento sobreposto bloqueia o clique (z-index, overlay).

## 9. Cadastro e login

### 9.1 Campos e validação
- E-mail: formato válido, normalizado em minúsculas, sem espaços.
- Senha: mínimo de **12 caracteres**; mostrar as regras abaixo do campo; indicador de força opcional.
- Confirmação de senha (somente no cadastro): deve ser igual à senha.
- Nome do negócio e slug (cadastro): slug em minúsculas, só letras, números e hífens, 3 a 60 caracteres, único; mostrar erro claro se já existir.

### 9.2 Ícone de mostrar/ocultar senha (NOVO — obrigatório)
- **Todos** os campos de senha (login, cadastro, confirmação, redefinição) têm um botão com ícone de olho dentro do campo, à direita.
- Clique alterna entre `type="password"` e `type="text"`; ícone muda entre olho aberto e olho riscado.
- Acessível: `aria-label` "Show password" / "Hide password", foco por teclado, área de toque de pelo menos 44 px no celular.
- Cada campo (senha e confirmação) tem o seu próprio botão independente.

### 9.3 Mensagens de erro (traduzir erros técnicos)
Mapear erros do provedor de autenticação para mensagens claras, visíveis na tela (não só no console):

| Situação | Mensagem |
|----------|----------|
| Senha vazada/fraca | "This password is too common or has appeared in data leaks. Use at least 12 characters, mixing words, numbers and symbols." |
| E-mail já cadastrado | "This email is already registered. Try signing in or reset your password." |
| Credenciais inválidas | "Incorrect email or password." |
| Senhas diferentes | "Passwords do not match." |
| E-mail não confirmado (se a confirmação estiver ativa) | "Please confirm your email before signing in." |
| Falha de rede ou erro inesperado | "Something went wrong. Please try again." |

### 9.4 Comportamento
- Estados de carregamento em todos os botões; nunca carregamento infinito (timeout com mensagem de erro).
- Após cadastro: criar o perfil, o negócio (nome + slug) e a linha de assinatura com status `none`; redirecionar para o dashboard (ou para o fluxo do plano, se houver plano guardado).
- Após login: redirecionar para o dashboard (ou retomar o plano guardado).
- **Logout:** encerra a sessão, limpa o estado e leva à home.
- **Rotas privadas** (dashboard, calendário, clientes, funcionários, serviços, disponibilidade, agendamentos, billing): sem sessão → redireciona para `/auth`. Com sessão, `/auth` redireciona ao dashboard. Sem "flash" de conteúdo privado antes do redirecionamento.
- **Recuperação de senha:** link "Forgot password?" no login, página para pedir o e-mail e página `/reset-password` para definir nova senha (com os mesmos campos e ícone de olho). Mensagem neutra: "If this email exists, we sent a reset link."
- Sessão persiste ao atualizar a página.
- Responsivo: formulários legíveis a partir de 360 px de largura, teclado do celular não cobre o botão de envio.

## 10. Pagamentos com Stripe (NOVO)

### 10.1 Princípios
- Usar a **integração Stripe oferecida pela Lovable** ou funções de backend (edge functions) com Stripe; o que estiver disponível no projeto.
- **Cobrança só no backend.** O navegador nunca vê a chave secreta.
- Começar em **modo de teste (test mode)**. Chaves de teste e de produção ficam separadas e nunca se misturam. Passar a produção só quando o dono pedir, após testar.
- Segredos (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) somente no gerenciador de Secrets da Lovable. A chave publishable (`pk_...`) pode ficar no frontend. **Nunca pedir nem colar chaves no chat.** Se faltar um segredo, a Lovable deve abrir o campo seguro de Secrets e esperar.
- A verificação de identidade da empresa/pessoa no Stripe é feita no site do Stripe, nunca no app ou no chat.

### 10.2 Produtos e preços
Criar no Stripe (modo teste) três produtos: **Starter**, **Professional**, **Business**. Preço mensal atual: Starter $19, Professional $39, Business $79 (moeda conforme seção 6). Preços anuais **só** se o dono criar e aprovar valores; os Price IDs ficam em `plans.ts` (`monthlyPriceId`, `annualPriceId`, este último opcional). Sem `annualPriceId`, Annual fica desabilitado (seção 7). Não inventar valores nem IDs.

### 10.3 Fluxo de checkout
1. Frontend chama uma função de backend `create-checkout-session` enviando apenas `plan` e `interval` (nunca preço ou Price ID vindo do navegador).
2. A função valida o usuário logado, valida plano e periodicidade contra `plans.ts` no servidor, localiza o negócio do usuário e cria (ou reutiliza) o cliente Stripe.
3. Cria a sessão de Stripe Checkout em modo `subscription`, **sem período de teste (`trial_period_days` ausente)**, com `metadata` contendo `business_id`, `plan` e `interval`, e URLs de sucesso e cancelamento do próprio app.
4. Retorna a URL do checkout; o frontend redireciona.
5. Página de sucesso (`/billing?checkout=success`): mostra "We are confirming your payment…" e o status continua **Pending payment** até o webhook confirmar. Nunca marca como ativo por conta própria. Se o status não mudar em poucos segundos, mostrar "Your payment is being processed. This page will update shortly." com botão de atualizar.
6. Cancelamento (`/billing?checkout=canceled`): mensagem "Checkout canceled. No charge was made." e nenhuma alteração de status.

### 10.4 Webhook (única fonte de verdade do status)
- Função pública `stripe-webhook`, que **verifica a assinatura** (`STRIPE_WEBHOOK_SECRET`) e rejeita qualquer requisição inválida.
- Eventos tratados: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.
- Grava na tabela `subscriptions` (usando a service role, a única com permissão de escrita): `plan`, `billing_interval`, `status`, `provider = 'stripe'`, `provider_customer_id`, `provider_subscription_id`, `current_period_end`.
- Idempotente: processar o mesmo evento duas vezes não pode duplicar nem corromper dados.
- Mapeamento de status do Stripe para o app:

| Stripe | App |
|--------|-----|
| `active` | `active` |
| `incomplete` | `incomplete` |
| `past_due`, `unpaid` | `past_due` |
| `canceled` | `canceled` |
| `trialing` | `trial` — só se existir trial configurado de verdade; senão tratar como erro e registrar |
| sem assinatura | `none` |
| checkout iniciado, pagamento não confirmado | `pending_payment` |

### 10.5 Gerenciar e cancelar
- Botão **Manage subscription**, que abre o **Stripe Customer Portal** (troca de cartão, faturas, cancelamento). Criado por função de backend, só para o dono do negócio.
- Qualquer cancelamento feito no portal chega pelo webhook e atualiza o status. Se houver botão de cancelar no app, deve pedir confirmação e só alterar o status após confirmação do Stripe.

### 10.6 Estado "Stripe não conectado"
Enquanto faltar a chave ou o webhook estiver desativado: os botões dos planos mostram "Payment checkout is not available yet. Please try again later.", billing mostra "Billing is being set up" e nenhuma assinatura é criada ou simulada.

## 11. Billing (`/billing`)

- Mostrar: plano atual (ou "No active subscription"), periodicidade, status legível, próxima renovação (`current_period_end`), moeda consistente.
- Status exibidos: **No active subscription** (`none`), **Pending payment**, **Active**, **Past due**, **Canceled**, **Incomplete**, **Trial** (somente com trial real).
- Em `past_due`: aviso com botão para atualizar o pagamento (portal).
- Nunca exibir "trialing". Nunca exibir plano como ativo sem confirmação do webhook.
- Lista dos três planos com o atual identificado e botões de mudança de plano (que seguem o fluxo 10.3 ou o portal).
- Nenhum dado de exemplo.

## 12. Banco de dados e segurança

Usar a migration SQL já preparada (`dmrj_schema_inicial.sql`), aplicada sem enfraquecer as regras. Resumo das tabelas: `profiles`, `businesses`, `customers`, `staff`, `services`, `staff_services`, `availability`, `appointments`, `credit_ledger`, `subscriptions`.

Regras obrigatórias:
- **RLS ativo em todas as tabelas.** Cada usuário vê, edita e apaga somente dados do próprio negócio (`owns_business`).
- Agendamento só referencia cliente, funcionário e serviço do mesmo negócio (trigger de verificação).
- Banco impede dois agendamentos ativos sobrepostos para o mesmo funcionário.
- `subscriptions` e `credit_ledger`: usuário só **lê**; escrita somente pelo backend (webhook/service role).
- Visitantes anônimos não acessam tabelas diretamente; a página pública usa apenas funções com o mínimo de dados (`get_public_business`, `get_public_services`).
- Validação também no backend (não confiar só no frontend).
- Mensagens de erro sem dados sensíveis, sem stack trace e sem nomes de tabelas.
- Sem secrets no frontend nem no repositório.
- **Teste obrigatório de isolamento:** criar duas contas e confirmar que a conta A não consegue ler, editar nem apagar nada da conta B, inclusive tentando acessar um ID da conta B diretamente.

## 13. Módulos do dashboard (preservar e fazer funcionar com o banco real)

Todos exigem login e mostram somente dados do próprio negócio. Cada tela tem estado de carregamento, estado vazio com orientação ("No clients yet") e mensagens de erro claras.

- **Dashboard:** resumo (agendamentos de hoje, próximos, total de clientes) calculado dos dados reais; sem números de exemplo.
- **Calendário:** visualização por dia/semana, filtro por funcionário, criar/editar/cancelar agendamento.
- **Clientes:** listar, buscar, criar, editar, excluir (com confirmação).
- **Funcionários:** listar, criar, editar, ativar/desativar, vincular serviços.
- **Serviços:** nome, duração, preço, ativo/inativo.
- **Disponibilidade:** horários semanais por funcionário; sem conflito com agendamentos existentes.
- **Agendamentos:** criar com cliente, funcionário, serviço e horário; bloquear sobreposição e horário fora da disponibilidade; mensagem clara em caso de conflito.
- **Créditos:** exibir o saldo e o histórico (somente leitura). Nenhum crédito grátis é concedido automaticamente. Só mostrar essa área se o conceito de crédito estiver realmente definido e em uso.
- **Página pública de agendamento (`/book/{slug}`):** fase posterior. Cliente final cria agendamento por uma função própria que valida horário e disponibilidade, sem acesso direto à tabela `appointments`. Não anunciar na home enquanto não existir.

## 14. Qualidade e testes

Ao final de cada fase, executar e relatar:

- Build sem erros; sem erros de TypeScript, lint ou dependências; console do navegador sem erros vermelhos nas telas alteradas.
- **Rotas públicas** (home, preços, login, cadastro) abrem sem senha.
- **Fluxo completo:** cadastro → dashboard → logout → login → dashboard; e-mail repetido; senha fraca; senhas diferentes; atualizar a página mantendo a sessão.
- **Ícone de olho** funcionando em todos os campos de senha, no desktop e no celular.
- **Planos:** botões na home **e** em `/pricing` respondem; Monthly/Annual altera preço e mantém o plano; Annual desabilitado quando não houver preço anual.
- **Stripe (modo teste):** checkout com cartão de teste do Stripe; webhook muda o status; pagamento recusado vira `past_due`/`incomplete`; cancelamento no portal vira `canceled`.
- **Isolamento entre contas** (seção 12).
- Desktop (1280 px) e celular (360–390 px), sem rolagem horizontal.
- No resumo final listar **o que não pôde ser testado**, sem afirmar sucesso sem prova.

## 15. Fases de implementação (um prompt por fase, devido ao limite diário de créditos)

1. **Fase 1 — Banco, cadastro e login:** aplicar a migration; adaptar o código às tabelas; seções 9 e 12 (inclui ícone de olho e mensagens de erro); proteção de rotas; remover "trialing".
2. **Fase 2 — Home, planos e textos:** seções 4 a 8; botões dos planos na home; remover "complimentary credits" (inclusive em SEO) e funcionalidades inexistentes; moeda única.
3. **Fase 3 — Stripe:** seções 10 e 11, em modo teste; segredos pelo gerenciador seguro; webhook; portal.
4. **Fase 4 — Módulos e segurança:** seção 13 e teste de isolamento entre contas.
5. **Fase 5 — Publicação:** build limpo, testes da seção 14, publicar. Passar o Stripe para produção só com pedido explícito do dono.

## 16. Fora de escopo (por enquanto)

SMS, marca personalizada (custom branding), relatórios avançados, suporte prioritário, período de teste, descontos e créditos grátis. Só entram no produto, e na página pública, depois de implementados e testados.

## 17. Critérios de aceite

1. "DMRJ Scheduling" consistente em toda a interface e nos metadados; nenhuma ocorrência de "SmartBook Scheduler", "2 months free", "complimentary credits" ou "trialing".
2. Cadastro e login funcionam, com **ícone de mostrar/ocultar senha** em todos os campos de senha e mensagens de erro claras.
3. **Botões dos planos na tela inicial e em `/pricing`**, funcionando e preservando plano e periodicidade.
4. Monthly/Annual correto; Annual desabilitado enquanto não houver Price ID anual.
5. **Stripe em modo teste** funcionando: checkout, webhook, status correto, portal; plano ativo somente após confirmação do webhook.
6. Billing sem assinaturas falsas; status coerente com o real.
7. RLS ativo; isolamento entre contas comprovado por teste.
8. Nenhuma chave secreta, senha ou dado pessoal no código ou no repositório.
9. Build sem erros; público e privado funcionando em desktop e celular.
10. Resumo final com arquivos alterados, problemas corrigidos, pendências, estado do Stripe e resultado dos testes.

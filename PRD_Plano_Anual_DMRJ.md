# PRD complementar — Planos Anuais (Annual) — DMRJ Scheduling

**Este documento complementa o `PRD_DMRJ_Scheduling.md`.** Implemente depois da Fase 3 (Stripe) do PRD principal, ou junto com ela. Em caso de conflito, este documento vale para tudo o que se refere a planos anuais.

---

## 1. Problema

Hoje a tela de planos só oferece cobrança **mensal**. O seletor Monthly/Annual existe, mas Annual está desabilitado ("Annual billing is coming soon.") porque não há preços anuais configurados no provedor de pagamento.

## 2. Objetivo

Oferecer os planos **Starter, Professional e Business** também em cobrança **anual**, com preço próprio, checkout correto no Stripe, status correto no banco e troca segura entre mensal e anual.

## 3. Regras (valem para este documento inteiro)

1. **Não inventar valores.** Os preços anuais são decisão do dono e devem estar na tabela da seção 4 antes de implementar. Se algum valor estiver vazio, o Annual daquele plano não é liberado.
2. **Não inventar IDs.** Só usar Price IDs que realmente existam no Stripe.
3. **Não prometer o que não existe.** O texto de economia anual (ex.: "Save 15%") só aparece se for **calculado automaticamente** a partir dos dois preços configurados (seção 6). Nenhum percentual escrito à mão. Não usar "2 months free" nem "complimentary credits".
4. **Cobrança só pelo backend**, modo de teste primeiro, segredos somente no gerenciador de Secrets da Lovable. Nunca colar chaves no chat ou no código.
5. **Plano ativo somente após confirmação do webhook do Stripe.**
6. Preço mensal e anual nunca se misturam em tela, checkout ou banco.

## 4. Decisão do dono: preços anuais (preencher antes de implementar)

Moeda: **a mesma do restante do app** (hoje USD). O preço anual é o valor cobrado **uma vez por ano**.

| Plano | Mensal (já existe) | Anual (preencher) |
|-------|--------------------|--------------------|
| Starter | $19 | $ ____ |
| Professional | $39 | $ ____ |
| Business | $79 | $ ____ |

Se o dono pedir uma sugestão, a Lovable não deve escolher: deve apenas mostrar o cálculo de referência (12 × mensal = Starter $228, Professional $468, Business $948) e aguardar o valor definido.

## 5. Configuração central

Todos os preços ficam em **um único arquivo** (`src/config/plans.ts`), usado por home, `/pricing`, billing e backend:

```ts
// Estrutura esperada (valores reais vêm da tabela da seção 4 e do Stripe)
{
  starter:      { name: "Starter",      monthly: { amount, priceId }, annual: { amount, priceId } | null },
  professional: { name: "Professional", monthly: { amount, priceId }, annual: { amount, priceId } | null },
  business:     { name: "Business",     monthly: { amount, priceId }, annual: { amount, priceId } | null },
}
```

- `annual: null` significa "ainda não configurado" e o Annual daquele plano fica indisponível.
- Os Price IDs do Stripe **não são segredos** e podem ficar no arquivo. As chaves do Stripe nunca.
- O **servidor valida** plano e periodicidade contra esta configuração. Nunca confiar em preço ou Price ID vindo do navegador.

## 6. Stripe: criação dos preços anuais

1. Em **modo de teste**, para cada produto (Starter, Professional, Business), criar um segundo preço do tipo **recorrente, intervalo anual (yearly)**, na mesma moeda do mensal e com o valor da seção 4. O dono também pode criar esses preços direto no painel do Stripe e informar os IDs.
2. Copiar cada Price ID (começa com `price_`) para `plans.ts`.
3. Passar para produção só quando o dono pedir, repetindo a criação dos preços no modo de produção (IDs de teste e de produção são diferentes e nunca se misturam).

## 7. Interface

### 7.1 Seletor Monthly / Annual (home e `/pricing`)
- Funciona nas **duas páginas** com o mesmo componente.
- Annual fica **habilitado** somente se os três planos tiverem `annual` configurado. Se apenas alguns tiverem, o cartão sem preço anual mostra "Annual price not available yet" e o botão fica desabilitado quando Annual estiver selecionado.
- Se nenhum plano tiver preço anual, Annual fica desabilitado com "Annual billing is coming soon."
- Ao alternar, o preço muda imediatamente; o plano escolhido continua escolhido; a periodicidade fica na URL (`?interval=annual`) e persiste ao atualizar a página.

### 7.2 Cartões dos planos
- Mensal: `$19 / month`.
- Anual: preço anual cheio com o rótulo `/ year` e, como linha secundária, o equivalente mensal (`≈ $X / month, billed yearly`), calculado (anual ÷ 12, 2 casas decimais).
- **Economia**: exibir "Save X%" **somente** quando `anual < 12 × mensal`, com X calculado automaticamente e arredondado para baixo. Se não houver economia real, não mostrar nada.
- O botão **Choose {Plano}** envia `plan` e `interval` corretos (fluxo do PRD principal, seções 8 e 10.3) e o texto do botão deve deixar clara a periodicidade, ex.: "Choose Professional — yearly".

### 7.3 Billing (`/billing`)
- Mostrar o plano atual **com a periodicidade** (ex.: "Professional — Annual") e a **próxima renovação** (`current_period_end`).
- Na lista de planos, o seletor Monthly/Annual permite ver os dois preços e trocar.

## 8. Backend

- A função `create-checkout-session` já deve aceitar `interval`: escolhe o `annual.priceId` ou `monthly.priceId` **no servidor**, valida que o preço existe e grava `interval` no `metadata`.
- O webhook grava `billing_interval` (`monthly` ou `annual`) na tabela `subscriptions`, deduzindo do intervalo do preço do Stripe (`year` → `annual`, `month` → `monthly`). A coluna e o tipo já existem na migration inicial.
- Idempotência mantida: o mesmo evento processado duas vezes não duplica nada.
- Sem período de teste (`trial_period_days` ausente) em nenhum dos dois intervalos.

## 9. Troca entre mensal e anual (cliente que já assina)

Padrão: usar o **Stripe Customer Portal**, configurado para permitir trocar de plano/intervalo entre os preços existentes. O app não calcula valores proporcionais por conta própria; quem calcula o ajuste é o Stripe.

- Botão **Manage subscription** abre o portal.
- Antes de mandar o cliente ao portal, mostrar um aviso: "You can switch between monthly and yearly billing in the billing portal. Any price adjustment is calculated by Stripe."
- Depois da troca, o webhook atualiza `plan`, `billing_interval` e `current_period_end`, e a tela de billing reflete o novo estado.
- Cliente com assinatura ativa **não** passa por um novo checkout para trocar de intervalo (evita assinatura duplicada). Se tentar escolher um plano na tela de preços, redirecionar para o portal.

## 10. Estados e mensagens

| Situação | Comportamento |
|----------|---------------|
| Annual sem preço configurado | Annual desabilitado; "Annual billing is coming soon." (ou "Annual price not available yet" no cartão) |
| Stripe não conectado | "Payment checkout is not available yet. Please try again later." |
| Checkout iniciado, sem confirmação | `Pending payment`; nunca marcar como ativo |
| Pagamento anual recusado | `Incomplete` ou `Past due`, conforme o Stripe, com botão para atualizar pagamento |
| Cancelamento | Mantém o acesso até `current_period_end` se o Stripe indicar cancelamento no fim do período; depois `Canceled` |

## 11. Testes obrigatórios (modo de teste do Stripe)

1. Home e `/pricing`: alternar Monthly/Annual altera os três preços, mantém o plano e a URL; atualizar a página preserva a escolha.
2. O "Save X%" aparece com o valor calculado correto, e **não aparece** se anual ≥ 12 × mensal.
3. Checkout anual de cada plano com cartão de teste: sessão com o Price ID anual correto; webhook grava `billing_interval = annual`; billing mostra "— Annual" e a renovação em cerca de 12 meses.
4. Checkout mensal continua funcionando e gravando `monthly`.
5. Troca mensal → anual e anual → mensal pelo portal; o status e a periodicidade atualizam no app.
6. Pagamento anual recusado não ativa o plano.
7. Tentar forçar um `priceId` ou `interval` inválido pelo navegador: o servidor rejeita.
8. Desktop (1280 px) e celular (360 px), sem rolagem horizontal; seletor utilizável por toque e teclado.
9. Console sem erros vermelhos; build sem erros.
10. No resumo final, listar o que **não pôde ser testado**.

## 12. Implementação (um único prompt, após a Fase 3)

Sequência: (1) o dono preenche a tabela da seção 4; (2) criar os preços anuais no Stripe em modo de teste; (3) atualizar `plans.ts`; (4) ajustar interface, função de checkout e webhook; (5) configurar o portal para troca de intervalo; (6) testes da seção 11; (7) publicar.

## 13. Fora de escopo

Descontos, cupons, períodos de teste, planos personalizados, cobrança em outra moeda e faturamento por nota fiscal.

## 14. Critérios de aceite

1. Os três planos têm Annual funcionando, ou Annual claramente indisponível quando faltar o preço.
2. Preço mensal e anual nunca se misturam; o botão envia a periodicidade correta.
3. "Save X%" só aparece quando calculado e verdadeiro; nenhuma promoção escrita à mão.
4. Checkout anual no Stripe com o Price ID correto; `billing_interval` correto no banco.
5. Billing mostra plano, periodicidade e renovação reais.
6. Troca mensal ↔ anual funciona pelo portal e atualiza o app via webhook.
7. Plano só fica ativo após confirmação do webhook.
8. Nenhuma chave secreta no código; modo de teste até pedido explícito do dono.
9. Build sem erros e testes da seção 11 reportados.

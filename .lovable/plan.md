# Correção isolada da página pública

## Escopo
- Manter o layout atual da página inicial e confirmar que todo texto visível usa **DMRJ Scheduling**.
- Adicionar um botão **Get started** em cada cartão: Starter, Professional e Business.
- Ao clicar, guardar localmente o plano com periodicidade mensal e exibir: **“Payment checkout is not available yet. Please try again later.”**
- Não criar assinatura, não cobrar, não alterar status de plano e não conectar provedor de pagamento.
- Garantir que não exista a frase **“Get started free”** na página pública; manter apenas chamadas sem promessa de plano gratuito.

## Limites desta correção
- Não alterar layout, banco de dados, cadastro, login, rotas privadas ou demais funcionalidades.
- Não aplicar o SQL enviado nesta etapa, pois ele contradiz expressamente o pedido de não alterar o banco e mudaria a estrutura já usada pelo aplicativo.

## Verificação
- Conferir os três botões e a mensagem em desktop e celular.
- Confirmar que a seleção do plano fica salva sem criar assinatura.
- Verificar console e diagnóstico de compilação após a alteração.

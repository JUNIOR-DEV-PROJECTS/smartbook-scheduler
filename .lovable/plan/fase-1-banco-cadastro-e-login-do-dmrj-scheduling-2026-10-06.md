# Fase 1 — banco, cadastro e login do DMRJ Scheduling

## Objetivo
Adaptar a Fase 1 enviada ao aplicativo existente sem apagar dados, enfraquecer o isolamento entre contas, integrar pagamentos, criar trial ou inserir dados de exemplo.

## 1. Banco e compatibilidade
- Comparar a estrutura existente com o SQL enviado antes de qualquer alteração.
- Não executar cegamente os `CREATE TABLE IF NOT EXISTS`: as tabelas atuais já têm colunas, enums e relacionamentos diferentes, e isso deixaria uma estrutura híbrida incompatível.
- Preparar uma migração aditiva com apenas o que estiver faltando, preservando os recursos atuais de calendário, equipe, serviços, clientes e créditos.
- Manter as proteções atuais contra agendamentos sobrepostos e validar que cliente, funcionário e serviço pertencem ao mesmo negócio.
- Adicionar a estrutura de assinatura somente se necessária, com estado inicial `none`, leitura limitada ao próprio negócio e escrita reservada ao backend.
- Manter créditos e assinatura inacessíveis para escrita direta pelo usuário.
- Regenerar os tipos após a migração e rodar a verificação de segurança do banco.

## 2. Cadastro e login
- Manter autenticação somente por e-mail e senha.
- Adicionar nome do negócio e slug ao cadastro, com validação e mensagem para slug já usado.
- Exigir senha de no mínimo 12 caracteres e confirmação idêntica; mostrar as regras abaixo do campo.
- Adicionar controle independente de mostrar/ocultar em todos os campos de senha, inclusive redefinição, com área de toque adequada no celular.
- Traduzir erros para mensagens claras em inglês, incluindo senha vazada/fraca, e-mail já cadastrado, credenciais incorretas, rede e timeout.
- Após cadastro confirmado, criar negócio e vínculo do proprietário de forma segura e idempotente; a assinatura começa como `none`.
- Login leva ao dashboard; logout limpa dados em cache e leva à página pública; sessão permanece após recarregar.
- Evitar carregamento infinito com estados explícitos de sucesso, erro e timeout.

## 3. Integração com o aplicativo existente
- Adaptar as consultas ao modelo final sem remover páginas ou funções já existentes.
- Preservar as rotas privadas sob a proteção atual e impedir exibição de conteúdo antes do redirecionamento.
- Mostrar `No active subscription` para estado `none`; nunca mostrar `trialing` nem plano Starter como assinado sem pagamento.
- Manter checkout indisponível e sem alterações de assinatura.

## 4. Página pública
- Manter `DMRJ Scheduling` em toda a página.
- Adicionar **Get started** a Starter, Professional e Business sem alterar o layout.
- Cada botão salva localmente o plano mensal escolhido e mostra: **“Payment checkout is not available yet. Please try again later.”**
- Remover qualquer **Get started free**; nenhum clique cria assinatura ou cobrança.

## 5. Verificação
- Verificar compilação, TypeScript, lint e console.
- Testar em desktop e 360px: senha visível/oculta, senha fraca, confirmação diferente, cadastro, e-mail repetido, login, logout, recuperação de senha, proteção de rota e recarga autenticada.
- Testar os três botões públicos e confirmar que apenas guardam a seleção.
- Quando houver duas contas disponíveis, confirmar que uma não lê nem altera clientes, equipe, serviços ou agendamentos da outra.
- Relatar separadamente o que passou, falhou ou não pôde ser testado.

## Observação técnica
O SQL enviado define um modelo diferente do já usado pelo app (por exemplo, `availability` versus `staff_availability`, proprietário único versus membros e enums distintos). A implementação será equivalente e aditiva, não uma execução literal destrutiva, para cumprir a exigência do próprio arquivo de preservar dados e funcionalidades.

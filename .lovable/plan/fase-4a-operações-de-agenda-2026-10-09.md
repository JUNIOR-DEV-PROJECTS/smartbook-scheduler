# Fase 4A — operações de agenda

## Objetivo
Entregar somente a gestão de serviços, equipe, disponibilidade, fuso horário, avisos futuros e agendamentos, usando as tabelas atuais e mantendo o isolamento entre negócios. Não integrar pagamentos, não renomear nem apagar tabelas.

## 1. Serviços
- Adicionar **New service** e edição em formulário adaptado para celular.
- Campos: nome obrigatório, duração positiva em minutos, preço não negativo na moeda do negócio e ativo/inativo.
- Salvar na conta atual, permitir editar e desativar sem excluir o histórico.
- Exibir carregamento e mensagens claras de sucesso, validação e erro.

## 2. Equipe
- Adicionar **New staff member** e edição com nome obrigatório, e-mail válido opcional, telefone e ativo/inativo.
- Permitir selecionar os serviços realizados pelo profissional usando a relação existente entre equipe e serviços.
- Salvar profissional e vínculos de serviços de forma consistente; permitir desativar sem apagar agendamentos antigos.
- Exibir os serviços vinculados e atualizar as listas após cada alteração.

## 3. Disponibilidade
- Transformar a lista atual em editor semanal por funcionário.
- Permitir adicionar, editar e remover faixas com dia da semana, início e fim.
- Validar início anterior ao fim e impedir faixas inválidas ou sobrepostas para o mesmo profissional e dia.
- Manter os horários como horas locais e vinculados ao negócio e funcionário atuais.

## 4. Configurações e fuso horário
- Adicionar **Time zone** com uma lista prática de fusos IANA e `America/Cuiaba` como padrão para novos negócios.
- Ajustar o padrão do banco de forma aditiva, sem sobrescrever automaticamente negócios que já escolheram outro fuso.
- Usar o fuso salvo para montar, gravar e exibir horários em agenda, calendário e formulários; corrigir agrupamentos de calendário que ainda usam a data local do navegador.
- Deixar **Send confirmations**, **Send reminders** e **Send cancellation notices** desligados e desabilitados, com a nota **“Email notifications are coming soon”**. O salvamento persistirá esses três valores como desligados.

## 5. Agendamentos
- Manter **New appointment** abrindo o formulário existente e completar seu fluxo com cliente novo ou existente, profissional, serviço, data e horário.
- Mostrar apenas profissionais vinculados ao serviço selecionado e horários compatíveis com disponibilidade, duração, fuso e agenda ocupada.
- Revalidar conflito ao salvar e traduzir a proteção existente contra sobreposição para uma mensagem clara quando o horário do profissional já estiver ocupado.
- Permitir editar e cancelar um agendamento com confirmação, carregamento e atualização imediata das listas e calendário.
- Preservar agendamentos cancelados no histórico, sem exclusão física.

## 6. Segurança e dados
- Todas as leituras e gravações incluirão o negócio atual; as regras RLS existentes continuarão sendo a proteção final.
- Antes de qualquer ajuste de banco, revisar concessões e políticas das tabelas envolvidas. A única mudança estrutural prevista é aditiva para o padrão de fuso, se necessária.
- Não criar dados de exemplo, assinaturas, checkout ou cobrança.

## 7. Verificação
- Adicionar testes pequenos para as regras de fuso, disponibilidade e rejeição de sobreposição.
- Verificar TypeScript, compilação e diagnósticos do preview.
- Testar no navegador, em desktop e celular: criar/editar/desativar serviço; criar/editar/desativar profissional e seus serviços; editar disponibilidade; salvar fuso e avisos desligados; criar com cliente novo e existente; tentar horário ocupado; editar e cancelar agendamento.
- Conferir console e atualização dos dados após recarregar.
- No resumo final, separar claramente testes aprovados, falhas e itens que não puderam ser testados.

## Detalhes técnicos
- Reutilizar os componentes visuais e consultas atuais, com formulários focados e invalidação das listas após gravações.
- Usar `services`, `staff`, `staff_services`, `staff_availability`, `customers`, `appointments` e `businesses` existentes.
- Continuar convertendo hora local do negócio para UTC ao gravar instantes de agendamento; disponibilidade semanal permanece em hora local.

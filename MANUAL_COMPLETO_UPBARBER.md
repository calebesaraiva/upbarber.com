# Manual Completo do UpBarber

Sistema SaaS para gestão de barbearias desenvolvido e mantido pela **NEXUS TECNOLOGIA LTDA**, CNPJ **52.671.137/0001-71**.

Última atualização: 14/06/2026

> Este manual é operacional. Os textos de Termos de Uso, Privacidade/LGPD e Cookies incluídos no sistema devem ser revisados por assessoria jurídica antes de uso contratual definitivo.

## 1. Visão Geral

O UpBarber centraliza a operação da barbearia em um único painel:

- Agenda e atendimentos.
- Clientes e histórico.
- Barbeiros/equipe.
- Serviços e pacotes.
- Planos de assinatura da barbearia.
- Financeiro e caixa.
- Produtos, estoque e comandas.
- Relatórios.
- WhatsApp e campanhas.
- Notificações.
- Suporte.
- Cobrança SaaS via Pix.
- Painel Master para gestão da plataforma.

## 2. Tipos de Acesso

### Master

Usado pelo dono do SaaS para administrar a plataforma inteira.

Principais permissões:

- Criar barbearias.
- Criar convites de cadastro.
- Aprovar/reprovar cadastros.
- Gerenciar planos SaaS.
- Gerar cobranças Pix.
- Suspender ou reativar clientes.
- Ver relatórios da plataforma.
- Responder chamados de suporte.
- Enviar comunicados.

### Dono/Admin da Barbearia

Usado pelo responsável da barbearia.

Principais permissões:

- Gerenciar agenda, clientes, equipe e serviços.
- Acompanhar financeiro, caixa, produtos e estoque.
- Criar usuários internos.
- Ver plano e cobrança da plataforma.
- Abrir chamados de suporte.

### Barbeiro

Perfil operacional para execução de atendimentos.

Pode acessar recursos ligados à rotina de atendimento, conforme regras do sistema.

### Recepção

Perfil para atendimento, agenda e cadastros básicos, conforme permissões configuradas.

## 3. Login

1. Acesse `https://upbarber.com/login`.
2. Digite e-mail e senha.
3. O sistema identifica automaticamente se o login é master ou de barbearia.
4. Login master direciona para `/master`.
5. Login comum direciona para o painel operacional.

### Erros comuns no login

- **Email ou senha inválidos**: confira digitação e tente novamente.
- **Confirme o código enviado ao seu email**: o usuário ainda não verificou o e-mail.
- **Cadastro aguardando aprovação**: o master precisa aprovar a barbearia.
- **Assinatura bloqueada**: plano suspenso, cancelado ou inadimplente.
- **Período de avaliação terminou**: trial expirado.

## 4. Recuperação de Senha

1. Clique em **Esqueci a senha**.
2. Digite o e-mail cadastrado.
3. O sistema só avança se o e-mail for válido e existir no banco.
4. Receba o código por e-mail.
5. Informe o código e a nova senha.

### Possíveis erros

- **Digite seu e-mail para continuar**: campo vazio.
- **Digite um e-mail válido**: formato incorreto.
- **E-mail errado ou não cadastrado**: e-mail não encontrado.
- **Código inválido ou expirado**: solicite um novo código.

## 5. Cadastro de Barbearia

Fluxo público ou por convite:

1. Informe dados da barbearia.
2. Crie acesso com e-mail e senha.
3. Escolha o plano.
4. Envie para análise.
5. Confirme o código recebido por e-mail.
6. Aguarde aprovação do painel master.

### Regras importantes

- O cadastro fica suspenso até aprovação.
- O e-mail precisa ser válido.
- E-mail já cadastrado não pode ser usado novamente.
- Após aprovação, o dono da barbearia recebe e-mail de liberação.

## 6. Dashboard

Tela inicial da barbearia.

Use para acompanhar:

- Indicadores principais.
- Atendimentos.
- Dados financeiros.
- Alertas operacionais.

Se algum número parecer incorreto, confira se existem agendamentos/lançamentos cadastrados no período certo.

## 7. Agenda

Use a agenda para:

- Ver horários do dia.
- Criar agendamentos.
- Editar ou cancelar atendimentos.
- Controlar status do atendimento.

Boas práticas:

- Cadastre serviços com duração correta.
- Mantenha barbeiros ativos e vinculados aos serviços.
- Confira filial/unidade quando houver mais de uma.

## 8. Clientes

Área para cadastro e consulta de clientes.

Recursos:

- Criar cliente.
- Editar dados.
- Ver perfil.
- Consultar histórico.
- Usar dados em agendamentos, assinaturas e relatórios.

Cuidados LGPD:

- Cadastre apenas dados necessários.
- Mantenha informações atualizadas.
- Não use dados de clientes para finalidades não autorizadas.

## 9. Barbeiros

Área para cadastro da equipe.

Use para:

- Criar barbeiros.
- Definir especialidade.
- Configurar comissão.
- Vincular serviços.
- Ativar/inativar profissionais.

Erro comum:

- Se o barbeiro não aparecer na agenda, confira se ele está ativo e se existem serviços vinculados.

## 10. Serviços

Área para gerenciar cortes, barba, combos e outros serviços.

Campos importantes:

- Nome.
- Preço.
- Duração.
- Categoria.
- Comissão.

Boas práticas:

- Use nomes curtos e claros.
- Mantenha preço e duração sempre atualizados.
- Evite duplicar serviços iguais.

## 11. Planos e Assinaturas da Barbearia

Use para vender planos recorrentes aos clientes da própria barbearia.

Fluxo sugerido:

1. Crie planos.
2. Cadastre assinantes.
3. Acompanhe pagamentos.
4. Controle vencimentos e inadimplência.

## 12. Financeiro

Use para:

- Ver entradas e saídas.
- Acompanhar resumo financeiro.
- Consultar fluxo de caixa.
- Conferir comissões.

Erros comuns:

- Valor não aparece: confira se a venda/agendamento foi concluída.
- Comissão errada: confira percentual no serviço/barbeiro.
- Data errada: confira filtros de período.

## 13. Caixa do Dia

Use para abrir e acompanhar o caixa.

Rotina recomendada:

1. Abra o caixa no início do expediente.
2. Lance vendas/serviços corretamente.
3. Confira formas de pagamento.
4. Feche o caixa no fim do dia.

## 14. Produtos, Estoque e Comandas

### Produtos

Cadastre produtos vendidos ou usados na barbearia.

### Estoque

Controle entradas, saídas, perdas e ajustes.

### Comandas

Use para vendas de produtos e consumo durante atendimento.

Erro comum:

- Estoque negativo indica venda sem saldo suficiente ou movimentação incorreta.

## 15. Relatórios

Use relatórios para acompanhar:

- Receita.
- Agendamentos.
- Clientes.
- Serviços mais vendidos.
- Resultados por período.

Se o relatório vier vazio, confira filtros e se existem registros no período escolhido.

## 16. WhatsApp e Campanhas

Área preparada para automação e campanhas.

Possíveis usos:

- Confirmação de agendamento.
- Lembretes.
- Aniversários.
- Clientes inativos.
- Assinaturas vencendo.

Cuidados:

- Envie mensagens apenas para clientes com base legal/autorização.
- Evite spam.
- Respeite pedidos de descadastro.

## 17. Notificações

Exibe avisos internos da barbearia e comunicados enviados pelo painel master.

## 18. Suporte

O dono/responsável da barbearia pode abrir chamado em **Suporte**.

Quando um chamado é criado:

- Ele fica salvo no banco.
- Aparece no painel master em **Central de Suporte**.
- O master pode responder e fechar o ticket.

## 19. Meu Plano UpBarber

Tela do cliente SaaS para consultar:

- Status do plano.
- Cobrança atual.
- QR Code Pix.
- Pix copia e cola.
- Banco: Banco do Brasil.
- Chave Pix CNPJ: 52.671.137/0001-71.
- Favorecido: NEXUS TECNOLOGIA LTDA.

## 20. Painel Master

### Dashboard da Plataforma

Mostra visão geral:

- Barbearias ativas.
- Trials.
- Suspensas.
- Total de barbearias.
- Evolução de MRR.
- Distribuição por plano.

### Barbearias

Use para:

- Criar cliente manualmente.
- Enviar convite por e-mail.
- Aprovar cadastros pendentes.
- Suspender ou reativar barbearias.
- Acessar como cliente quando necessário.
- Enviar comunicados.

### Cobranças

Use para:

- Ver faturas.
- Gerar cobrança Pix.
- Marcar pagamento manualmente.

### Planos SaaS

Use para:

- Criar planos.
- Editar valores.
- Definir limites.
- Ativar/inativar planos.

### Suporte

Use para:

- Ver chamados abertos pelas barbearias.
- Responder chamados.
- Alterar prioridade/status.
- Fechar tickets resolvidos.

### Configurações

Use para:

- Configurar SMTP.
- Ajustar informações da plataforma.
- Feature flags.
- Suporte.

## 21. E-mails do Sistema

O UpBarber envia e-mails para:

- Convite de cadastro.
- Verificação de e-mail.
- Recuperação de senha.
- Aprovação de cadastro.
- Cobrança Pix.
- Comunicados do master.

Se o e-mail não chegar:

- Confira spam/lixo eletrônico.
- Confirme se o endereço está correto.
- Confira configuração SMTP no servidor.
- Verifique logs do backend.

## 22. Cookies, LGPD e Segurança

O sistema possui:

- Banner de cookies.
- Política de Cookies.
- Política de Privacidade e LGPD.
- Termos de Uso.
- Identificação da NEXUS TECNOLOGIA LTDA e CNPJ.

Boas práticas:

- Usar senhas fortes.
- Não compartilhar contas.
- Criar usuários individuais para cada pessoa.
- Remover acesso de ex-funcionários.
- Revisar permissões periodicamente.

## 23. Correção de Problemas

### Login não entra

1. Confira e-mail e senha.
2. Verifique se o e-mail foi confirmado.
3. Verifique se a barbearia foi aprovada.
4. Verifique se o plano está ativo.

### Tela carregando para sempre

1. Atualize a página.
2. Confira internet.
3. Saia e entre novamente.
4. Se persistir, abra chamado.

### Dados não aparecem

1. Confira filtros.
2. Confira filial/unidade.
3. Confira se o registro foi salvo.
4. Confira permissões do usuário.

### Pix não aparece

1. Confira se existe fatura pendente.
2. Gere a cobrança no painel master.
3. Atualize a página Meu Plano.

### E-mail não chega

1. Confira spam.
2. Confirme o endereço.
3. Solicite reenvio.
4. Verifique SMTP no painel/servidor.

## 24. Dúvidas Frequentes dos Clientes

### Posso usar no celular?

Sim. O UpBarber é responsivo e funciona no navegador do celular.

### Posso acessar de outros computadores?

Sim. Basta acessar o domínio oficial e fazer login.

### Preciso instalar algo?

Não. O sistema roda pelo navegador.

### Posso criar mais usuários?

Sim, conforme permissões do plano e regras da barbearia.

### Meu cadastro foi feito. Por que não consigo entrar?

Porque o cadastro precisa de confirmação de e-mail e aprovação master.

### O que acontece se atrasar o pagamento?

O acesso pode ser bloqueado até regularização.

## 25. Melhorias Recomendadas

Prioridades para evoluir o sistema:

1. Permissões avançadas por grupo com interface completa.
2. Dashboard financeiro mais profundo por filial/barbeiro.
3. Integração real com gateway Pix automático e baixa automática.
4. Envio automático de lembretes de cobrança.
5. Integração oficial com WhatsApp Business API.
6. Logs de auditoria mais detalhados no painel.
7. Exportação de relatórios em PDF/Excel.
8. Central de ajuda dentro do sistema com vídeos.
9. Backup automatizado com painel de status.
10. Página pública comercial do UpBarber.
11. Módulo fiscal/recibos.
12. Aplicativo PWA instalável no celular.
13. Controle de consentimento dos clientes da barbearia.
14. Tela de revisão jurídica para termos aceitos por cada barbearia.
15. Monitoramento de erros em produção com alertas.


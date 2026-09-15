# Autenticação e perfis de acesso FirmaFloor

## Objetivo
Adicionar contas com e-mail e senha, perfil completo e dois níveis de acesso, preservando a calculadora pública, o visual atual e a impressão A4.

## Implementação
- Criar uma rota pública de acesso com cadastro, login, confirmação por e-mail e recuperação/redefinição de senha.
- Manter a calculadora disponível sem login como operador; no cabeçalho, mostrar “Entrar como administrador” para visitantes e os dados da conta com “Sair” para usuários conectados.
- Criar perfis com nome, avatar e preferências, além de uma tabela separada e protegida para as funções `admin` e `operador`.
- A primeira conta que concluir o acesso receberá `admin`; as seguintes receberão `operador`.
- Mostrar cadastro, alteração, exclusão e restauração de modelos somente para administradores.
- Manter seleção de modelos, cálculos, resultados, exportação e impressão disponíveis para visitantes e operadores.
- Trocar as permissões abertas do catálogo: leitura continuará pública, mas criação, alteração, exclusão e restauração serão aceitas pelo banco somente para administradores.
- Atualizar o catálogo após mudanças de sessão e limpar dados protegidos ao sair.

## Segurança
- A função do usuário ficará em tabela separada, nunca em dados editáveis do perfil ou armazenamento do navegador.
- A definição do primeiro administrador será atômica para impedir que duas contas recebam o papel ao mesmo tempo.
- As permissões serão verificadas no banco, além da ocultação dos controles na tela.
- Cadastro de conta não significará login imediato: com confirmação de e-mail ativa, a tela orientará a pessoa a confirmar o endereço.

## Validação
- Confirmar acesso público à calculadora e bloqueio dos controles de catálogo.
- Testar cadastro, confirmação esperada, login, indicador da conta e logout.
- Testar que admin gerencia modelos e operador não consegue alterar o catálogo, inclusive por chamada direta.
- Verificar desktop, celular, impressão A4, erros da página e integridade da compilação.

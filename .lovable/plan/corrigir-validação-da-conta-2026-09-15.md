# Corrigir validação da conta

## Implementação
- Remover a segunda consulta de autenticação dentro da inicialização do perfil.
- Usar o identificador, e-mail e nome já validados pelo middleware autenticado.
- Preservar a criação atômica do perfil, a definição de função e todas as permissões atuais.

## Validação
- Confirmar que a chamada autenticada inicializa e carrega o perfil sem tela em branco.
- Verificar login, página da calculadora, perfil e estado da compilação.

# Corrigir validação do token no login

## Objetivo
Eliminar o erro “Unauthorized: Invalid token” após o login, preservando integralmente a interface e o comportamento atual.

## Implementação
- Criar uma validação de autenticação específica do projeto, sem alterar o arquivo de integração gerenciado automaticamente.
- Manter `getClaims(token)` como primeira tentativa e, se houver erro ou exceção, validar o mesmo token com `getUser(token)`.
- Quando `getUser` confirmar o usuário, montar o contexto com `sub`, e-mail e metadados retornados pelo serviço de autenticação.
- Decodificar `sub` e `exp` do JWT apenas para diagnosticar token malformado ou expirado; nunca aceitar um payload apenas decodificado como prova de identidade, pois ele não possui verificação criptográfica.
- Conectar a inicialização do perfil à nova validação segura, sem mudanças visuais.

## Validação
- Confirmar que a compilação permanece íntegra.
- Testar o login pela tela `/auth`, a inicialização do perfil e a navegação até a calculadora.
- Confirmar ausência de “Unauthorized: Invalid token” no navegador e no servidor.

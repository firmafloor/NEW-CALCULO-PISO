# Corrigir autenticação na Vercel com segurança

## Objetivo
Eliminar o falso erro “Unauthorized: Invalid token” após um login válido, preservando integralmente a interface, os cálculos e o restante do funcionamento.

## Implementação
- Manter `getClaims(token)` como primeira validação criptográfica.
- Se ela não confirmar a sessão, validar com `getUser(token)` e repetir brevemente apenas quando houver falha de rede ou indisponibilidade temporária.
- Quando `getUser` confirmar a conta, construir o contexto com ID, e-mail e metadados retornados pelo serviço de autenticação.
- Decodificar `sub` e `exp` somente para reconhecer token malformado ou expirado; um payload apenas decodificado não será aceito como identidade, pois pode ser falsificado.
- Diferenciar credenciais realmente inválidas de indisponibilidade externa, evitando informar “token inválido” quando o servidor de autenticação estiver temporariamente inacessível.
- Não alterar arquivos de integração gerenciados, telas, estilos, cálculos ou permissões.

## Validação
- Confirmar compilação íntegra.
- Testar o login, a inicialização do perfil e a navegação para a calculadora.
- Confirmar que um token válido é aceito e que um token apenas forjado/decodificável continua rejeitado.

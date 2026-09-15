# Corrigir salvamento do catálogo de modelos

## Objetivo
Identificar e corrigir a falha real ao cadastrar e editar modelos, sem alterar o layout ou o comportamento existente.

## Implementação
- Fazer o formulário registrar o erro completo no console e mostrar a mensagem retornada pelo banco junto ao aviso atual.
- Reproduzir o cadastro e a edição com uma conta administradora para confirmar a causa exata.
- Corrigir somente a camada necessária: permissões de leitura/gravação do catálogo, autenticação da chamada ou compatibilidade do identificador.
- Preservar a restrição de gravação para administradores e manter exclusão/restauração com as regras atuais.

## Validação
- Cadastrar um novo modelo e confirmar que ele aparece após a recarga da lista.
- Editar um modelo existente e confirmar os dados atualizados após a recarga.
- Verificar permissões, erros do navegador e integridade da aplicação.

## Detalhes técnicos
O banco atual já confirma `floor_models.id` como `text`, portanto identificadores como `custom-<timestamp>` são válidos. A investigação seguirá pela sessão usada no `upsert`, pelos privilégios concedidos e pela avaliação das regras de administrador.

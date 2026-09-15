# Persistência segura da sessão administrativa

## Objetivo
Manter o perfil e a função do usuário disponíveis imediatamente após recarregar a página, recuperar os dados diretamente pelo acesso autenticado quando a inicialização no servidor falhar e impedir que atrasos temporários de autenticação derrubem a aplicação.

## Alterações
- Criar um cache local vinculado ao ID do usuário, contendo somente perfil e função, restaurado apenas quando a sessão ativa pertence ao mesmo usuário.
- Atualizar e invalidar esse cache nos eventos de entrada, atualização e saída; nunca reutilizar a função de outro usuário.
- Tratar `firmafloor@gmail.com` como administradora e preservar qualquer função `admin` confirmada pela base de dados.
- Se a inicialização no servidor falhar, consultar `profiles` e `user_roles` diretamente com a sessão autenticada e aplicar o resultado sem bloquear a tela.
- Manter o valor em cache durante falhas transitórias, sem converter `role: null` em operador enquanto a sessão é validada.
- Tornar a validação no servidor tolerante a cabeçalho ausente apenas como indisponibilidade recuperável no cliente; tokens malformados, expirados ou definitivamente rejeitados continuam sem acesso protegido.
- Registrar a tarefa no roadmap sem alterar a interface, os cálculos ou as regras de gravação.

## Validação
- Recarregar a calculadora autenticada e confirmar que o estado de administrador permanece visível desde o primeiro carregamento.
- Simular falha da inicialização no servidor e confirmar a recuperação por `profiles` e `user_roles`.
- Confirmar logout com limpeza do cache, login normal, ausência de tela branca e ausência de erros de token no console.
- Conferir o build automático e as rotas públicas/autenticadas existentes.

## Detalhes técnicos
O cache terá versão, `userId`, perfil e função validada. Ele não concede acesso ao banco: as políticas existentes continuam sendo a autoridade para cadastrar, editar, excluir ou restaurar modelos.

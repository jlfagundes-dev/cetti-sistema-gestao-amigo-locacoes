# Amigo Locações

Sistema mobile-first para gestão de locações de equipamentos da Amigo Locações.

## Status

A aplicação contém as bases das **Fases 1, 2 e 3 do MVP**:

- Dashboard operacional com indicadores e estados vazios.
- Cadastro local de clientes com endereço completo do cliente, múltiplos endereços de obra e link de localização copiado do WhatsApp para abrir no Maps (persistência temporária no navegador).
- Catálogo inicial de equipamentos e regras de preço configuráveis.
- Criação de orçamentos com múltiplos equipamentos, cálculo automático, desconto, status e impressão para PDF.
- Conversão de orçamentos em locações, renovações com histórico e controle financeiro local.
- Renovações calculadas por novo ciclo, usando a faixa de preço do período adicional sem recalcular o ciclo anterior.
- Cobrança financeira gerada automaticamente ao criar a locação, com vencimento no início mais o período contratado e recebimentos parciais.
- Tela de recolhimentos com filtros, status da coleta, Maps, navegação e WhatsApp.
- Navegação responsiva para desktop e celular.
- Diretrizes do projeto em [`.github/copilot-instructions.md`](./.github/copilot-instructions.md).

O modo local é identificado na interface e será mantido durante todas as fases do MVP. A integração com Supabase Auth, PostgreSQL, Storage e RLS será feita somente depois da conclusão dos módulos.

## Supabase

O cliente oficial e a primeira migration já estão preparados em [`supabase/migrations`](./supabase/migrations). O arquivo `.env.local` contém somente a URL e a chave pública do projeto e permanece ignorado pelo Git.

As tabelas da migration usam RLS e liberam acesso apenas para usuários autenticados. A aplicação ainda continua usando o modo local até a autenticação e a migração de cada módulo serem implementadas.

Depois de aplicar a migration no projeto Supabase, crie o primeiro usuário em **Authentication > Users**. Não publique a senha do banco nem qualquer chave `service_role`/`secret`.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Validação

```bash
npm run lint
npm run build
```

## Próximas fases

1. Supabase Auth, schema relacional, migrations e RLS.
2. Orçamentos, cálculo persistente e PDF.
3. Locações, renovações e financeiro.
4. Recolhimentos, roteiro e navegação.
5. Autentique, WhatsApp Cloud API e webhooks.

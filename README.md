# Amigo Locações

Sistema mobile-first para gestão de locações de equipamentos da Amigo Locações.

## Status

A aplicação contém as bases das **Fases 1, 2, 3 e 4 do MVP**, com a autenticação e o cadastro de clientes já integrados ao Supabase:

- Dashboard operacional com indicadores e estados vazios.
- Cadastro de clientes com endereço completo, múltiplos endereços de obra e link de localização copiado do WhatsApp para abrir no Maps. Com Supabase configurado, clientes e endereços de obra são persistidos no banco; sem conexão, o cadastro usa o armazenamento local como fallback.
- Catálogo de equipamentos e regras de preço configuráveis. Com Supabase configurado, equipamentos, regras e status ativo são persistidos no banco; se o catálogo remoto estiver vazio, os cinco equipamentos iniciais são cadastrados automaticamente. Sem conexão, o catálogo usa o armazenamento local como fallback.
- Criação de orçamentos com múltiplos equipamentos, cálculo automático, desconto, status e impressão para PDF. Com Supabase configurado, orçamentos e itens são persistidos nas tabelas `quotes` e `quote_items`.
- Conversão de orçamentos em locações, renovações com histórico e controle financeiro local.
- Renovações calculadas por novo ciclo, usando a faixa de preço do período adicional sem recalcular o ciclo anterior.
- Cobrança financeira gerada automaticamente ao criar a locação, com vencimento no início mais o período contratado e recebimentos parciais.
- Tela de recolhimentos com filtros, status da coleta, Maps, navegação e WhatsApp.
- Navegação responsiva para desktop e celular.
- Diretrizes do projeto em [`.github/copilot-instructions.md`](./.github/copilot-instructions.md).

Os módulos que ainda não foram migrados continuam usando `localStorage`. A migração para o Supabase será feita gradualmente para preservar o funcionamento do sistema durante a transição.

## Supabase

O cliente oficial e a primeira migration já estão preparados em [`supabase/migrations`](./supabase/migrations). O arquivo `.env.local` contém somente a URL e a chave pública do projeto e permanece ignorado pelo Git.

As tabelas da migration usam RLS e liberam acesso apenas para usuários autenticados. A aplicação exige login quando o Supabase está configurado; clientes e seus endereços são carregados e salvos nas tabelas `customers` e `customer_addresses`, equipamentos e regras nas tabelas `equipment` e `equipment_price_rules`, e orçamentos e itens nas tabelas `quotes` e `quote_items`.

Depois de aplicar a migration no projeto Supabase, crie o primeiro usuário em **Authentication > Users**. Não publique a senha do banco nem qualquer chave `service_role`/`secret`.

Se aparecer `permission denied for table customers`, execute no SQL Editor o arquivo [`20261108164000_grant_authenticated_table_access.sql`](./supabase/migrations/20261108164000_grant_authenticated_table_access.sql). Ele concede as permissões SQL necessárias à role `authenticated`; o RLS continua ativo.

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

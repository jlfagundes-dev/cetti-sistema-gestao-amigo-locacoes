# Amigo Locações

Sistema mobile-first para gestão de locações de equipamentos da Amigo Locações.

## Status

A aplicação contém a base da **Fase 1 do MVP**:

- Dashboard operacional com indicadores e estados vazios.
- Cadastro local de clientes com endereço completo do cliente e múltiplos endereços de obra para entrega e recolhimento (persistência temporária no navegador).
- Catálogo inicial de equipamentos e regras de preço configuráveis.
- Navegação responsiva para desktop e celular.
- Diretrizes do projeto em [`.github/copilot-instructions.md`](./.github/copilot-instructions.md).

O modo local é identificado na interface e não substitui o banco de produção. A próxima etapa deve conectar Supabase Auth, PostgreSQL, Storage e RLS antes do uso real.

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

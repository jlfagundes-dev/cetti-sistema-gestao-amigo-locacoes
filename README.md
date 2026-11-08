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
- Navegação responsiva para desktop e celular.
- Diretrizes do projeto em [`.github/copilot-instructions.md`](./.github/copilot-instructions.md).

O modo local é identificado na interface e será mantido durante todas as fases do MVP. A integração com Supabase Auth, PostgreSQL, Storage e RLS será feita somente depois da conclusão dos módulos.

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

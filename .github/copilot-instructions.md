# Diretrizes do projeto

## Objetivo

Aplicação web mobile-first para gestão da Amigo Locações de equipamentos para construção civil. A interface deve ser simples para usuários não técnicos, com poucos cliques e feedback claro.

## Arquitetura

- Use Next.js com React, TypeScript e Tailwind CSS.
- Separe componentes de interface, regras de negócio, serviços, integrações e acesso a dados.
- Até todas as fases do MVP serem concluídas, use persistência local temporária no navegador. Não iniciar a integração com Supabase antes dessa etapa.
- Quando chegar a hora, mantenha integrações com Supabase, Autentique e WhatsApp atrás de serviços próprios.
- Nunca exponha chaves privadas no navegador.
- Toda operação do modo local deve persistir no armazenamento do navegador; não trate dados fictícios como dados reais.

## Regras de negócio

- Preços devem ser configuráveis e calculados por um serviço centralizado, nunca fixados nos componentes.
- Preserve histórico de clientes, locações, pagamentos e renovações; não sobrescreva contratos anteriores.
- Renovações podem alterar o período original ou iniciar um novo ciclo, com diferença e histórico explícitos.
- No fluxo operacional atual, cada renovação é um novo ciclo independente: calcule a faixa de preço somente para os dias renovados, some ao acumulado e preserve o que já foi cobrado.
- Orçamentos assinados podem virar locações; pagamentos aceitam recebimentos parciais e nunca devem apagar histórico.
- Use os status e condições comerciais definidos no escopo do projeto.

## Experiência e qualidade

- Priorize telas de operação em celular, especialmente recolhimentos.
- A tela de recolhimentos deve permitir filtrar por data, abrir a localização da obra, iniciar navegação, contatar o cliente e atualizar o resultado da coleta.
- Valide formulários, trate erros explicitamente e confirme exclusões.
- Use indicadores visuais de status acessíveis e feedback após operações.
- Para mudanças de banco, crie migrations SQL e mantenha RLS no Supabase.
- Ao concluir uma fase, documente arquivos, como testar, configurações externas e pendências no README.

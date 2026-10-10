# ÍNDICE DAS TELAS

> Geradas em 27/07/2026 a partir da massa de demonstração do município fictício
> **Prefeitura Municipal de Modelo (CE)**. Nenhum dado é real: pessoas, empresas,
> CPF, CNPJ e valores são inventados para a apresentação.

> Resolução: 1920×1080 de layout, exportadas em 2× para projeção.

| # | Arquivo | Serve a qual argumento | Dor |
|---|---|---|---|
| 01 | `01-dashboard.png` | Slide 3 — o sistema em uma frase. Visão geral do município em uma tela. | — |
| 02 | `02-alertas-pendencias.png` | Slide 6 — "o processo sumiu e o prazo estourou". É a tela que mais impressiona: tudo que está pegando fogo, em um lugar só. | Dor 3 |
| 03 | `03-contratos-vencimento.png` | Slide 4 — "contrato venceu e ninguém me avisou". A faixa de alerta nomeia os contratos e os dias que faltam. | Dor 1 |
| 04 | `04-contratos-vigencia.png` | Slide 4 (apoio) — a carteira inteira separada em expirados, vencendo e vigentes. | Dor 1 |
| 05 | `05-did-certidoes.png` | Slide 5 — "paguei com certidão vencida e o Tribunal glosou". Conferência de certidões dentro do fluxo da despesa. | Dor 2 |
| 06 | `06-processos-parados.png` | Slide 6 (apoio) — a fila real de processos, com prioridade e setor atual. | Dor 3 |
| 07 | `07-processo-historico.png` | Slide 7 — "só a Dona Fulana sabe onde está o processo". Histórico com nome, data e hora de cada passo. | Dor 4 |
| 08 | `08-tesouraria-saldo.png` | Slide 8 — "não sei quanto tenho em caixa hoje". Saldo por conta e extrato conciliado. | Dor 5 |
| 09 | `09-relatorios.png` | Slide 9 (Antes × Depois) — o relatório que hoje leva dias sai em um clique, em PDF e planilha. | — |
| 10 | `10-almoxarifado-critico.png` | Anexo — estoque abaixo do mínimo e cotas por setor. | — |
| 11 | `11-consulta-publica.png` | Anexo / Slide 10 — transparência: o cidadão consulta sem login e sem expor dado pessoal. | — |
| 12 | `12-registros-auditoria.png` | Slide 10 — riscos que deixam de existir. Quem fez, o quê, quando e de qual computador. | — |
| 13 | `13-permissoes.png` | Anexo — segregação de funções: permissão por módulo e por ação. | — |

## Arquivos gerados pelo próprio sistema

Ficam em `telas/arquivos/`. Não são imagens: são o PDF e a planilha que o jProcesso
produz de verdade. Abra-os na frente do prefeito — vale mais que um print.

## Registros usados como exemplo

- **Histórico de tramitação:** Proc.2026.0000028 - SESAU — Aquisição de medicamentos básicos – 2ª parcela
- **DID / certidões:** Proc.2026.0000039 - SESAU — Recarga de oxigênio medicinal do Hospital Municipal – Junho/2026

## Como recapturar

```bash
npm run demo:tensao        # reacende os alertas com base na data de hoje
npm run dev                # backend  (porta 5001)
npm run client             # frontend (porta 3000)
npm run apresentacao:telas # captura tudo de novo
```

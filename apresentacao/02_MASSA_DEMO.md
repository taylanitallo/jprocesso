# 02 — MASSA DE DEMONSTRAÇÃO

Município fictício **Prefeitura Municipal de Modelo (CE)**, base `tenant_modelo`, endereço `/modelo`.
Nenhum dado é real: pessoas, empresas, CPF, CNPJ, contas e valores são inventados. Os CPFs e CNPJs
são gerados com dígito verificador válido apenas para o sistema aceitá-los — não pertencem a ninguém.

## O que já existia

O repositório já trazia um seed maduro em [seed_demo_modelo.js](../server/scripts/seed_demo_modelo.js),
com gerador determinístico e dados coerentes entre módulos:

| | |
|---|---|
| Secretarias / setores | 13 / 41 |
| Usuários | 40 (Prefeito, secretários, controladora, protocolo, compras, contabilidade, tesouraria…) |
| Processos | 67, com **6,6 tramitações em média** e até 19 no mais longo |
| DIDs | 30 (contas fixas e variáveis) |
| Contratos / ordens | 30 / 32 |
| Contas bancárias | 30 (FPM, FUNDEB, convênios, CIP, royalties…) |
| Itens de almoxarifado / bens | 34 / 34 |
| Registros de auditoria | 404 |

## O que estava faltando — e foi corrigido

Rodando o sistema com essa massa, **três telas de venda apareciam vazias ou erradas**:

| Problema encontrado | Efeito na apresentação | Correção |
|---|---|---|
| Os 30 contratos venciam só no fim do exercício. Nenhum expirado, nenhum vencendo. | O Painel de Contratos — a **dor nº 1** do deck — ficava sem nenhum alerta. Tela vazia. | [seed_demo_tensao.js](../server/scripts/seed_demo_tensao.js) reposiciona 9 vigências **em relação à data de hoje**. |
| Só 1 item abaixo do estoque mínimo. | Alerta de estoque quase mudo. | Eleva o estoque mínimo de 4 itens (campo de política, não mexe em saldo nem no histórico de movimentação). |
| Receitas iam para contas específicas e despesas para a Conta Movimento Geral. | O relatório de Tesouraria mostrava a **conta principal do município com saldo negativo**. Péssimo em frente a um prefeito. | Lança a arrecadação própria e a transferência interna que alimentam essa conta na vida real. |
| `GET /api/almoxarifado/dashboard` respondia **erro 500**. | Os cartões "Estoque Crítico" e "Req. Pendentes" do Dashboard mostravam **0**. | Defeito de produto, corrigido — ver seção abaixo. |

### Como ficou a tensão em tela

| Onde | Antes | Depois |
|---|---|---|
| Contratos expirados | 0 | **2** — R$ 97.200 |
| Vencendo em até 30 dias | 0 | **3** — R$ 715.800 (oxigênio do hospital em 8 dias, veículos da Saúde em 17, transporte escolar em 28) |
| Vencendo em 31–90 dias | 0 | **4** — R$ 1.360.050 |
| Itens em estoque crítico | 1 | **5** |
| Requisições aguardando autorização | 5 (não apareciam) | **5** (aparecem) |
| Processos parados há +48h | 35 | 35 |
| Processos urgentes em aberto | 2 | 2 |
| Saldo da Conta Movimento Geral | **−R$ 921.381,72** | **+R$ 525.056,85** |

A escolha dos contratos não foi aleatória: os que vencem primeiro são os que doem —
oxigênio hospitalar, veículos das equipes de saúde e transporte escolar da zona rural.
É o que faz o prefeito se mexer na cadeira.

## Comandos

```bash
npm run demo:tensao:simular   # mostra o que seria alterado, sem gravar nada
npm run demo:tensao           # aplica (o padrão do script é NÃO gravar)
npm run demo:tensao:desfazer  # desfaz, a partir do snapshot gravado
npm run demo:reset            # apaga e reconstrói toda a massa do zero
npm run demo:preparar         # reset + tensão, do zero ao pronto em um comando
```

**Rode `npm run demo:tensao` na véspera de cada apresentação.** Os prazos são calculados a partir
da data de hoje, então os alertas nunca envelhecem — "vence em 8 dias" continua sendo 8 dias.

### Segurança do script

- Só opera na base `tenant_modelo` e ainda confere se o município se chama "Modelo". Em qualquer
  outra base, **aborta**.
- **Não grava nada sem `--aplicar`.** O padrão é simulação.
- Grava os valores originais em `seed_demo_tensao.backup.json` antes de escrever, e o
  `--restaurar` devolve tudo — inclusive apagando as receitas que ele inseriu, identificadas por marcador.
- Tudo dentro de uma transação: ou aplica inteiro, ou não aplica nada.

## Acesso para a demonstração

Senha de todos: `123456` (entra por CPF ou e-mail). Os CPFs são sempre os mesmos a cada reset.

| Perfil | Nome | CPF | Onde aparece no DID |
|---|---|---|---|
| Administrador (o do município, mantido no reset) | Administrador Modelo | `02680278380` (DEV) | vê tudo |
| Prefeito (gestor) | Francisco das Chagas Oliveira Neto | `82557587044` | — |
| Controladora Geral | Helena Cássia Brito Vasconcelos | `04858588190` | Controle Interno |
| Procurador | Renato Augusto Paiva Sales | `73388935785` | Assessoria Jurídica — Parecer (etapa personalizada) |
| Secretário de Finanças | Sebastião Alves Correia Júnior | `50569515955` | Autorização e Pagamento |
| Contadora | Ana Cristina Barroso Freitas | `57434126426` | Empenho, Liquidação e Fechamento |
| Tesoureiro | Marcos Vinícius Teixeira Prado | `24615495161` | Tesouraria (paga e debita a conta) |
| Compras | Patrícia Kelly Andrade Nogueira | `65894089557` | Solicitação, Ordem e Ateste |
| Almoxarife | Fábio Henrique Martins Cavalcante | `92009797183` | Recebimento |
| Protocolo | Antônia Cleide Ferreira Gomes | `73885785790` | abre processos |

Entrar como **Prefeito** é um bom efeito de reunião: ele vê a tela pelos olhos dele. Mas o perfil
gestor filtra os dados pela secretaria do usuário — para mostrar o município inteiro, use o administrador.

### Assinatura eletrônica ao vivo

Todos os usuários de demonstração (menos administradores) já têm o aplicativo autenticador cadastrado
**com o mesmo segredo**: cadastre uma vez no celular (Google Authenticator, Microsoft Authenticator…)
e você assina como qualquer um deles com a senha `123456` + o código do app.

- Chave para digitar no app: `7NNKL62D5SFJZRVWTO6O3MMCEDWUBIRJ` (conta "jProcesso — Demonstração (modelo)")
- É a mesma no DEV e em produção. Só vale para os usuários fictícios do município Modelo.

## O que a massa mostra (desde 14/10/2026)

O seed passou a cobrir as funcionalidades novas e a acompanhar a data de hoje:

- **Linha do tempo atual:** os dados são escritos em fev–jul/2026 e deslocados para que a última
  movimentação caia no dia em que o seed roda (inclusive datas dentro de textos e "Mês/2026").
- **DID por etapas:** os 30 DIDs seguem o fluxo com setores, recebimento e assinatura em cada etapa.
  Há DIDs concluídos, parados em cada setor (prontos para concluir ao vivo), aguardando recebimento
  e **dois devolvidos** à etapa anterior com justificativa assinada.
- **Fluxos de Processo:** Contas Fixas está na **versão 2**, com a etapa personalizada
  "Assessoria Jurídica — Parecer" (texto, sim/não, checklist e nº do parecer); a versão 1 fica no
  histórico. Os DIDs mais recentes usam a v2 e os antigos continuam na v1 — mostra que "cada DID
  segue o fluxo com que começou".
- **Assinaturas eletrônicas** em todos os atos dos DIDs e dos processos dos últimos 75 dias,
  conferíveis em `/verificar` pelo código e CRC.
- **Anexos em PDF** (nota fiscal, certidões, comprovante de pagamento, ofícios, requerimentos, atas),
  todos marcados como documento fictício.
- **Licitações** de todos os contratos (homologadas) e outras em andamento, publicada, suspensa,
  deserta, fracassada e revogada.
- **Contratos** encerrado, suspenso e rescindido (vencidos e a vencer ficam com `demo:tensao`).
- **Lixeira** com um registro excluído em cada tela (licitação, credor, conta, receita, item,
  usuário e processo) para mostrar "Excluídos" e "Restaurar".
- **Grupos de contas** da Tesouraria para o tesoureiro e o secretário de finanças.

### DIDs prontos para concluir ao vivo

| DID | Etapa atual | Quem conclui |
|---|---|---|
| SEMAS-002 (aluguel do CRAS, fluxo v2) | Assessoria Jurídica — Parecer | Procurador |
| SEMAD-014 (água, fluxo v2) | Controle Interno | Controladora |
| SEMAD-008 (internet) | Tesouraria | Tesoureiro |
| SEMAD-013 (expediente) | Almoxarifado — Recebimento | Almoxarife |
| SEMAD-010 (software) | Contabilidade — Fechamento | Contadora |
| SESAU-006 (oxigênio) | devolvido à Abertura (FGTS vencida) | Secretária de Saúde |

## Ressalvas antes de demonstrar

1. **Rode `npm run demo:preparar` na véspera** (reset + tensão). O reset leva cerca de 10 minutos
   por causa das ~700 assinaturas; se a conexão com o banco cair, ele repete a operação sozinho.
2. **Várias contas bancárias aparecem com R$ 0,00** no relatório de saldos. É verossímil (conta sem
   movimento no período), mas se preferir uma tela mais cheia, filtre o período no topo do relatório.
3. **Em produção**, rode o seed com as variáveis do servidor de produção (`railway run`): as
   assinaturas e o autenticador usam o `ASSINATURA_SEGREDO` de lá.

## Defeito de produto encontrado e corrigido

Durante a preparação, o painel do Almoxarifado quebrou:

```
GET /api/almoxarifado/dashboard → 500
invalid input value for enum enum_almoxarifado_requisicoes_status: "PENDENTE"
```

O painel contava requisições com `status IN ('PENDENTE', 'PENDENTE_AUTORIZACAO')`, mas `PENDENTE`
é um valor **legado que não existe** no enum do banco — nem na base de demonstração, nem na de
Irauçuba. O Postgres rejeitava a comparação inteira e derrubava a requisição com erro 500.

Consequência em produção: os cartões **"Estoque Crítico"** e **"Req. Pendentes"** do Dashboard
mostravam sempre **0**, e os alertas de estoque nunca apareciam — para qualquer município.

Corrigido em [almoxarifadoController.js:192](../server/controllers/almoxarifadoController.js#L192),
mantendo apenas o valor válido. Depois da correção: 200 OK, 5 itens críticos, 5 requisições pendentes.

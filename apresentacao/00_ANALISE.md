# 00 — ANÁLISE DO SISTEMA (autodescoberta a partir do código)

> Levantado lendo: `package.json`, `docs/licitacao/*`, modelos Sequelize (`server/models/`),
> rotas (`server/routes/`), controladores (`server/controllers/`), páginas do frontend
> (`client/src/pages/`), seed de demonstração (`server/scripts/seed_demo*`) e histórico do git.
> **Tudo que está aqui foi localizado no código.** O que não foi, está em [A_VALIDAR.md](A_VALIDAR.md).

---

## 1. IDENTIFICAÇÃO

| Item | Achado | Onde |
|---|---|---|
| **Nome** | **jProcesso** (pacote `jprocesso-tramitacao` v1.0.0) | [package.json:2](../package.json#L2) |
| **Fabricante** | JEOS Sistemas e Assessorias | [package.json:20](../package.json#L20), [aylaService.js:8](../server/services/aylaService.js#L8) |
| **Domínio** | Gestão administrativa e de execução da despesa municipal — do protocolo do processo até o pagamento em tesouraria | modelos `Processo`, `Did`, `Contrato`, `TesDespesa` |
| **Modelo comercial** | SaaS (locação), 1 município = 1 base isolada por *schema* PostgreSQL | [Tenant.js:27](../server/models/Tenant.js#L27) |
| **Setor da prefeitura que ele serve** | Transversal, mas com centro de gravidade em **Administração (protocolo/compras/almoxarifado)** e **Finanças (contabilidade/tesouraria)** | seed cria 13 secretarias, mas o fluxo do DID passa por SEMAD + SEFIN + CGM |
| **Usuário diário** | Servidora do Protocolo, do Setor de Compras, da Contabilidade, do Controle Interno e da Tesouraria — quem abre, tramita, empenha, liquida e paga | perfis `operacional` em [User.js:42](../server/models/User.js#L42) |
| **Decisor da compra** | **Prefeito**, com influência forte do **Secretário de Administração** e do **Secretário de Finanças**; a Controladoria costuma ser o "campeão interno" | pacote de licitação em `docs/licitacao/` já mira o Executivo Municipal |
| **Enquadramento da contratação já preparado** | Pregão eletrônico, Lei 14.133/2021, menor preço, locação SaaS 12 meses + implantação | [docs/licitacao/05-Termo-de-Referencia.md](../docs/licitacao/05-Termo-de-Referencia.md) |

**Frase de identificação (linguagem de gestor):**
> O jProcesso é o sistema onde o processo administrativo do município nasce, anda, é
> instruído, é empenhado, é liquidado, é pago — e fica registrado, com data, hora e nome
> de quem fez cada passo.

---

## 2. MAPA DE MÓDULOS

| Módulo | O que resolve | Telas | Saídas oficiais | Perfis | Maturidade |
|---|---|---|---|---|---|
| **Processos / Tramitação** | Protocolo com numeração `AAAA.NNNN` automática, tramitação entre setores com despacho, devolução com justificativa, recebimento, conclusão, arquivamento, prioridade (baixa→urgente), QR Code por processo | Processos, Entrada, Enviados, Novo Processo, Detalhes do Processo, Arquivo | PDF de despacho, QR Code do processo | admin / gestor / operacional | **Pronto** |
| **DID — instrução da despesa** | Formulário estruturado que segue a despesa pelas 7 seções: Secretaria → Controle Interno → Compras → Contabilidade (empenho/liquidação) → Finanças → Tesouraria (pagamento e descontos) → Fechamento contábil. Duas variantes: contas **fixas** e contas **variáveis** | Formulário DID + 7 seções fixas + 12 seções variáveis + seção de recebimento | **PDF do DID completo** ([gerarDidPDF.js](../client/src/pages/did/gerarDidPDF.js)) | quem tem `financeiro.processos_did` | **Pronto** (é o módulo mais trabalhado do repositório) |
| **Contratos e Ordens** | Contratos, atas de registro de preços, credores, catálogo de itens com vínculo, ordens de compra e de serviço, saldo por contrato, **alerta de vigência** (expirado / ≤30d / 31–90d) | Contratos, Painel de Contratos, abas Contratos/Credor/Itens/Ordens/Relatórios | PDF de ordem, relatórios | `contratos.*` | **Pronto** |
| **Financeiro** | Lançamentos, despesas, empenhos e dotações por secretaria; painel com valor pago no exercício | Financeiro (+ abas) | PDF do painel ([gerarPainelPDF.js](../client/src/pages/financeiro/gerarPainelPDF.js)) | `financeiro.*` | **Pronto** |
| **Tesouraria** | Contas bancárias, receitas, despesas, **saldo por conta**, **fluxo mensal** e **extrato conciliado** que soma despesas avulsas + DIDs pagos | Tesouraria (+ abas) | Extrato, relatórios | `tesouraria.*` | **Pronto** |
| **Almoxarifado** | Itens, entradas por lote/empenho, movimentações, requisições por setor com fluxo de autorização, **cotas mensais por setor**, inventário e trilha de auditoria própria | Painel, Itens, Lotes, Movimentações, Requisições, Solicitações, Cotas, Inventário, Auditoria | Relatórios | `almoxarifado.*` (9 sub-permissões) | **Pronto** |
| **Patrimônio** | Tombamento sequencial, grupos com taxa de depreciação conforme **TCE-CE / Lei 4.320 art. 94**, entrada por NF/empenho, transferência, responsabilidade, baixa, inventário | Painel, Bens, Entrada, Grupos, Transferência, Baixa, Inventário | Relatórios | `patrimonio.*` | **Pronto** — *mas excluído do objeto da licitação já redigida* |
| **Organização** | Entidade, secretarias, setores e **responsáveis por cargo e período** (histórico da estrutura administrativa) | Organização (abas) | — | `administracao.gerenciar_secretarias` | **Pronto** |
| **Usuários e permissões** | 3 perfis (admin/gestor/operacional) + **permissões granulares por módulo, aba e ação** em JSON — dá para liberar "ver" e negar "aprovar" dentro da mesma secretaria | Usuários, Editor de Permissões | — | `administracao.gerenciar_usuarios` | **Pronto** |
| **Documentos oficiais** | Geração de Ofício, Determinação Institucional, Comunicado, Portaria e Decreto com timbrado/brasão do município | dentro de Processos/Detalhes | **PDF timbrado** ([gerarDocumentoPDF.js](../client/src/utils/gerarDocumentoPDF.js)) | `processos.anexar_documento` | **Pronto** |
| **Relatórios** | Estatísticas de processos, por setor, tempo médio de conclusão, atrasados | Relatórios | **PDF** (jsPDF) e **Excel real** (XLSX, com aba de resumo institucional) | `administracao.visualizar_relatorios` | **Pronto** |
| **Registros (auditoria)** | Log por usuário, ação, módulo, registro afetado, **IP e navegador**, com filtro por módulo | Registros | consulta em tela | `administracao.visualizar_registros` | **Pronto** |
| **Consulta Pública** | Portal **sem login** para o cidadão consultar andamento por número, assunto, interessado, secretaria ou nº do DID — com remoção de CPF/e-mail/telefone antes de responder | `/{municipio}/consulta` | — | público | **Pronto** |
| **Configurações** | Identidade visual: logo, brasão, cores, timbrado e margens dos documentos | Configurações (abas) | — | `administracao.gerenciar_configuracoes` | **Pronto** |
| **Backup e restauração** | Backup do *schema* do município em SQL, empacotado e guardado em armazenamento em nuvem, com **agendamento**, histórico, download e restauração | Painel do fabricante (superadmin) | arquivo SQL/ZIP | superadmin | **Pronto** |
| **Portabilidade (import/export)** | Exportação de processos e demais entidades em **CSV e JSON**, e importação | via API/telas | CSV / JSON | autenticado | **Parcial** — cobre as entidades principais, não é um "leva tudo" de um clique |
| **Ayla (assistente)** | Assistente que responde em linguagem natural sobre processos urgentes, pendentes, contratos vencendo e estoque baixo, usando só os dados do próprio município | widget flutuante | — | autenticado | **Parcial** — depende de serviço externo de IA configurado; sem chave, cai em resposta de fallback |
| **NFS-e** | Leitura de nota fiscal de serviço pelo padrão nacional a partir da chave ou do QR Code, com validação do tomador | dentro do fluxo de compras | — | — | **Esboço/parcial** — CNPJ do tomador está **fixo no código** e há *fallback* simulado quando a API nacional não responde |

---

## 3. CONFORMIDADES E OBRIGAÇÕES LEGAIS ATENDIDAS

O que o sistema **faz o município cumprir**, com o ponto do código que sustenta:

| Obrigação | Como o jProcesso atende | Evidência |
|---|---|---|
| **Transparência passiva (LAI, Lei 12.527/2011)** | Portal de consulta pública sem cadastro, por número de protocolo, com QR Code no processo | [processoController.js:961](../server/controllers/processoController.js#L961), `qrcode` no modelo Processo |
| **LGPD (Lei 13.709/2018)** | CPF/CNPJ, e-mail e telefone do interessado são **removidos** antes de qualquer resposta pública; senhas em hash bcrypt; dados de cada município em base separada | [processoController.js:950](../server/controllers/processoController.js#L950) e :1028 |
| **Motivação e rastreabilidade do ato administrativo** | Toda tramitação grava origem, destino, usuário, data/hora e despacho; devolução exige justificativa | modelo `Tramitacao`, `devolverProcesso` |
| **Controle interno (CGM)** | Seção II do DID é do Controle Interno, com data de recebimento, responsável, despacho, dotação e fonte de recurso | [Did.js:48-54](../server/models/Did.js#L48) |
| **Regularidade fiscal do credor antes do pagamento** | Conferência de CND Federal, FGTS, Trabalhista, Estadual, Municipal e Simples Nacional em **três momentos** (solicitação, contabilidade e tesouraria), com anexo dos arquivos | `cert_sec1_*`, `cert_*`, `cert_teso_*` em [Did.js](../server/models/Did.js) |
| **Estágios da despesa (Lei 4.320/64)** | Campos separados de **empenho**, **liquidação** e **pagamento**, cada um com número, data e responsável | `empenho_numero`, `liquidacao_numero`, `pago` em `Did` |
| **Retenções legais** | INSS, ISS, IRRF, pensão, sindicato e outros descontos calculados no pagamento | `desconto_*` em `Did` |
| **Depreciação de bens (Lei 4.320/64, art. 94 / TCE-CE)** | Grupos de bens com vida útil e taxa de depreciação padrão do TCE-CE | [PatGrupo.js:10](../server/models/PatGrupo.js#L10) |
| **Vigência contratual (Lei 14.133/2021)** | Alerta configurável por contrato (`dias_alerta`, padrão 30) e painel de vencimentos | [Contrato.js:26](../server/models/Contrato.js#L26), [ContratosDashboard.jsx:328](../client/src/pages/ContratosDashboard.jsx#L328) |
| **Trilha de auditoria para o TCE** | Log imutável para o usuário comum, com IP e navegador, filtrável por módulo | [Log.js](../server/models/Log.js), [routes/log.js](../server/routes/log.js) |
| **Segregação de funções** | Permissões por módulo **e por ação** (ver/criar/editar/excluir/aprovar), por usuário | [User.js:72-84](../server/models/User.js#L72) |
| **Continuidade e portabilidade dos dados** | Backup agendado do município + exportação em CSV/JSON a qualquer tempo | `backupService.js`, `routes/importexport.js` |

> ⚠️ **Limite honesto:** o DID tem o campo *"Enviado para o TCE/SIM"* como **marcação de controle (sim/não)**
> — o sistema **não gera** o arquivo de remessa do SIM/TCE-CE. Ver Lacunas.

---

## 4. DIFERENCIAIS DEFENSÁVEIS

1. **O DID inteiro dentro do sistema, com PDF fiel ao formulário de papel.**
   Não é um "campo de observação": são 7 seções (fixas) e 12 (variáveis) espelhando exatamente
   o caminho que o papel faz hoje na prefeitura — Controle Interno, Compras, Contabilidade,
   Finanças, Tesouraria, Recebimento e Fechamento. Um concorrente genérico de protocolo não tem isso.

2. **Base separada por município, não filtro de tela.**
   Cada prefeitura tem seu próprio *schema* no banco, e o token de sessão é amarrado ao município —
   um acesso de um município não alcança o outro nem por erro de programação
   ([routes/log.js](../server/routes/log.js) documenta essa ordem de verificação explicitamente).
   É exatamente o requisito que o Termo de Referência exige e que soluções de base compartilhada não atendem.

3. **Permissão por ação, não por perfil fechado.**
   O prefeito pode ter um servidor que **vê** o financeiro mas **não aprova**; que **registra saída**
   de almoxarifado mas **não autoriza requisição**. Isso é o que o TCE chama de segregação de funções.

4. **Do processo ao extrato bancário, sem redigitar.**
   Ordem de compra → DID → empenho → liquidação → pagamento → extrato da conta. O extrato da
   tesouraria **soma automaticamente** despesas avulsas e DIDs pagos na mesma conta
   ([relatoriosController.js:157](../server/controllers/relatoriosController.js#L157)).

5. **Cotas mensais por setor no almoxarifado.**
   Limite de consumo por setor/mês — controle que quase nenhum sistema pequeno tem e que é a
   resposta direta para "a secretaria X consome material demais".

6. **Consulta pública que não vaza dado pessoal.**
   Transparência com remoção programática de CPF, e-mail e telefone. É defesa contra o problema
   clássico de portal de transparência que expõe dado sensível.

7. **Pacote de licitação pronto (9 documentos, Lei 14.133/2021).**
   DFD, ETP, Matriz de Riscos, Pesquisa de Preços, TR, Edital, Parecer, Minuta e roteiro de
   Prova de Conceito. Reduz meses de trabalho da equipe de planejamento do município.

---

## 5. LACUNAS HONESTAS (o que **não** prometer)

| # | Lacuna | Impacto na venda | Como tratar na conversa |
|---|---|---|---|
| 1 | **Não gera arquivo de remessa do TCE/SIM.** O campo "Enviado para o TCE/SIM" é apenas uma marcação de controle. | Alto — se o prefeito perguntar "ele manda pro Tribunal?", a resposta é **não**. | "Ele organiza e comprova tudo o que o Tribunal cobra. O envio continua sendo feito pelo sistema contábil." |
| 2 | **Não é sistema contábil/orçamentário (PPA, LOA, empenho oficial).** O sistema registra o nº do empenho; não o emite. | Alto | Posicione como **camada de instrução e controle**, que convive com o contábil, não o substitui. |
| 3 | **NFS-e com CNPJ do tomador fixo no código** (Irauçuba) e *fallback* simulado quando a API nacional não responde. | Médio — não demonstrar ao vivo. | Tratar como recurso em evolução; **não citar no deck**. |
| 4 | **Sem testes automatizados no repositório.** | Baixo com prefeito, **alto** se houver auditor de TI. | Compensar com o roteiro de Prova de Conceito e o SLA do contrato. |
| 5 | **Ayla (assistente) depende de serviço externo de IA.** Sem chave configurada, responde no modo básico. | Médio — risco de demonstração falhar. | Não colocar como slide principal; demonstrar só se estiver testado no dia. |
| 6 | **Nenhum município em operação — confirmado pelo fabricante.** A base tem `modelo` (demonstração) e `iraucuba` (14 usuários, 15 secretarias, mas 0 processos e 0 DIDs); **Irauçuba não entra em operação**. Itapajé seria o primeiro. | Alto — **nunca afirme** "já roda em X municípios", e **não cite Irauçuba**. Prefeito de cidade pequena do Ceará confere numa ligação. | Resposta honesta pronta em [objecoes.md](objecoes.md), que converte a fraqueza em oferta de primeiro cliente. |
| 7 | **Sem app móvel / sem modo offline.** É web, exige internet. | Médio (zona rural). | Ver objeção preparada; o sistema é leve e funciona em conexão fraca, mas exige conexão. |
| 8 | **Portabilidade é por entidade** (processos, contratos…), não um botão único "baixar tudo". Existe backup completo, mas na mão do fabricante. | Médio | Prometer o que existe: exportação em CSV/JSON + backup restaurável, com cláusula contratual. |
| 9 | **Módulo de Patrimônio foi excluído do objeto da licitação já redigida.** | Baixo, mas é oportunidade: pode virar contratação futura. | Mostrar como valor agregado, não como item de preço. |

---

## 6. O ALVO DESTA PROPOSTA — confirmado

| | |
|---|---|
| **Município** | Prefeitura Municipal de **Itapajé — CE** |
| **População** | 46.426 habitantes (Censo IBGE 2022) |
| **Coeficiente do FPM** | **2,0** — faixa de 44.149 a 50.940 habitantes |
| **Preço** | Coeficiente × R$ 5.000 = **R$ 10.000,00/mês** · R$ 120.000 no exercício |
| **Implantação** | **30 dias** |
| **Clientes em operação** | **Nenhum.** Itapajé seria o primeiro município a usar. |

O modelo de preço amarrado ao coeficiente do FPM é, por si só, um argumento de venda:
o prefeito consegue **conferir a conta**, e a regra é a mesma para todo município.
Use isso antes que ele pergunte de onde saiu o número.

**O que ainda falta confirmar** está em [A_VALIDAR.md](A_VALIDAR.md) — principalmente o valor da
implantação, que é o único `[[PREENCHER]]` numérico restante.

---

## 7. RETRATO TÉCNICO EM UMA LINHA (uso interno, **não vai para o deck**)

Node/Express + Sequelize + PostgreSQL multi-schema, React/Vite/Tailwind, JWT com refresh em cookie,
bcrypt, helmet, CORS restrito, rate limiting (10 tentativas/15min no login), backup para
armazenamento em nuvem, geração de PDF no cliente (jsPDF/pdf-lib) e XLSX. 38 modelos, 17 grupos de
rotas, ~32 mil linhas nos controladores e páginas.

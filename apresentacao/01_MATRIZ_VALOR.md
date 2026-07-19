# 01 — MATRIZ DE VALOR

Ordenada pelo peso na decisão de um Prefeito:
**1) dinheiro · 2) risco · 3) tempo e dependência · 4) visibilidade política · 5) continuidade**

Coluna "Situação": **DEMONSTRADO** = existe em tela e pode ser aberto ao vivo ·
**ESTIMADO** = projeção com premissa declarada, nunca apresentada como resultado alcançado.

---

## Bloco 1 — Dinheiro que entra ou deixa de sair

| Dor do município hoje | O que o sistema faz | Ganho para o Prefeito | Prova | Situação |
|---|---|---|---|---|
| **Contrato vence sem ninguém perceber.** O serviço para, ou continua sendo prestado sem cobertura contratual — o que vira pagamento irregular. | Painel classifica todo contrato em expirado / vence em 30 dias / 31–90 dias / vigente, com alerta configurável por contrato | Nenhum serviço essencial para por esquecimento; nenhum pagamento sem contrato vigente | Painel de Contratos, faixa "contratos vencendo nos próximos 30 dias" | **DEMONSTRADO** |
| **Pagamento a fornecedor com certidão vencida** → glosa e devolução do recurso. | Conferência de CND Federal, FGTS, Trabalhista, Estadual, Municipal e Simples Nacional em 3 momentos do fluxo, com os arquivos anexados | Dinheiro que não volta como glosa; fornecedor não é pago irregularmente | Seções I, IV e VI do DID | **DEMONSTRADO** |
| **Saldo bancário real só é conhecido depois que a Tesouraria fecha a planilha.** | Saldo por conta, fluxo mensal e extrato que já soma despesas avulsas + DIDs pagos, na mesma tela | Prefeito sabe quanto tem em caixa por conta, no dia, antes de autorizar despesa | Tesouraria → Saldo de contas / Extrato | **DEMONSTRADO** |
| **Ordem de compra emitida acima do saldo do contrato.** | Consulta de saldo por contrato e vínculo item-a-item antes de emitir a ordem | Evita aditivo desnecessário e apontamento de execução acima do contratado | Contratos → Ordens → Saldo do contrato | **DEMONSTRADO** |
| **Material sumindo e consumo desigual entre secretarias.** | Cotas mensais por setor + estoque mínimo com alerta de item crítico + inventário | Corte de desperdício em material de consumo | Almoxarifado → Cotas / Itens críticos | **DEMONSTRADO** |
| Economia anual estimada em material de consumo com cota por setor | — | `[[PREENCHER]]` | premissa: X% sobre gasto anual de material de consumo do município | **ESTIMADO** |

## Bloco 2 — Risco eliminado

| Dor do município hoje | O que o sistema faz | Ganho para o Prefeito | Prova | Situação |
|---|---|---|---|---|
| **"Quem autorizou isso?"** — processo em papel, despacho a lápis, ninguém assume. | Toda tramitação grava origem, destino, usuário, data e hora; devolução **exige** justificativa; registro com IP e navegador | Responsabilidade nominal e datada. O prefeito deixa de responder pessoalmente por ato que não foi dele | Detalhes do Processo → histórico + Registros | **DEMONSTRADO** |
| **Processo desaparece** entre secretarias e reaparece no prazo estourado. | Cada processo tem setor e responsável atual, além de alerta de "sem movimentação há mais de 48h" | Prazo legal perdido deixa de ser surpresa | Dashboard → Alerta 48h | **DEMONSTRADO** |
| **Servidor com acesso a mais do que deveria** (mesma pessoa pede, autoriza e paga). | Permissão por módulo **e por ação** — ver, criar, editar, excluir, aprovar — configurável por usuário | Segregação de funções, que é exatamente o que o controle interno e o TCE cobram | Usuários → Editor de Permissões | **DEMONSTRADO** |
| **Certidão anexada some do processo** na hora da auditoria. | Certidões e notas ficam anexadas ao DID, com o processo | Processo chega completo na prestação de contas | DID → anexos de certidões | **DEMONSTRADO** |
| **Dado pessoal de cidadão exposto no portal de transparência.** | CPF, e-mail e telefone do interessado são removidos antes de qualquer resposta pública | Transparência sem risco de sanção de LGPD | Consulta Pública | **DEMONSTRADO** |
| **Dados de um município acessíveis por outro** (risco de sistema compartilhado). | Cada município tem base própria e a sessão fica amarrada ao município | Nenhum dado da prefeitura em base compartilhada com terceiros | Anexo técnico (não demonstrar em tela) | **DEMONSTRADO** (arquitetura) |

## Bloco 3 — Tempo e dependência

| Dor do município hoje | O que o sistema faz | Ganho para o Prefeito | Prova | Situação |
|---|---|---|---|---|
| **O DID é preenchido à mão, carimbado e carregado de setor em setor.** Cada seção é uma ida e volta física. | O mesmo formulário existe na tela, em 7 seções, e o processo anda sozinho entre os setores; o PDF sai idêntico ao formulário oficial | O tempo entre a solicitação e o pagamento cai; fornecedor para de ligar cobrando | Formulário DID + PDF gerado | **DEMONSTRADO** |
| **Só a servidora X sabe onde está o processo** — se ela falta, a prefeitura para. | Qualquer pessoa com permissão vê onde o processo está e quem o tem em mãos | A prefeitura deixa de depender de uma pessoa e de uma planilha | Processos → filtro por setor/status | **DEMONSTRADO** |
| **Relatório para a Câmara leva dias** sendo montado à mão. | Relatórios de processos, por setor, tempo médio e atrasados exportáveis em PDF e Excel em um clique | Resposta em minutos, não em dias | Relatórios → Exportar PDF/Excel | **DEMONSTRADO** |
| Redução do tempo médio entre solicitação e pagamento | — | `[[PREENCHER]]` dias → `[[PREENCHER]]` dias | premissa: comparação com o tempo médio atual informado pelo município | **ESTIMADO** |

## Bloco 4 — Visibilidade política

| Dor do município hoje | O que o sistema faz | Ganho para o Prefeito | Prova | Situação |
|---|---|---|---|---|
| **Cidadão liga na prefeitura para saber do processo dele** e é transferido três vezes. | Portal público, sem cadastro, consulta por número, assunto, interessado ou secretaria — e QR Code impresso no processo | Menos fila no protocolo, mais transparência visível para o eleitor | `/{municipio}/consulta` | **DEMONSTRADO** |
| **Vereador pede dado na Câmara e a resposta demora.** | Painéis com números de processos, contratos e execução prontos na tela | Prefeito chega à Câmara com número na mão | Dashboard + Painel de Contratos | **DEMONSTRADO** |
| **O sistema tem cara de "sistema"**, não da prefeitura. | Logo, brasão, cores e timbrado do município nos documentos gerados | Todo ofício, portaria e decreto sai com a identidade da gestão | Configurações → identidade visual | **DEMONSTRADO** |

## Bloco 5 — Continuidade

| Dor do município hoje | O que o sistema faz | Ganho para o Prefeito | Prova | Situação |
|---|---|---|---|---|
| **Troca de gestão / troca de secretário e o histórico se perde** — armário, pen drive, planilha no computador de alguém. | Todo o histórico fica na base do município, com backup agendado, restaurável, e exportação em formatos abertos a qualquer tempo | O acervo é do município, não da equipe que sai | Backup + exportação CSV/JSON | **DEMONSTRADO** |
| **Estrutura administrativa muda e o sistema antigo não acompanha.** | Cadastro de secretarias, setores e **responsáveis por cargo e período** — guarda quem respondia por quê e quando | Consegue provar, anos depois, quem era o responsável na época do ato | Organização → responsáveis | **DEMONSTRADO** |
| **Patrimônio sem tombamento e sem depreciação.** | Tombamento sequencial, grupos com taxa de depreciação conforme TCE-CE, responsabilidade por servidor, inventário | Balanço patrimonial defensável | Patrimônio (fora do objeto da licitação, é valor agregado) | **DEMONSTRADO** |

---

# AS 5 DORES ESCOLHIDAS PARA O DECK

Critério: peso na decisão × força visual da tela × facilidade de provar ao vivo.

| # | Dor (na fala do prefeito) | Slide | Tela que prova | Número em destaque |
|---|---|---|---|---|
| **1** | *"Contrato venceu e ninguém me avisou."* | 4 | Painel de Contratos — faixa de vencimento em 30 dias | nº de contratos vencendo / valor sob risco |
| **2** | *"Paguei fornecedor com certidão vencida e o Tribunal glosou."* | 5 | DID — seções de certidões com marcação e anexo | nº de conferências obrigatórias antes do pagamento (**6 certidões × 3 momentos**) |
| **3** | *"O processo sumiu e o prazo estourou."* | 6 | Dashboard — Alertas Executivos + Alerta 48h + urgentes | nº de processos parados há mais de 48h |
| **4** | *"Só a Dona Fulana sabe onde está o processo."* | 7 | Detalhes do Processo — histórico completo de tramitação com nome, data e hora | nº de passos rastreados por processo |
| **5** | *"Não sei quanto tenho em caixa hoje."* | 8 | Tesouraria — saldo por conta + extrato conciliado | saldo consolidado / nº de contas conciliadas |

**Vão para anexo (slides 14+):** almoxarifado com cotas, patrimônio/TCE-CE, consulta pública do
cidadão, permissões granulares, identidade visual, backup e LGPD, pacote de licitação pronto.

**Justificativa das exclusões:** consulta pública e permissões são fortíssimas, mas exigem explicar
*como funciona* antes do *o que eu ganho* — quebram a regra do deck. Entram na demo ao vivo, se houver tempo.

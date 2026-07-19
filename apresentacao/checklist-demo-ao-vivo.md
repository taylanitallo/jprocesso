# CHECKLIST — DEMONSTRAÇÃO AO VIVO

A demo ao vivo é a hora de maior risco da reunião. Este roteiro existe para você
**não improvisar** e não abrir tela que não deve ser aberta.

---

> **Reunião:** Prefeitura Municipal de **Itapajé — CE**.
> **Nunca** demonstre com base de município real, nem cadastre "Itapajé" na base de demonstração.
> A demo é do município fictício de **Modelo (CE)** — e o rodapé de cada slide já diz isso.
> Se ele perguntar "esses dados são da minha prefeitura?", responda: *"não, é um município de
> exemplo — a base do senhor seria só sua, separada de todas as outras."*

## VÉSPERA — 20 minutos, sem pressa

- [ ] `npm run demo:reset` — reconstrói a massa do zero e **elimina o registro de teste
      `Proc.2026.0000067 — "JNDIDKMDO"`**, que denuncia base de teste se aparecer na tela.
- [ ] `npm run demo:tensao` — recalcula os prazos em relação a hoje. Sem isso, os alertas
      de contrato somem e o slide 4 fica sem sustentação.
- [ ] Subir o sistema: `npm run dev` e `npm run client`.
- [ ] Abrir e conferir, uma a uma, **as cinco telas do roteiro** (lista abaixo).
- [ ] Conferir que o Painel de Contratos mostra "3 contratos vencendo nos próximos 30 dias".
- [ ] Conferir que o Dashboard mostra "5 itens em estoque crítico" e "5 requisições pendentes"
      (se mostrar 0, o painel do almoxarifado está falhando — não abra essa tela).
- [ ] `npm run apresentacao:telas` — recaptura os prints e atualiza o deck.
- [ ] Abrir o deck e passar os 13 slides até o fim.
- [ ] **Gerar o PDF do deck** (Ctrl+P → Salvar como PDF) e guardar no notebook. É o plano B.
- [ ] Carregar o notebook. Levar o carregador.

---

## NO DIA — antes de entrar na sala

- [ ] Sistema já aberto e **logado**, nas abas certas, antes de o prefeito sentar.
      Ninguém deve ver você digitar senha.
- [ ] Login: administrador, CPF `02680278380`, senha `123456`.
- [ ] Zoom do navegador em **80%** — em 100% a tabela de contas não cabe.
- [ ] Tema **claro**. Tema escuro some no projetor de sala clara.
- [ ] Navegador em tela cheia (F11). Sem barra de favoritos, sem outras abas visíveis.
- [ ] Notificações do sistema operacional **desligadas**.
- [ ] PDF do deck aberto numa aba, minimizado, pronto para o plano B.

### Abas deixadas prontas, nesta ordem

1. `…/modelo` — Dashboard
2. `…/modelo/contratos/dashboard` — Painel de Contratos
3. `…/modelo/processos/{id do processo do oxigênio}/did` — DID, rolado até as Certidões
4. `…/modelo/processos/{id do mesmo processo}` — Linha do Tempo
5. `…/modelo/tesouraria/relatorios` — Saldo por Conta

---

## A ORDEM DA DEMONSTRAÇÃO — 6 a 8 minutos

Siga a mesma ordem do deck. Ele já viu os prints; agora está confirmando que é real.

### 1. Dashboard *(1 min)*
Abra e **fique quieto por três segundos**. Deixe ele ler.
> "Isto é o que a sua equipe vê ao entrar, de manhã."

Aponte só para os **Alertas Executivos**. Não explique os outros cartões.

### 2. Painel de Contratos *(1 min 30)*
> "Aqui estão os contratos que precisam de decisão."

Leia em voz alta os três da faixa amarela, com os dias. **Não role a página.**
Se ele perguntar do valor total, aponte o "Valor Global".

### 3. DID — Certidões *(2 min)* — *o momento mais forte*
Já deixe rolado até o bloco de Certidões.
> "Seis certidões conferidas. Olhe o FGTS: em branco."

Role **devagar** até a Seção II e leia o despacho em voz alta:
> "'Constatada certidão de FGTS vencida. Devolva-se à origem para regularização.'
> O pagamento não saiu. O município não vai devolver esse dinheiro depois."

*Pause aqui. É o ponto onde os prefeitos costumam fazer a primeira pergunta séria.*

### 4. Linha do Tempo *(1 min 30)*
Volte para o processo e role até a Linha do Tempo.
> "Cada passo com o nome de quem recebeu, o dia e a hora. E aqui embaixo, onde ele está agora."

Aponte "Localização Atual".

### 5. Tesouraria — Saldo por Conta *(1 min)*
> "As contas do município, com saldo. Inclusive as de convênio, que são as que mais dão dor de cabeça."

**Encerre aqui.** Não abra mais nada por conta própria.

---

## SE A INTERNET CAIR — plano B

1. **Não tente reconectar na frente dele.** Não fique mexendo no roteador.
2. Diga, sem drama: *"Vou seguir pelas telas que eu trouxe — são as mesmas."*
3. Abra o **PDF do deck** (já aberto e minimizado) e continue do slide onde estava.
4. Se ele quiser ver ao vivo, ofereça: *"Deixe eu voltar amanhã com isso rodando, ou eu mando
   um link para o senhor abrir com sua equipe."* — e **agende ali na hora**.

> As capturas em `apresentacao/telas/` e os arquivos em `apresentacao/telas/arquivos/`
> (PDF e planilha gerados pelo próprio sistema) funcionam sem internet nenhuma.
> Tenha a pasta no notebook, não só na nuvem.

---

## AS TRÊS TELAS QUE NUNCA DEVEM SER ABERTAS AO VIVO

### 1. Qualquer tela do módulo de NFS-e / leitura de nota fiscal
O CNPJ do tomador está fixo no código e aponta para **outro município**. Se a consulta à API
nacional falhar, o sistema devolve um resultado simulado. Um dado inventado aparecendo na tela,
na frente do prefeito, é o fim da reunião.

### 2. A assistente Ayla
Depende de um serviço externo de inteligência artificial. Se a chave não estiver configurada
ou o serviço estiver lento, ela responde de forma genérica — ou não responde.
Demonstrar assistente que trava é pior do que não ter assistente.
*Só abra se você testou naquele mesmo dia, naquela mesma internet.*

### 3. O painel do fabricante (superadministrador)
É onde aparecem **os outros municípios**. Mostrar que existe outro cliente na mesma tela
levanta exatamente a pergunta que você não quer: "então meus dados ficam junto com os deles?".
Se ele perguntar sobre separação de dados, responda pelo slide de anexo — nunca abrindo a tela.

### Bônus — evite também
- **Módulo de Patrimônio**, se a proposta seguir o termo de referência que existe: ele foi
  **excluído do objeto**. Mostrar o que não está sendo vendido cria expectativa e confusão de preço.
- **Tela de exclusão de qualquer registro.** Não demonstre apagar nada.
- **Listas de processos filtradas por "aberto"**, onde registros de teste aparecem primeiro.

---

## DEPOIS DA REUNIÃO — mesmo dia

- [ ] Enviar o **one-pager em PDF** por e-mail ou WhatsApp, em até 2 horas.
- [ ] Enviar o **PDF do deck** somente se ele pedir.
- [ ] Registrar: quem estava na sala, que perguntas fez, qual objeção pesou mais.
- [ ] Se agendou a reunião técnica, confirmar por escrito no mesmo dia, com data e hora.
- [ ] Anotar o que faltou responder e mandar a resposta em até 48 horas.

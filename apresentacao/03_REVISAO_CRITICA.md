# 03 — REVISÃO CRÍTICA

Reli o material inteiro fazendo o papel de um prefeito cético — daqueles que já compraram
sistema que não funcionou. Aqui está o que ele diria.

---

## 1. Qual slide eu corto se sobrarem só 5 minutos?

**Corte, nesta ordem: slide 9 (Antes × Depois) e slide 11 (Implantação).**

**Slide 9 — Antes × Depois.** É o mais fácil de perder. Ele fala da rotina da *servidora*,
não do bolso nem do risco do *prefeito*. É um slide de empatia com quem opera — importante numa
reunião com a equipe, dispensável numa reunião com quem decide. E o conteúdo dele cabe em
uma frase dita no slide 7: *"se ela faltar, a prefeitura não para"*.

**Slide 11 — Implantação.** Corte apenas se o prefeito ainda não demonstrou interesse. Se ele
já perguntou "quanto tempo demora", **não corte** — virou o slide mais importante da reunião.
Numa versão de 5 minutos, o prazo cabe numa frase dentro do slide 12: *"em [[X]] dias está rodando"*.

**O que nunca cortar:** slides 2 (diagnóstico), 4 e 5 (contratos e certidões — dinheiro e risco),
12 (investimento) e 13 (pedido). Sem o 2, ele não sente o problema; sem o 13, ele não faz nada.

**Versão de 5 minutos:** 1 → 2 → 3 → 4 → 5 → 6 → 10 → 12 → 13.

---

## 2. Qual afirmação eu não consigo provar se ele perguntar "como você sabe disso?"

Fui atrás de cada número do deck. **Cinco pontos precisam de atenção:**

### 🔴 Grave — o slide 2 inteiro

Os três números do diagnóstico estão como `[[PREENCHER]]`. Se você entrar na reunião com números
inventados ali, **o deck inteiro desmorona no primeiro "de onde veio esse número?"**. É o slide
mais vulnerável do material, porque é o único que fala do município *dele*.

> **O que fazer:** levante os três números no município-alvo antes da reunião (Portal da
> Transparência, contratos publicados, conversa com o secretário de administração). Se não
> conseguir, mude a fala de *afirmação* para *pergunta*: "Prefeito, o senhor sabe quantos
> contratos vencem nos próximos noventa dias?" — a pergunta funciona ainda melhor que o número,
> porque ele mesmo admite que não sabe.

### 🟡 Atenção — "5 contratos", "35 processos", "30 contas", "6,6 passos"

São todos **reais e verificáveis**, mas vêm da base de **demonstração** do município fictício de
Modelo, não do município dele. Está escrito no rodapé de cada slide, e é honesto — mas se você
disser "o senhor tem 35 processos parados", está mentindo.

> **A fala correta é:** *"Numa prefeitura do porte da sua, é isso que aparece"* ou
> *"Nesta demonstração, são 35"*. Nunca *"o senhor tem"*.

### 🟡 Atenção — "18 conferências de certidão"

O número é meu: 6 certidões × 3 momentos do fluxo (solicitação, contabilidade, tesouraria).
Os campos existem no sistema e eu os localizei no código. Mas é uma **conta que eu montei**,
não um número que o sistema exibe. Se ele pedir para ver "os 18", você vai mostrar 6 na tela.

> **A fala mais segura:** *"as mesmas seis certidões são conferidas em três momentos diferentes
> do processo"* — é o mesmo fato, sem o número que você teria de justificar.

### 🟡 Atenção — o prazo de implantação

O "30/45/60 dias" está `[[PREENCHER]]` porque **você ainda não me confirmou** qual prazo assume.
O termo de referência que existe no repositório deixa os três em aberto. Não chute na reunião:
prazo dito ao prefeito vira compromisso.

### 🟢 Sustentável — todo o resto

Vigência de contratos, trilha de auditoria com IP, permissões por ação, base separada por
município, portabilidade em formato aberto, consulta pública sem dado pessoal: **tudo localizado
no código** e demonstrável ao vivo.

---

## 3. O deck entrega "o que eu ganho" antes de "como funciona"?

**Sim — e a ordem está certa.** Confirmei slide a slide:

| Slide | Abre com | Veredito |
|---|---|---|
| 2 | Três perguntas que ele não sabe responder | ✅ Dor pura, zero produto |
| 3 | "Tudo o que a prefeitura pede, aprova e paga, em um lugar só" | ✅ Benefício, não arquitetura |
| 4–8 | Uma frase entre aspas, na boca dele | ✅ Dor → número → prova |
| 9 | "O que muda na mesa da servidora" | ✅ Consequência, não funcionalidade |
| 10 | "Riscos que somem" | ✅ Perda evitada |
| 11 | "O trabalho é nosso" | ✅ Esforço dele, não etapas técnicas |
| 12–13 | Preço e um pedido | ✅ |

**Nenhum slide começa explicando como o sistema funciona.** As palavras proibidas — multi-tenant,
API, endpoint, deploy, stack — não aparecem em lugar nenhum do deck, do one-pager ou do roteiro.
"Cada município tem a própria base de dados" faz o trabalho de "multi-tenant" sem o jargão.

### Uma correção que eu fiz na revisão

A primeira versão do slide 4 punha o print pequeno, ao lado do texto — ilegível a três metros
de distância num projetor. Recortei as capturas na região que sustenta o argumento e mudei os
slides 4, 5 e 8 para o print ocupar a largura inteira. **Se o prefeito não consegue ler a tela,
o slide vira decoração.**

---

## 4. O que mais me incomoda no material

### a) O melhor slide é o 5, e ele está em quinto lugar
A tela das certidões com o despacho *"Constatada certidão de FGTS vencida. Devolva-se à origem"*
é a prova mais forte do material inteiro: mostra o sistema **impedindo um erro caro**, sozinho,
sem ninguém pedir. Considere trocar os slides 4 e 5 de ordem se o prefeito já tiver histórico de
glosa. Deixei contratos primeiro porque é a dor mais universal — mas essa é uma decisão sua,
não minha, e depende do que você souber do município.

### b) Não há prova social — e agora é definitivo
Zero clientes em operação, confirmado pelo fabricante: Irauçuba não entra em operação e nenhum
outro município usa o sistema. **Itapajé seria o primeiro.**

Essa é a maior fragilidade comercial do material, e nenhum slide resolve — só a sua fala resolve.
Um prefeito de cidade pequena do Ceará **vai perguntar quem já usa** e vai conferir numa ligação.
A resposta está pronta em [objecoes.md](objecoes.md): diga primeiro, diga sem rodeio, e converta
em oferta de primeiro cliente.

> **Decida antes de entrar na sala** se você tem margem para uma condição de primeiro cliente
> (desconto, período de teste, prioridade no suporte). Improvisar isso na frente do prefeito
> parece desespero; oferecer com convicção parece parceria.

### c) O deck não fala de FUNDEB, PNAE nem SUAS
Um prefeito associa "sistema" a repasse condicionado. O jProcesso **não** move índice de FUNDEB
nem de IDEB, e eu não coloquei isso no material porque não seria verdade. Mas espere a pergunta
"isso ajuda no meu índice?" e tenha a resposta pronta: *"não mexe no índice; mexe no que faz o
recurso ser glosado ou não ser executado a tempo."*

### d) O slide 12 melhorou muito com a fórmula do FPM
Preço redondo (R$ 10.000) levanta na hora a pergunta *"de onde saiu esse número?"*. Com a regra
visível — **coeficiente do FPM × R$ 5.000** — o preço deixa de ser proposta e vira tabela: o
prefeito confere a conta sozinho e entende que não há preço diferente para cada prefeitura.
Coloquei isso no slide e mandei dizer em voz alta **antes** de ele perguntar.

O que ainda falta ali é ancorar o valor contra alguma coisa. R$ 120 mil no ano é abstrato para
quem não compara. A âncora mais forte já está no [objecoes.md](objecoes.md) — *"uma glosa por
certidão vencida costuma custar mais que um ano de sistema"* — mas ela só aparece se ele
perguntar do preço. **Considere dizê-la no slide 12, sem esperar a pergunta.**

### e) Dois defeitos do produto apareceram na preparação
Não são do material, mas afetariam a apresentação e a produção:

1. **Painel do Almoxarifado quebrado** (erro 500 para qualquer município) — os cartões
   "Estoque Crítico" e "Req. Pendentes" mostravam sempre 0. Corrigido.
2. **Dois erros de português na tela principal** — "itemns" e "requisiçãoões", que apareceriam
   projetados no slide 6. Corrigidos.

Ambos estão detalhados em [02_MASSA_DEMO.md](02_MASSA_DEMO.md).

---

## 5. Veredito

O material está **pronto para ser apresentado**, com uma condição inegociável:

> **Preencha os `[[PREENCHER]]` antes de entrar na sala.** Um slide com marcador amarelo
> projetado na parede do gabinete não é um deck inacabado — é uma demonstração de descuido,
> e é exatamente a impressão que você não pode dar a quem vai lhe confiar os dados da prefeitura.

Os marcadores são intencionalmente berrantes (fundo amarelo, borda tracejada) justamente para
que seja impossível esquecer um.

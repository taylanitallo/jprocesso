# APRESENTAÇÃO COMERCIAL — jProcesso

Material de venda para prefeituras, gerado a partir do que está **implementado no código**
deste repositório. Nada aqui foi inventado: o que não foi localizado no sistema está listado
em [A_VALIDAR.md](A_VALIDAR.md) e ficou fora do deck.

---

## Comece por aqui

| Se você quer… | Abra |
|---|---|
| Apresentar hoje | [deck/index.html](deck/index.html) + [roteiro-de-fala.md](roteiro-de-fala.md) |
| Deixar algo na mão do prefeito | [one-pager.html](one-pager.html) |
| Se preparar para as perguntas | [objecoes.md](objecoes.md) |
| Demonstrar ao vivo | [checklist-demo-ao-vivo.md](checklist-demo-ao-vivo.md) |
| Entender o que o sistema faz | [00_ANALISE.md](00_ANALISE.md) |
| Saber o que **não** prometer | [A_VALIDAR.md](A_VALIDAR.md) |
| Saber o que cortar e o que não sustenta | [03_REVISAO_CRITICA.md](03_REVISAO_CRITICA.md) |

---

## Esta proposta

| | |
|---|---|
| **Município** | Prefeitura Municipal de **Itapajé — CE** |
| **Preço** | **R$ 10.000,00/mês** — coeficiente do FPM (2,0) × R$ 5.000 · R$ 120.000 no exercício |
| **Implantação** | 30 dias |
| **Clientes em operação** | **Nenhum.** Itapajé seria o primeiro. Diga isso antes que perguntem — [objecoes.md](objecoes.md) tem a fala pronta. |

## ⚠️ Antes de qualquer reunião

Procure por `[[` no deck e no one-pager e **preencha o que falta**. Os marcadores aparecem com
fundo amarelo e borda tracejada de propósito — para ser impossível projetar um sem perceber.

```bash
grep -rn "\[\[" apresentacao/deck/index.html apresentacao/one-pager.html
```

Ainda em aberto: **valor da implantação** (único número faltando), data da reunião, contato,
horário de suporte e carga horária do treinamento.

E **confirme o coeficiente de Itapajé** na Decisão Normativa do TCU do exercício. Ele foi
deduzido da faixa populacional do Censo 2022 (46.426 habitantes → faixa 44.149–50.940 → 2,0),
que é o método padrão — mas o número que vale é o publicado pelo TCU, e existe redutor previsto
na LC 198/2023. Se o coeficiente for outro, o preço muda.

---

## Como abrir o deck

**Basta abrir o arquivo no navegador** — duplo clique em `deck/index.html`. Não precisa de
servidor, de internet, nem de instalar nada.

| | |
|---|---|
| Avançar | `→`, `Barra de espaço`, `Page Down` ou arrastar para a esquerda |
| Voltar | `←` ou `Page Up` |
| Primeiro / último slide | `Home` / `End` |
| Ir direto a um slide | acrescente `#7` ao endereço |

**13 slides na apresentação + 3 anexos** (módulos, segurança/LGPD e limites do sistema).
Os anexos só devem ser abertos se perguntarem.

### Gerar o PDF

`Ctrl+P` → destino **Salvar como PDF** → orientação **paisagem** → margens **nenhuma** →
marcar **gráficos de segundo plano**. Um slide por página.

> **Gere o PDF antes de toda reunião e deixe no notebook.** É o plano B se a internet
> ou o projetor falharem.

### Um cuidado com o deck

O arquivo `index.html` **não** carrega nada da internet, mas as imagens vêm da pasta
`../telas/`. Se for enviar o deck por e-mail, mande a **pasta `apresentacao/` inteira** —
ou mande o PDF, que já leva tudo embutido.

---

## Como recapturar as telas

As capturas saem do sistema rodando de verdade, contra a massa de demonstração.

```bash
# 1. Preparar a massa (apaga, reconstrói e reacende os alertas na data de hoje)
npm run demo:preparar

# 2. Subir o sistema — em dois terminais
npm run dev        # backend, porta 5001
npm run client     # frontend, porta 3000

# 3. Capturar
npm run apresentacao:telas
```

Saída em `telas/`: 13 imagens, o `INDICE.md` ligando cada print ao argumento de venda, e
`telas/arquivos/` com o **PDF e a planilha realmente gerados pelo sistema** — leve esses
arquivos, valem mais que print.

**Rode `npm run demo:tensao` na véspera de cada apresentação.** Os prazos são calculados a
partir da data de hoje, então "vence em 8 dias" continua sendo 8 dias, não importa quando o
material foi gerado. Detalhes em [02_MASSA_DEMO.md](02_MASSA_DEMO.md).

### Se a captura falhar na primeira tentativa

O `nodemon` reinicia o servidor sempre que um arquivo muda. Se você acabou de editar algo,
a primeira execução pode falhar com `fetch failed`. **Rode de novo** — funciona.

### Ajustar um recorte

Cada tela do roteiro, em [scripts/capturar-telas.js](scripts/capturar-telas.js), aceita
`recorte: { ancora, acima, abaixo, x, largura }`. O corte é ancorado num **texto da tela**,
não em coordenadas fixas — então continua enquadrando o conteúdo certo mesmo se o layout mudar
de altura. Para trocar a região, mude o texto da âncora.

---

## Como adaptar para outro município

1. **Deck e one-pager** — troque "Itapajé" pelo novo município e **recalcule o preço**:
   coeficiente do FPM do município × R$ 5.000. O coeficiente sai da faixa populacional do
   último Censo, confirmado na Decisão Normativa do TCU do exercício. Ajuste também a menção
   à população no slide 12 e no one-pager. As telas continuam sendo do município fictício de
   Modelo e o rodapé de cada slide já diz isso.

   | Coeficiente | Mensalidade | No exercício |
   |---|---|---|
   | 0,6 | R$ 3.000 | R$ 36.000 |
   | 1,0 | R$ 5.000 | R$ 60.000 |
   | 1,4 | R$ 7.000 | R$ 84.000 |
   | 2,0 | R$ 10.000 | R$ 120.000 |
   | 2,6 | R$ 13.000 | R$ 156.000 |
   | 3,0 | R$ 15.000 | R$ 180.000 |
   | 4,0 | R$ 20.000 | R$ 240.000 |

2. **Slide 2 (diagnóstico)** — é o único que fala do município *dele*, e o mais frágil do deck.
   Levante os três números no Portal da Transparência e nos contratos publicados do município-alvo.
   Se não conseguir, transforme em pergunta — o [roteiro-de-fala.md](roteiro-de-fala.md) explica como.

3. **Ordem das dores** — o deck abre por contratos porque é a dor mais universal. Se você souber
   que o município já levou glosa do Tribunal, **troque os slides 4 e 5 de ordem**: a tela das
   certidões é a prova mais forte do material.

4. **Massa de demonstração** — para uma demo com nomes de bairros e escolas da região, edite as
   listas em [server/scripts/seed_demo/](../server/scripts/seed_demo/) e rode `npm run demo:preparar`.
   **Nunca** demonstre usando a base de um município real e **nunca** use nome de pessoa real.

5. **Documentos de licitação** — o pacote completo já existe em [docs/licitacao/](../docs/licitacao/),
   com os campos entre colchetes para preencher. É um argumento de venda por si só: economiza
   meses de trabalho da equipe de planejamento do município.

---

## O que tem em cada arquivo

```
apresentacao/
├── README.md                     você está aqui
├── 00_ANALISE.md                 o que o sistema é, faz e não faz — levantado do código
├── 01_MATRIZ_VALOR.md            dor → solução → ganho → prova, e as 5 dores escolhidas
├── 02_MASSA_DEMO.md              a massa de demonstração e como prepará-la
├── 03_REVISAO_CRITICA.md         o que cortar, o que não sustenta, o que incomoda
├── A_VALIDAR.md                  o que NÃO entra na apresentação sem sua confirmação
├── deck/index.html               a apresentação de 8 minutos
├── one-pager.html                1 página A4 para deixar com o prefeito
├── roteiro-de-fala.md            script cronometrado, abertura e fechamento por extenso
├── objecoes.md                   respostas de até 3 frases para as 12 objeções prováveis
├── checklist-demo-ao-vivo.md     ordem da demo, plano B e as 3 telas proibidas
├── scripts/capturar-telas.js     automação das capturas
└── telas/                        13 imagens + INDICE.md + arquivos/ (PDF e planilha reais)
```

---

## Correções feitas no produto durante a preparação

Duas falhas apareceram ao rodar o sistema para capturar as telas e foram corrigidas:

1. **Painel do Almoxarifado retornava erro 500** para qualquer município, deixando os cartões
   "Estoque Crítico" e "Req. Pendentes" do painel principal sempre em zero.
   → [almoxarifadoController.js:192](../server/controllers/almoxarifadoController.js#L192)

2. **Dois erros de português na tela principal** — "itemns" e "requisiçãoões" — que apareceriam
   projetados na parede do gabinete.
   → [Dashboard.jsx:139](../client/src/pages/Dashboard.jsx#L139)

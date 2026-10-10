# A_VALIDAR — o que NÃO entra na apresentação sem confirmação

> Regra: nada aqui vai para o deck enquanto não for confirmado por você **ou** localizado no código.

## 1. Perguntas objetivas para você

### ✅ Respondidas — já aplicadas em todo o material

| # | Pergunta | Resposta |
|---|---|---|
| 1 | Irauçuba entra em operação? | **Não.** Não há nenhum município operando. O material assume isso e a resposta honesta está pronta em [objecoes.md](objecoes.md). |
| 2 | Preço | **Coeficiente do FPM × R$ 5.000/mês.** Itapajé tem coeficiente **2,0** (46.426 hab., Censo IBGE 2022, faixa 44.149–50.940) → **R$ 10.000,00/mês**, R$ 120.000 no ano. |
| 3 | Município-alvo | **Itapajé — CE.** |
| 4 | Prazo de implantação | **30 dias.** |

> ⚠️ **Confirme o coeficiente na Decisão Normativa do TCU vigente antes da reunião.**
> Eu o deduzi da faixa populacional do Censo 2022, que é o método padrão — mas o número que
> vale é o publicado pelo TCU para o exercício, e ele pode sofrer redutor (LC 198/2023).
> Se Itapajé não for 2,0, o preço muda e o slide 12 precisa ser refeito.

### ❌ Ainda em aberto — o material está com `[[PREENCHER]]`

| # | Pergunta | Onde trava |
|---|---|---|
| 5 | **Valor da implantação, migração e treinamento** (parcela única). Ou o modelo é só mensalidade? | Slide 12 e one-pager. É o único número que falta. |
| 6 | Data da reunião | Capa e one-pager. |
| 7 | Contato, telefone e e-mail | Slide 13 e rodapé do one-pager. |
| 8 | Canais e horário de suporte (telefone? WhatsApp? horário comercial?) | Slide 11 e objeção "minha equipe não é de tecnologia". |
| 9 | Carga horária do treinamento e se é presencial ou remoto | Slide 11. |
| 10 | Onde os dados ficam hospedados (provedor e região) e retenção de backup | Anexo de segurança/LGPD e objeção "os dados são meus?". |
| 11 | Você tem margem para condição de primeiro cliente? | Decida **antes** da reunião — a objeção "quantas prefeituras usam" cai na certa. |

## 2. Afirmações que eu **não** consegui provar no código — não usar

| Afirmação tentadora | Situação real | Veredito |
|---|---|---|
| "Envia a prestação de contas para o TCE/SIM" | Só existe o campo de marcação `contab_fech_tce` (sim/não) | ❌ Não afirmar |
| "Substitui o sistema contábil / faz o empenho oficial" | O sistema **registra** número e data de empenho e liquidação; não os emite no orçamento | ❌ Não afirmar |
| "Lê a nota fiscal automaticamente" | `nfseService.js` tem CNPJ do tomador fixo no código e *fallback* simulado em falha de rede | ❌ Fora do deck e fora da demo |
| "Disponibilidade de 99%" | É meta contratual redigida no TR, **não** métrica medida | ⚠️ Só como compromisso de contrato, nunca como histórico |
| "Reduz X% do tempo de tramitação" | Nenhuma medição existe no repositório | ⚠️ Só como **estimativa rotulada**, com a premissa no slide |
| "Funciona offline / tem aplicativo" | Aplicação web, sem service worker nem app | ❌ Não afirmar |
| "Integra com o sistema Y da prefeitura" | Só existem exportação CSV/JSON e a NFS-e parcial | ❌ Não afirmar |
| "Já roda em N prefeituras" | **Confirmado: nenhuma em operação.** Irauçuba tem cadastro aberto, mas 0 processos e não entra em operação | ❌ **Nunca afirmar.** Resposta honesta em [objecoes.md](objecoes.md) |
| "Irauçuba é nosso piloto / cliente" | Cadastro configurado, sem uso, e descartado pelo próprio fabricante | ❌ Não citar o município em hipótese alguma |
| "Assinatura digital ICP-Brasil nos documentos" | Não localizado. Há hashes de conferência em requisições de almoxarifado, o que **não** é assinatura digital | ❌ Não afirmar |
| "Notifica por e-mail / WhatsApp quando o processo chega" | Alertas são exibidos **dentro do sistema**; não há envio de e-mail/SMS no código | ❌ Não afirmar — dizer "alertas na tela" |
| "Protocolo do cidadão pela internet (peticionamento externo)" | O portal público é **de consulta**; a abertura é interna | ❌ Não afirmar |

## 3. Números do slide 2 (diagnóstico) — origem obrigatória

> **Agora que o alvo é Itapajé, a opção 1 virou viável.** Levante os três números no Portal da
> Transparência de Itapajé e nos contratos publicados pelo município antes da reunião. É o
> investimento de meia hora que transforma o slide mais frágil do deck no mais forte —
> porque passa a falar da prefeitura *dele*, com número que ele reconhece.

Os três números do diagnóstico **não podem** ser inventados. Opções, em ordem de preferência:

1. **Dados do próprio município-alvo**, coletados antes da reunião (nº de processos/ano, nº de
   secretarias, tempo médio até o pagamento). — *melhor caminho, torna tudo verificável*
2. **Fontes públicas citadas em tela** (Portal da Transparência do município, relatórios do TCE-CE,
   IEGM). — *aceitável, exige citar a fonte no rodapé do slide*
3. **Estimativa rotulada**, com a premissa escrita no próprio slide.

O deck foi construído na opção 3 com marcadores `[[PREENCHER]]`, para você substituir pela opção 1
assim que tiver o município definido.

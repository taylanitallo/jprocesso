// Registro bloco → tela da seção. A ordem e o nome das etapas vêm do fluxo do DID
// (server/config/didBlocos.js); aqui só se escolhe o componente que desenha cada bloco.
// Bloco com tela de um tipo só usa a mesma tela no outro (os campos são as mesmas colunas).
import DidFixasSecaoI from './fixas/DidFixasSecaoI'
import DidFixasSecaoII from './fixas/DidFixasSecaoII'
import DidFixasSecaoIII from './fixas/DidFixasSecaoIII'
import DidFixasSecaoIV from './fixas/DidFixasSecaoIV'
import DidFixasSecaoV from './fixas/DidFixasSecaoV'
import DidFixasSecaoVI from './fixas/DidFixasSecaoVI'
import DidFixasSecaoVII from './fixas/DidFixasSecaoVII'
import DidVariaveisSecaoI from './variaveis/DidVariaveisSecaoI'
import DidVariaveisSecaoII from './variaveis/DidVariaveisSecaoII'
import DidVariaveisSecaoIII from './variaveis/DidVariaveisSecaoIII'
import DidVariaveisSecaoIV from './variaveis/DidVariaveisSecaoIV'
import DidVariaveisSecaoV from './variaveis/DidVariaveisSecaoV'
import DidVariaveisSecaoVI from './variaveis/DidVariaveisSecaoVI'
import DidVariaveisSecaoVII from './variaveis/DidVariaveisSecaoVII'
import DidVariaveisSecaoVIII from './variaveis/DidVariaveisSecaoVIII'
import DidVariaveisSecaoIX from './variaveis/DidVariaveisSecaoIX'
import DidVariaveisSecaoX from './variaveis/DidVariaveisSecaoX'
import DidVariaveisSecaoXI from './variaveis/DidVariaveisSecaoXI'
import DidVariaveisSecaoXII from './variaveis/DidVariaveisSecaoXII'

export const TELAS_BLOCO = {
  abertura: { fixas: DidFixasSecaoI, variaveis: DidVariaveisSecaoI },
  controle_interno: { fixas: DidFixasSecaoII, variaveis: DidVariaveisSecaoII },
  financas_autorizacao: { fixas: DidFixasSecaoIII, variaveis: DidVariaveisSecaoIII },
  compras_solicitacao: { variaveis: DidVariaveisSecaoIV },
  contab_empenho: { variaveis: DidVariaveisSecaoV },
  contab_empenho_liquidacao: { fixas: DidFixasSecaoIV },
  compras_ordem: { variaveis: DidVariaveisSecaoVI },
  almox_recebimento: { variaveis: DidVariaveisSecaoVII },
  compras_ateste: { variaveis: DidVariaveisSecaoVIII },
  contab_liquidacao: { variaveis: DidVariaveisSecaoIX },
  financas_pagamento: { fixas: DidFixasSecaoV, variaveis: DidVariaveisSecaoX },
  tesouraria: { fixas: DidFixasSecaoVI, variaveis: DidVariaveisSecaoXI },
  fechamento: { fixas: DidFixasSecaoVII, variaveis: DidVariaveisSecaoXII },
}

export function telaDoBloco(bloco, tipo) {
  const t = TELAS_BLOCO[bloco]
  if (!t) return null
  return t[tipo] || t.fixas || t.variaveis
}

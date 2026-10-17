// Aviso de "sair sem salvar" para telas que editam um rascunho (ex.: Fluxos do DID).
// O app usa <BrowserRouter> (sem useBlocker), então o aviso cobre:
//  - recarregar/fechar a aba (beforeunload);
//  - cliques em links internos (menu lateral, cartões, <Link>), interceptados antes do roteador;
//  - trocas feitas por código (abas de Configurações, botão Atualizar): chamar confirmarSaida().
import { useEffect } from 'react'

let mensagemPendente = null
let saidaConfirmada = false // já confirmou (ex.: Sair/Atualizar): o navegador não pergunta de novo

/** true = pode sair (não há pendência ou a pessoa confirmou) */
export const confirmarSaida = () => {
  if (!mensagemPendente) return true
  saidaConfirmada = window.confirm(mensagemPendente)
  return saidaConfirmada
}

export function useAvisoSairSemSalvar(ativo, mensagem = 'Há alterações não salvas. Deseja sair sem salvar?') {
  useEffect(() => {
    if (!ativo) return undefined
    mensagemPendente = mensagem
    saidaConfirmada = false

    const antesDeSair = (e) => { if (saidaConfirmada) return; e.preventDefault(); e.returnValue = '' }
    const aoClicar = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = e.target?.closest?.('a[href]')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return
      if (!window.confirm(mensagem)) { e.preventDefault(); e.stopPropagation() }
    }

    window.addEventListener('beforeunload', antesDeSair)
    document.addEventListener('click', aoClicar, true) // captura: roda antes do <Link>
    return () => {
      mensagemPendente = null
      window.removeEventListener('beforeunload', antesDeSair)
      document.removeEventListener('click', aoClicar, true)
    }
  }, [ativo, mensagem])
}

// Aviso de "sair sem salvar" para telas que editam um rascunho (ex.: Fluxos do DID).
// O app usa <BrowserRouter> (sem useBlocker), então o aviso cobre:
//  - cliques em links internos (menu lateral, cartões, <Link>), interceptados antes do roteador;
//  - trocas feitas por código (abas de Configurações, botão Atualizar, Sair): await confirmarSaida();
//  - recarregar/fechar a aba (beforeunload) — aqui o aviso é sempre o do navegador
//    (nenhum site pode trocar essa janela).
// A pergunta usa a janela do sistema (components/AvisoSairHost, montado no Layout).
import { useEffect } from 'react'

let mensagemPendente = null
let saidaConfirmada = false // já confirmou (ex.: Sair/Atualizar): o navegador não pergunta de novo
let abrirConfirmacao = null // (mensagem) => Promise<boolean>, registrado pelo AvisoSairHost
let navegar = null          // navigate do roteador, registrado pelo AvisoSairHost

/** Chamado pelo AvisoSairHost para usar a janela do sistema e o roteador */
export function registrarHostSaida(abrir, nav) {
  abrirConfirmacao = abrir
  navegar = nav
  return () => { if (abrirConfirmacao === abrir) { abrirConfirmacao = null; navegar = null } }
}

/** Resolve true se pode sair (não há pendência ou a pessoa confirmou) */
export async function confirmarSaida() {
  if (!mensagemPendente) return true
  const ok = abrirConfirmacao ? await abrirConfirmacao(mensagemPendente) : window.confirm(mensagemPendente)
  saidaConfirmada = ok
  return ok
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
      // Segura a navegação, pergunta na janela do sistema e só então segue
      e.preventDefault()
      e.stopPropagation()
      confirmarSaida().then(ok => {
        if (!ok) return
        const destino = url.pathname + url.search + url.hash
        if (navegar) navegar(destino); else window.location.assign(destino)
      })
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

/**
 * Paginacao — barra de paginação padrão de todas as listas do sistema.
 *
 *   "Mostrando 1–10 de 42"  ·  Exibir [10 ▾] por página  ·  Anterior 1 2 3 … Próximo
 *
 * O usuário escolhe quantos itens ver (10, 15, 20, 30 ou 50); a escolha fica
 * guardada por tela (usePaginacao, chave). Se couber tudo numa página, os botões
 * de página somem e o seletor continua.
 *
 * Lista no navegador:
 *   const pg = usePaginacao('contratos', lista.length)
 *   pg.fatia(lista).map(...)
 *   <Paginacao {...pg} total={lista.length} />
 *
 * Lista paginada no servidor: usePaginacao(chave, totalDoServidor) e mande
 * pg.porPagina como limit e pg.pagina como page na consulta.
 */
import { useEffect, useMemo, useState } from 'react'

export const OPCOES_POR_PAGINA = [10, 15, 20, 30, 50]

const lerPreferencia = (chave, padrao) => {
  try {
    const v = parseInt(localStorage.getItem(`porPagina:${chave}`), 10)
    return OPCOES_POR_PAGINA.includes(v) ? v : padrao
  } catch { return padrao }
}

/**
 * Só a quantidade por página (guardada por tela), para telas que já controlam a
 * página atual por conta própria. Lembre de voltar à página 1 ao trocar.
 */
export function usePorPagina(chave, padrao = 10) {
  const [porPagina, setPorPaginaState] = useState(() => lerPreferencia(chave, padrao))
  const setPorPagina = (n) => {
    setPorPaginaState(n)
    try { localStorage.setItem(`porPagina:${chave}`, String(n)) } catch { /* só nesta sessão */ }
  }
  return [porPagina, setPorPagina]
}

/**
 * Estado da paginação de uma lista.
 * @param chave   identifica a tela (guarda a escolha de itens por página)
 * @param total   quantidade de itens da lista (já filtrada) ou total do servidor
 * @param padrao  itens por página até o usuário escolher
 */
export function usePaginacao(chave, total = 0, padrao = 10) {
  const [porPagina, setPorPaginaState] = useState(() => lerPreferencia(chave, padrao))
  const [pagina, setPagina] = useState(1)
  const totalPaginas = Math.max(1, Math.ceil((total || 0) / porPagina))

  // Filtro que encolhe a lista: volta para a última página que existe
  useEffect(() => { if (pagina > totalPaginas) setPagina(totalPaginas) }, [pagina, totalPaginas])

  const setPorPagina = (n) => {
    setPorPaginaState(n)
    setPagina(1)
    try { localStorage.setItem(`porPagina:${chave}`, String(n)) } catch { /* sem armazenamento: só nesta sessão */ }
  }

  return useMemo(() => ({
    pagina, setPagina, porPagina, setPorPagina, totalPaginas,
    inicio: (pagina - 1) * porPagina,
    fatia: (lista) => (lista || []).slice((pagina - 1) * porPagina, pagina * porPagina),
  }), [pagina, porPagina, totalPaginas]) // eslint-disable-line react-hooks/exhaustive-deps
}

const paginasVisiveis = (pagina, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (pagina <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (pagina >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', pagina - 1, pagina, pagina + 1, '…', total]
}

export default function Paginacao({
  total, pagina, setPagina, porPagina, setPorPagina, rotulo = 'registro', rotuloPlural, className = '',
  embutido = false, // dentro de um rodapé que já tem espaçamento
}) {
  if (!total) return null
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const de = (pagina - 1) * porPagina + 1
  const ate = Math.min(pagina * porPagina, total)
  const plural = rotuloPlural || `${rotulo}s`
  const btn = 'h-7 min-w-7 px-2 rounded-md border text-xs font-medium transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500'

  return (
    <nav aria-label="Paginação" className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 ${embutido ? "" : "px-4 py-2.5"} text-xs text-ink-500 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span aria-live="polite">Mostrando <b className="text-ink-700">{de}–{ate}</b> de <b className="text-ink-700">{total}</b> {total === 1 ? rotulo : plural}</span>
        {setPorPagina && (
          <label className="flex items-center gap-1.5">
            Exibir
            <select value={porPagina} onChange={(e) => setPorPagina(Number(e.target.value))}
              className="h-7 rounded-md border border-ink-200 bg-surface px-1.5 text-xs text-ink-700 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Itens por página">
              {OPCOES_POR_PAGINA.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            por página
          </label>
        )}
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setPagina(Math.max(1, pagina - 1))} disabled={pagina === 1}
            className={`${btn} border-ink-200 text-ink-600 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed`}>Anterior</button>
          {paginasVisiveis(pagina, totalPaginas).map((p, i) => (p === '…'
            ? <span key={`r${i}`} className="px-1 text-ink-400" aria-hidden="true">…</span>
            : <button key={p} type="button" onClick={() => setPagina(p)} aria-current={p === pagina ? 'page' : undefined}
                className={`${btn} ${p === pagina ? 'bg-brand-600 text-white border-brand-600' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}>{p}</button>
          ))}
          <button type="button" onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))} disabled={pagina >= totalPaginas}
            className={`${btn} border-ink-200 text-ink-600 hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed`}>Próximo</button>
        </div>
      )}
    </nav>
  )
}

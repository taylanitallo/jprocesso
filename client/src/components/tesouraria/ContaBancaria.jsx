// Peças de conta bancária usadas em toda a Tesouraria:
//   ContaPicker  — busca de conta acessível (teclado, leitor de tela)
//   ContaLink    — número/nome da conta clicável → abre o painel da conta
//   ContaPainel  — painel lateral: dados, situação (saldo, a pagar, a recolher,
//                  disponível) e extrato com período
//   PeriodoRapido — atalhos de período (este mês, mês anterior, 30 dias, ano)
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Landmark, X, Search, ChevronDown, Loader2, ExternalLink, RotateCcw, Wallet, Check,
} from 'lucide-react'
import api from '../../services/api'
import { Paginacao, usePaginacao } from '../ui'

// ── Formatação ────────────────────────────────────────────────────────────────
export const numeroConta = (c) => (c?.conta ? `${c.conta}${c.conta_digito ? `-${c.conta_digito}` : ''}` : '')
export const agenciaConta = (c) => (c?.agencia ? `${c.agencia}${c.agencia_digito ? `-${c.agencia_digito}` : ''}` : '')
export const contaLabel = (c) => (numeroConta(c) ? `${numeroConta(c)} — ${c.nome}` : c?.nome || '')
export const fmtMoeda = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, dia] = String(d).slice(0, 10).split('-')
  return `${dia}/${m}/${y}`
}
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const digitos = (s) => String(s ?? '').replace(/\D/g, '')

// Texto em que a busca procura: nome, número, agência, banco, secretaria
const textoBusca = (c) => norm([c.nome, numeroConta(c), agenciaConta(c), c.banco_nome, c.banco_codigo, c.secretaria?.sigla, c.secretaria?.nome, c.titular].join(' '))
const casa = (c, q) => {
  if (!q) return true
  const qn = norm(q)
  if (textoBusca(c).includes(qn)) return true
  const qd = digitos(q)
  return qd.length >= 2 && (digitos(numeroConta(c)).includes(qd) || digitos(agenciaConta(c)).includes(qd))
}

// ── Períodos rápidos ──────────────────────────────────────────────────────────
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const PERIODOS = [
  { id: 'mes', label: 'Este mês', faixa: () => { const h = new Date(); return [iso(new Date(h.getFullYear(), h.getMonth(), 1)), iso(h)] } },
  { id: 'mes_ant', label: 'Mês anterior', faixa: () => { const h = new Date(); return [iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), iso(new Date(h.getFullYear(), h.getMonth(), 0))] } },
  { id: '30d', label: 'Últimos 30 dias', faixa: () => { const h = new Date(); const i = new Date(h); i.setDate(h.getDate() - 29); return [iso(i), iso(h)] } },
  { id: 'ano', label: 'Este ano', faixa: () => { const h = new Date(); return [`${h.getFullYear()}-01-01`, iso(h)] } },
]

/** Botões de período; marca o atalho que corresponde às datas atuais */
export function PeriodoRapido({ de, ate, onChange, className = '' }) {
  const ativo = PERIODOS.find(p => { const [a, b] = p.faixa(); return a === de && b === ate })?.id
  return (
    <div role="group" aria-label="Períodos rápidos" className={`flex flex-wrap gap-1.5 ${className}`}>
      {PERIODOS.map(p => (
        <button key={p.id} type="button" aria-pressed={ativo === p.id}
          onClick={() => { const [a, b] = p.faixa(); onChange(a, b) }}
          className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 ${ativo === p.id
            ? 'bg-brand-600 text-white border-brand-600'
            : 'bg-surface text-ink-600 border-ink-200 hover:bg-ink-100'}`}>
          {p.label}
        </button>
      ))}
      {(de || ate) && (
        <button type="button" onClick={() => onChange('', '')}
          className="text-xs px-2.5 py-1 rounded-full font-medium text-ink-500 hover:text-ink-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500">
          Todo o período
        </button>
      )}
    </div>
  )
}

/**
 * Botão "Limpar filtros" padrão. Sempre visível e clicável (desabilitado parecia
 * ausente); com filtro ativo ganha destaque e o número de filtros.
 * @param ativo  boolean ou número de filtros ativos
 */
export function BotaoLimpar({ onClick, ativo = true, className = '' }) {
  const qtd = typeof ativo === 'number' ? ativo : null
  const temFiltro = qtd != null ? qtd > 0 : !!ativo
  return (
    <button type="button" onClick={onClick}
      title={temFiltro ? 'Remover todos os filtros' : 'Nenhum filtro aplicado'}
      className={`btn-secondary text-sm px-3 py-2 flex items-center gap-1.5 ${temFiltro ? 'border-brand-400 text-brand-700 dark:text-info-300' : ''} ${className}`}>
      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Limpar filtros
      {qtd > 0 && (
        <span className="ml-0.5 text-[10px] font-bold bg-brand-600 text-white rounded-full min-w-4 h-4 px-1 inline-flex items-center justify-center" aria-label={`${qtd} filtro(s) ativo(s)`}>{qtd}</span>
      )}
    </button>
  )
}

// ── Seletor de conta ──────────────────────────────────────────────────────────
/**
 * Combobox acessível: digite nome, nº da conta, agência, banco ou secretaria.
 * Setas ↑↓ navegam, Enter escolhe, Esc fecha.
 * @param todasLabel — se informado, oferece a opção "todas" (value '')
 */
export function ContaPicker({ value, contas = [], onChange, id, placeholder = 'Buscar por nome, nº da conta, agência ou banco…', todasLabel, autoFocus = false }) {
  const gerado = useId()
  const inputId = id || `conta-${gerado}`
  const listId = `${inputId}-lista`
  const [texto, setTexto] = useState('')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const caixa = useRef(null)
  const lista = useRef(null)
  const selecionada = contas.find(c => c.id === value) || null

  useEffect(() => { setTexto(selecionada ? contaLabel(selecionada) : '') }, [value, contas]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fora = (e) => { if (caixa.current && !caixa.current.contains(e.target)) fechar() }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  })

  const termo = selecionada && texto === contaLabel(selecionada) ? '' : texto
  const opcoes = useMemo(() => {
    const achadas = contas.filter(c => casa(c, termo)).slice(0, 60)
    return todasLabel ? [{ id: '', todas: true }, ...achadas] : achadas
  }, [contas, termo, todasLabel])

  const fechar = () => {
    setAberto(false)
    setTexto(selecionada ? contaLabel(selecionada) : '')
  }
  const escolher = (c) => {
    onChange(c.todas ? '' : c.id)
    setTexto(c.todas ? '' : contaLabel(c))
    setAberto(false)
  }
  const abrir = () => { setAberto(true); setAtivo(Math.max(0, opcoes.findIndex(o => o.id === value))) }

  useEffect(() => {
    if (!aberto || !lista.current) return
    lista.current.querySelector(`[data-idx="${ativo}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [ativo, aberto])

  const teclado = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!aberto) abrir(); else setAtivo(i => Math.min(opcoes.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { if (aberto && opcoes[ativo]) { e.preventDefault(); escolher(opcoes[ativo]) } }
    else if (e.key === 'Escape') { if (aberto) { e.preventDefault(); fechar() } }
    else if (e.key === 'Tab') { if (aberto) fechar() }
  }

  return (
    <div ref={caixa} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={aberto && opcoes[ativo] ? `${listId}-${ativo}` : undefined}
          value={texto}
          autoFocus={autoFocus}
          onChange={(e) => { setTexto(e.target.value); setAberto(true); setAtivo(todasLabel ? 1 : 0) }}
          onFocus={(e) => { e.target.select(); abrir() }}
          onKeyDown={teclado}
          className="input-field text-sm pl-8 pr-14"
          placeholder={todasLabel && !selecionada ? todasLabel : placeholder}
          autoComplete="off"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && (
            <button type="button" aria-label="Limpar conta escolhida" title="Limpar"
              onClick={() => { onChange(''); setTexto(''); }}
              className="p-1 rounded-sm text-ink-400 hover:text-ink-700 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-ink-400 pointer-events-none" aria-hidden="true" />
        </div>
      </div>

      {aberto && (
        <ul id={listId} ref={lista} role="listbox" aria-label="Contas bancárias"
          className="absolute z-50 w-full min-w-[20rem] mt-1 bg-surface border border-ink-200 rounded-xl shadow-xl max-h-72 overflow-y-auto py-1">
          {opcoes.length === 0 && (
            <li className="px-3 py-3 text-sm text-ink-500">Nenhuma conta encontrada para “{termo}”.</li>
          )}
          {opcoes.map((c, i) => {
            const sel = c.todas ? !value : c.id === value
            return (
              <li key={c.id || 'todas'} id={`${listId}-${i}`} data-idx={i} role="option" aria-selected={sel}
                onMouseDown={(e) => { e.preventDefault(); escolher(c) }}
                onMouseEnter={() => setAtivo(i)}
                className={`px-3 py-2 cursor-pointer flex items-start gap-2 ${i === ativo ? 'bg-info-50 dark:bg-info-900/20' : ''}`}>
                <span className="w-4 shrink-0 pt-0.5" aria-hidden="true">{sel && <Check className="h-3.5 w-3.5 text-brand-600" />}</span>
                {c.todas ? (
                  <span className="text-sm font-medium text-ink-800">{todasLabel}</span>
                ) : (
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink-900 truncate">{c.nome}</span>
                      {c.secretaria?.sigla && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-info-50 text-brand-700 dark:bg-info-900/30 dark:text-info-300">{c.secretaria.sigla}</span>
                      )}
                      {c.ativo === false && <span className="shrink-0 text-[10px] text-ink-400">inativa</span>}
                    </span>
                    <span className="block text-xs text-ink-500 font-mono truncate">
                      {[c.banco_nome, agenciaConta(c) && `Ag ${agenciaConta(c)}`, numeroConta(c) && `C/C ${numeroConta(c)}`].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Link da conta ─────────────────────────────────────────────────────────────
/**
 * Número/nome da conta clicável. Recebe o objeto da conta (ou só o id e um rótulo).
 * mostrar: 'numero' | 'nome' | 'ambos'
 */
export function ContaLink({ conta, contaId, rotulo, mostrar = 'ambos', className = '' }) {
  const [aberto, setAberto] = useState(false)
  const id = conta?.id || contaId
  if (!id) return <span className="text-ink-400">—</span>
  const num = numeroConta(conta)
  const texto = rotulo || (mostrar === 'numero' ? (num || conta?.nome) : mostrar === 'nome' ? conta?.nome : contaLabel(conta))
  return (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); setAberto(true) }}
        title="Ver a conta: saldo, disponível e extrato"
        aria-label={`Ver conta ${contaLabel(conta) || texto}`}
        className={`text-left font-medium text-brand-600 dark:text-info-400 hover:underline underline-offset-2 rounded-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 ${mostrar === 'numero' ? 'font-mono' : ''} ${className}`}>
        {texto || 'Conta'}
      </button>
      {aberto && <ContaPainel contaId={id} onClose={() => setAberto(false)} />}
    </>
  )
}

// ── Painel da conta ───────────────────────────────────────────────────────────
export function ContaPainel({ contaId, onClose }) {
  const { subdomain } = useParams()
  const tituloId = useId()
  const fecharRef = useRef(null)
  const [de, setDe] = useState(() => PERIODOS[0].faixa()[0])
  const [ate, setAte] = useState(() => PERIODOS[0].faixa()[1])
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    setErro('')
    const params = { conta_id: contaId }
    if (de) params.data_de = de
    if (ate) params.data_ate = ate
    api.get('/tesouraria/relatorios/extrato', { params })
      .then(({ data }) => setDados(data))
      .catch((e) => setErro(e.response?.data?.error || 'Não foi possível carregar a conta.'))
      .finally(() => setCarregando(false))
  }, [contaId, de, ate])

  useEffect(() => {
    fecharRef.current?.focus()
    const tecla = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', tecla)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = overflow }
  }, [onClose])

  const c = dados?.conta
  const s = dados?.situacao
  const t = dados?.totais

  const pgLanc = usePaginacao('tes-painel-conta', (dados?.lancamentos?.length || 0));

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-labelledby={tituloId}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative h-full w-full max-w-3xl bg-ink-50 shadow-2xl flex flex-col animate-fade-in">
        {/* Cabeçalho */}
        <div className="shrink-0 bg-surface border-b border-ink-200 px-5 py-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-success-700 dark:text-success-400" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={tituloId} className="text-base font-bold text-ink-900 truncate">{c ? c.nome : 'Conta bancária'}</h2>
            {c && (
              <p className="text-xs text-ink-500 mt-0.5 flex flex-wrap gap-x-3">
                {c.banco_nome && <span>{c.banco_nome}{c.banco_codigo ? ` (${c.banco_codigo})` : ''}</span>}
                {agenciaConta(c) && <span>Ag <strong className="font-mono text-ink-700">{agenciaConta(c)}</strong></span>}
                {numeroConta(c) && <span>C/C <strong className="font-mono text-ink-700">{numeroConta(c)}</strong></span>}
                {c.secretaria && <span>{c.secretaria.sigla || c.secretaria.nome}</span>}
                {c.ativo === false && <span className="text-amber-700">Inativa</span>}
              </p>
            )}
          </div>
          <button ref={fecharRef} onClick={onClose} aria-label="Fechar painel da conta" title="Fechar (Esc)"
            className="p-2 rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {erro && <p role="alert" className="text-sm text-danger-600">{erro}</p>}

          {/* Situação de hoje */}
          {s && (
            <section aria-label="Situação da conta hoje" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { rot: 'Saldo atual', v: s.saldo, cls: s.saldo < 0 ? 'text-danger-600' : 'text-ink-900' },
                { rot: 'DIDs a pagar', v: s.comprometido, cls: 'text-amber-700 dark:text-amber-400', dica: 'DIDs com esta conta escolhida e ainda não pagos' },
                { rot: 'Retenções a recolher', v: s.a_recolher, cls: 'text-amber-700 dark:text-amber-400', dica: 'Retenções de DIDs pagos ainda não recolhidas' },
                { rot: 'Disponível', v: s.disponivel, cls: s.disponivel < 0 ? 'text-danger-600' : 'text-success-700 dark:text-success-400', destaque: true },
              ].map(k => (
                <div key={k.rot} title={k.dica} className={`rounded-xl border p-3 ${k.destaque ? 'bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800' : 'bg-surface border-ink-200'}`}>
                  <p className="text-xs text-ink-500 flex items-center gap-1">{k.destaque && <Wallet className="w-3 h-3" aria-hidden="true" />}{k.rot}</p>
                  <p className={`text-lg font-bold tabular-nums ${k.cls}`}>{fmtMoeda(k.v)}</p>
                </div>
              ))}
            </section>
          )}

          {/* Período do extrato */}
          <section aria-label="Período do extrato" className="bg-surface rounded-xl border border-ink-200 p-3 space-y-2">
            <PeriodoRapido de={de} ate={ate} onChange={(a, b) => { setDe(a); setAte(b) }} />
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor={`${tituloId}-de`} className="block text-xs font-medium text-ink-600 mb-1">De</label>
                <input id={`${tituloId}-de`} type="date" value={de} onChange={e => setDe(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label htmlFor={`${tituloId}-ate`} className="block text-xs font-medium text-ink-600 mb-1">Até</label>
                <input id={`${tituloId}-ate`} type="date" value={ate} onChange={e => setAte(e.target.value)} className="input-field text-sm" />
              </div>
              {carregando && <Loader2 className="w-4 h-4 animate-spin text-ink-400 mb-2.5" aria-label="Carregando" />}
            </div>
          </section>

          {/* Extrato */}
          {dados && (
            <section aria-label="Extrato da conta" className="bg-surface rounded-xl border border-ink-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Extrato de {c?.nome} {de ? `de ${fmtData(de)}` : ''} {ate ? `até ${fmtData(ate)}` : ''}</caption>
                  <thead className="bg-ink-100 text-ink-600">
                    <tr>
                      <th scope="col" className="text-left px-3 py-2 text-xs font-semibold">Data</th>
                      <th scope="col" className="text-left px-3 py-2 text-xs font-semibold">Descrição</th>
                      <th scope="col" className="text-right px-3 py-2 text-xs font-semibold">Crédito</th>
                      <th scope="col" className="text-right px-3 py-2 text-xs font-semibold">Débito</th>
                      <th scope="col" className="text-right px-3 py-2 text-xs font-semibold">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {de && (
                      <tr className="bg-ink-50">
                        <td className="px-3 py-2 text-xs text-ink-500 whitespace-nowrap">{fmtData(de)}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-ink-700">Saldo anterior</td>
                        <td /><td />
                        <td className={`px-3 py-2 text-right text-xs font-bold tabular-nums ${t.saldo_anterior < 0 ? 'text-danger-600' : 'text-ink-800'}`}>{fmtMoeda(t.saldo_anterior)}</td>
                      </tr>
                    )}
                    {dados.lancamentos.length === 0 && (
                      <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-ink-400">Nenhuma movimentação neste período.</td></tr>
                    )}
                    {pgLanc.fatia(dados.lancamentos).map((l, i) => (
                      <tr key={i} className={l.tipo === 'R' ? 'bg-success-50/50 dark:bg-success-900/10' : ''}>
                        <td className="px-3 py-2 text-xs text-ink-600 whitespace-nowrap">{fmtData(l.data)}</td>
                        <td className="px-3 py-2 text-xs text-ink-800">
                          {l.descricao}
                          {l.origem === 'did' && l.retencoes > 0 && (
                            <span className="block text-[10px] text-ink-500">Bruto {fmtMoeda(l.valor_bruto)} · retenções {fmtMoeda(l.retencoes)}</span>
                          )}
                          {l.processo_id && (
                            <Link to={`/${subdomain}/processos/${l.processo_id}`} className="inline-flex items-center gap-0.5 text-[10px] text-brand-600 dark:text-info-400 hover:underline">
                              Ver processo <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                            </Link>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-medium text-success-700 dark:text-success-400 tabular-nums whitespace-nowrap">{l.tipo === 'R' ? fmtMoeda(l.valor) : ''}</td>
                        <td className="px-3 py-2 text-right text-xs font-medium text-danger-600 dark:text-danger-400 tabular-nums whitespace-nowrap">{l.tipo === 'D' ? fmtMoeda(l.valor) : ''}</td>
                        <td className={`px-3 py-2 text-right text-xs font-bold tabular-nums whitespace-nowrap ${l.saldo < 0 ? 'text-danger-600' : 'text-ink-800'}`}>{fmtMoeda(l.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-ink-50">
                    <tr>
                      <th scope="row" colSpan={2} className="px-3 py-2 text-left text-xs font-bold text-ink-800">Totais do período</th>
                      <td className="px-3 py-2 text-right text-xs font-bold text-success-700 dark:text-success-400 tabular-nums">{fmtMoeda(t.receitas)}</td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-danger-600 dark:text-danger-400 tabular-nums">{fmtMoeda(t.despesas)}</td>
                      <td className={`px-3 py-2 text-right text-xs font-bold tabular-nums ${t.saldo < 0 ? 'text-danger-600' : 'text-ink-900'}`}>{fmtMoeda(t.saldo)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {(dados?.lancamentos?.length || 0) > 0 && <Paginacao {...pgLanc} total={(dados?.lancamentos?.length || 0)} rotulo="lançamento" className="border-t border-ink-100" />}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// Fluxo do DID por etapas (tela) — a regra mora no servidor (server/config/didBlocos.js
// e services/didEtapasService.js); aqui só se mostra o que ele devolve:
//   LinhaEtapas      — todas as etapas nomeadas, com status e setor responsável
//   EtapaRegistro    — quem concluiu (nome, cargo, secretaria), quando e a assinatura
//   EtapaAguardando  — etapa atual que o usuário não pode preencher, com o motivo
//   EtapaAcoes       — salvar rascunho · concluir e assinar · devolver à etapa anterior
//   ResponsavelEtapa — responsável automático: o usuário logado (não se escolhe)
import { createContext, useContext, useEffect, useState } from 'react'
import { Check, Clock, Lock, Undo2, Loader2, ShieldCheck, Save, PenLine, UserCheck, AlertTriangle, CornerDownLeft } from 'lucide-react'
import api from '../../services/api'
import { ConfirmModal } from '../../components/ui'

export const EtapaDidContext = createContext({ resumo: null, numero: null, editavel: false })

const fmtDataHora = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}
const fmtData = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '')

/** Busca o resumo das etapas (status, etapa atual, se o usuário pode e por quê) */
export function useEtapasDid(processoId, tipo) {
  const [resumo, setResumo] = useState(null)
  const [versao, setVersao] = useState(0)
  useEffect(() => {
    let vivo = true
    api.get(`/did/processo/${processoId}/etapas`, { params: { tipo } })
      .then(({ data }) => { if (vivo) setResumo(data) })
      .catch(() => { if (vivo) setResumo(null) })
    return () => { vivo = false }
  }, [processoId, tipo, versao])
  return { resumo, recarregar: () => setVersao(v => v + 1) }
}

/** Mesma regra de obrigatórios do servidor (didEtapasService.pendencias) */
export function pendenciasEtapa(etapa, form, itensDid) {
  const vazio = (v) => v === undefined || v === null || String(v).trim() === ''
  const dados = form.etapas_dados?.[etapa?.id] || {}
  return (etapa?.campos || []).filter((c) => {
    if (!c.obrigatorio) return false
    if (c.personalizado) {
      const v = dados[c.campo]
      if (c.personalizado === 'checklist') return !(c.itens || []).every((_, i) => v?.[i] === true)
      return vazio(v)
    }
    if (c.se && form[c.se.campo] !== c.se.igual) return false
    if (c.itens) return !(itensDid || []).some(it => parseFloat(it.valor_total) > 0)
    if (c.checkbox) return form[c.campo] !== true
    if (c.igual) return form[c.campo] !== c.igual
    if (c.numero) return vazio(form[c.campo]) || Number.isNaN(parseFloat(form[c.campo]))
    return vazio(form[c.campo])
  }).map(c => c.rotulo)
}

const ICONE = {
  concluida: { Icon: Check, cls: 'bg-success-600 text-white border-success-600', rot: 'Concluída' },
  atual: { Icon: PenLine, cls: 'bg-brand-600 text-white border-brand-600', rot: 'Etapa atual' },
  devolvida: { Icon: CornerDownLeft, cls: 'bg-orange-500 text-white border-orange-500', rot: 'Devolvida' },
  pendente: { Icon: Lock, cls: 'bg-surface text-ink-400 border-ink-300', rot: 'Aguardando' },
}

const setoresTexto = (etapa) => (etapa.setores || []).map(s => (s.todos ? s.nome : (s.sigla || s.nome))).join(', ') || '—'

export function LinhaEtapas({ resumo }) {
  if (!resumo) return null
  const concluidas = resumo.etapas.filter(e => e.status === 'concluida').length
  return (
    <nav aria-label="Etapas do DID" className="card p-4">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <p className="text-sm font-semibold text-ink-700">Etapas do DID</p>
        <p className="text-xs text-ink-500">{concluidas} de {resumo.etapas.length} concluídas</p>
      </div>
      <ol className="flex gap-2 overflow-x-auto pb-1">
        {resumo.etapas.map(e => {
          const { Icon, cls, rot } = ICONE[e.status]
          return (
            <li key={e.numero} className="shrink-0 w-36" aria-current={e.status === 'atual' || e.status === 'devolvida' ? 'step' : undefined}>
              <a href={`#etapa-${e.numero}`} className="block rounded-lg p-2 hover:bg-ink-50 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
                title={`${e.titulo} · ${rot} · Setor: ${setoresTexto(e)}`}>
                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${cls}`}>
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <span className="block mt-1.5 text-[11px] font-semibold text-ink-800 leading-tight">{e.secao}</span>
                <span className="block text-[11px] text-ink-600 leading-tight line-clamp-2">{e.nome}</span>
                <span className="block text-[10px] text-ink-400 truncate">{setoresTexto(e)}</span>
                <span className="sr-only">— {rot}</span>
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Faixa de "concluída por …" abaixo de uma etapa concluída (ou devolvida) */
export function EtapaRegistro({ etapa }) {
  const r = etapa?.registro
  if (!r) return null
  return (
    <div className="-mt-2 mb-2 rounded-b-xl border border-t-0 border-ink-200 bg-ink-50 px-4 py-2.5 text-xs text-ink-600 space-y-1">
      {r.status === 'concluida' || r.devolucao ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <UserCheck className="w-3.5 h-3.5 text-success-600" aria-hidden="true" />
          {r.legado
            ? <span>Concluída antes do fluxo por etapas{r.nome ? <> · responsável informado: <strong>{r.nome}</strong></> : ''} (sem assinatura)</span>
            : <>
                <span>Concluída por <strong className="text-ink-800">{r.nome}</strong>{r.cargo ? `, ${r.cargo}` : ''}{r.secretaria ? ` · ${r.secretaria}` : ''}{r.setor ? ` / ${r.setor}` : ''}</span>
                <span>em {fmtDataHora(r.concluida_em)}</span>
                {r.assinatura && (
                  <span className="inline-flex items-center gap-1 text-success-700 dark:text-success-400">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Assinado eletronicamente · código {r.assinatura.codigo_verificador} · CRC {r.assinatura.codigo_crc}
                  </span>
                )}
              </>}
        </p>
      ) : null}
      {r.devolucao && (
        <p className="flex items-start gap-2 text-orange-700 dark:text-orange-300">
          <CornerDownLeft className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
          <span>Devolvida por <strong>{r.devolucao.por}</strong> ({r.devolucao.etapa}) em {fmtDataHora(r.devolucao.em)}: “{r.devolucao.justificativa}”</span>
        </p>
      )}
    </div>
  )
}

/** Etapa atual que este usuário não pode preencher */
export function EtapaAguardando({ etapa, resumo }) {
  return (
    <section id={`etapa-${etapa.numero}`} aria-labelledby={`etapa-${etapa.numero}-tit`}
      className="rounded-xl border-2 border-dashed border-ink-300 bg-surface px-5 py-4 flex items-start gap-3">
      <Clock className="w-6 h-6 text-ink-400 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <h2 id={`etapa-${etapa.numero}-tit`} className="text-sm font-semibold text-ink-800">{etapa.titulo} — aguardando preenchimento</h2>
        <p className="text-sm text-ink-600 mt-0.5">{resumo.motivo}</p>
        <p className="text-xs text-ink-500 mt-1">
          Preenchida por: <strong>{setoresTexto(etapa)}</strong>
          {resumo.processo?.setor_atual && <> · O processo está em: <strong>{resumo.processo.setor_atual.sigla || resumo.processo.setor_atual.nome}</strong></>}
        </p>
      </div>
    </section>
  )
}

/** Responsável da etapa: na etapa em preenchimento é o usuário logado; nas outras, quem concluiu */
export function ResponsavelEtapa({ valor }) {
  const { resumo, editavel } = useContext(EtapaDidContext)
  const u = resumo?.usuario
  if (editavel && u) {
    return (
      <div className="rounded-lg border border-info-200 bg-info-50 dark:bg-info-900/20 dark:border-info-800 px-3 py-2 text-sm" aria-live="polite">
        <p className="font-semibold text-ink-900 flex items-center gap-1.5"><UserCheck className="w-4 h-4 text-brand-600" aria-hidden="true" /> {u.nome}</p>
        <p className="text-xs text-ink-600">
          {[u.cargo || 'Cargo não informado no cadastro', u.secretaria?.sigla || u.secretaria?.nome, u.setor?.sigla || u.setor?.nome].filter(Boolean).join(' · ')}
        </p>
      </div>
    )
  }
  return (
    <div className="input-field text-sm bg-ink-50 opacity-80 min-h-[38px] flex items-center">{valor || '—'}</div>
  )
}

/** "Recebido em": preenchido pelo sistema com a data em que o setor recebeu o processo */
export function RecebidoEmEtapa({ valor }) {
  const { editavel } = useContext(EtapaDidContext)
  return (
    <div className="input-field text-sm bg-ink-50 opacity-80 min-h-[38px] flex items-center">
      {valor ? fmtData(valor) : editavel ? <span className="text-ink-500 text-xs">Automático: data em que o setor recebeu o processo</span> : '—'}
    </div>
  )
}

/** Ações da etapa em preenchimento */
export function EtapaAcoes({ etapa, form, itensDid, salvando, onRascunho, onConcluir, onDevolver }) {
  const [confirmar, setConfirmar] = useState(false)
  const [devolvendo, setDevolvendo] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const faltando = pendenciasEtapa(etapa, form, itensDid)

  return (
    <div className="-mt-2 mb-2 rounded-b-xl border border-t-0 border-brand-200 dark:border-info-800 bg-info-50/60 dark:bg-info-900/10 px-4 py-3 space-y-2">
      {faltando.length > 0 && (
        <div className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5" role="status">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
          <span>Para concluir, preencha: {faltando.join(' · ')}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {etapa.numero > 1 && onDevolver && (
          <button type="button" onClick={() => setDevolvendo(true)} disabled={salvando}
            className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5 mr-auto">
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" /> Devolver à etapa anterior
          </button>
        )}
        {onRascunho ? (
          <button type="button" onClick={onRascunho} disabled={salvando}
            className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1.5 ml-auto">
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" aria-hidden="true" />} Salvar rascunho
          </button>
        ) : <span className="ml-auto" />}
        <button type="button" onClick={() => setConfirmar(true)} disabled={salvando || faltando.length > 0}
          title={faltando.length ? 'Preencha todos os campos da etapa' : 'Concluir e assinar eletronicamente'}
          className="text-sm px-4 py-1.5 rounded-lg font-semibold text-white bg-success-600 hover:bg-success-700 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Concluir e assinar
        </button>
      </div>

      {confirmar && (
        <ConfirmModal
          title={`Concluir a ${etapa.titulo}?`}
          message="Os dados da etapa ficam definitivos e o ato é assinado eletronicamente em seu nome (senha + código do aplicativo). A próxima etapa é liberada para o setor responsável, que precisará receber o processo."
          confirmLabel="Concluir e assinar"
          danger={false}
          onConfirm={() => { setConfirmar(false); onConcluir() }}
          onClose={() => setConfirmar(false)}
        />
      )}

      {devolvendo && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="devolver-tit">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3">
            <h2 id="devolver-tit" className="text-base font-bold text-ink-900">Devolver à etapa anterior</h2>
            <p className="text-sm text-ink-600">A etapa anterior é reaberta para correção e o processo volta para quem a concluiu. A devolução é assinada e fica no histórico.</p>
            <label htmlFor="devolver-just" className="block text-xs font-semibold text-ink-600">Motivo da devolução (mínimo 20 caracteres)</label>
            <textarea id="devolver-just" rows={4} value={justificativa} onChange={e => setJustificativa(e.target.value)} autoFocus
              className="input-field text-sm resize-none" placeholder="Explique o que precisa ser corrigido..." />
            <p className="text-[11px] text-ink-500">{justificativa.trim().length}/20</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDevolvendo(false)} className="btn-secondary text-sm px-3 py-1.5">Cancelar</button>
              <button type="button" disabled={justificativa.trim().length < 20}
                onClick={() => { setDevolvendo(false); onDevolver(justificativa.trim()); setJustificativa('') }}
                className="text-sm px-4 py-1.5 rounded-lg font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-40">
                Devolver e assinar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

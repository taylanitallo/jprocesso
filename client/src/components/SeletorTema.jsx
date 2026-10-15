import { useState } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
import { TEMAS, variaveisDoTema } from '../utils/tema'

// Cores da miniatura calculadas direto do tema (não dependem do tema da página)
function coresMiniatura(tema, escuro) {
  const { claro, escuro: dk } = variaveisDoTema(tema)
  const v = escuro ? dk : claro
  const surface = escuro ? v['--color-surface'] : '#ffffff'
  const colorido = tema.menu === 'colorido'
  return {
    canvas: v['--color-canvas'],
    surface,
    sidebar: v['--color-sidebar'] || surface,
    destaque: v['--color-brand-600'],
    linha: escuro ? '#374151' : '#e2e8f0',
    itemMenu: colorido ? 'rgb(255 255 255 / 0.35)' : (escuro ? '#374151' : '#e2e8f0'),
    itemAtivo: colorido ? 'rgb(255 255 255 / 0.55)' : v['--color-brand-600'],
    logo: colorido && !escuro ? '#ffffff' : 'transparent',
  }
}

function Miniatura({ tema, escuro }) {
  const c = coresMiniatura(tema, escuro)
  return (
    <div className="relative h-[78px] w-full overflow-hidden rounded-md" style={{ background: c.canvas }}>
      {/* menu lateral */}
      <div className="absolute inset-y-0 left-0 w-[28%] flex flex-col gap-1 p-1" style={{ background: c.sidebar, borderRight: `1px solid ${c.linha}` }}>
        <div className="h-2.5 rounded-xs" style={{ background: c.logo === 'transparent' ? c.itemMenu : c.logo }} />
        <div className="h-1.5 rounded-xs" style={{ background: c.itemAtivo }} />
        <div className="h-1.5 rounded-xs" style={{ background: c.itemMenu }} />
        <div className="h-1.5 rounded-xs" style={{ background: c.itemMenu }} />
        <div className="h-1.5 rounded-xs w-3/4" style={{ background: c.itemMenu }} />
      </div>
      {/* janela com conteúdo e botão na cor do tema */}
      <div className="absolute right-2 bottom-2 left-[36%] top-3 rounded-sm p-1.5 flex flex-col gap-1 shadow-sm" style={{ background: c.surface, border: `1px solid ${c.linha}` }}>
        <div className="h-1 w-4/5 rounded-xs" style={{ background: c.linha }} />
        <div className="h-1 w-3/5 rounded-xs" style={{ background: c.linha }} />
        <div className="mt-auto ml-auto h-2.5 w-7 rounded-xs" style={{ background: c.destaque }} />
      </div>
    </div>
  )
}

/**
 * Grade de temas no estilo do Windows.
 * valor: { tema, tema_cor, tema_menu } · onChange(novoValor)
 */
export default function SeletorTema({ valor, onChange }) {
  const [escuro, setEscuro] = useState(false)
  const personalizado = { id: 'personalizado', nome: 'Personalizado', cor: valor.tema_cor || '#2547eb', menu: valor.tema_menu === 'colorido' ? 'colorido' : 'claro' }
  const opcoes = [...TEMAS, personalizado]
  const escolher = (t) => onChange({ ...valor, tema: t.id })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-500">Muda as cores do sistema inteiro para todos os usuários do município. Cada usuário continua escolhendo claro ou escuro.</p>
        <div className="flex shrink-0 rounded-lg border border-ink-200 p-0.5 text-xs font-semibold">
          {[[false, 'Ver claro', Sun], [true, 'Ver escuro', Moon]].map(([v, rot, Ic]) => (
            <button key={rot} type="button" onClick={() => setEscuro(v)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 ${escuro === v ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100'}`}>
              <Ic className="h-3.5 w-3.5" /> {rot}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {opcoes.map(t => {
          const ativo = valor.tema === t.id
          return (
            <button key={t.id} type="button" onClick={() => escolher(t)} title={t.nome}
              className={`group relative rounded-lg p-1.5 text-left transition-all ${ativo ? 'ring-2 ring-brand-600 bg-brand-50' : 'ring-1 ring-ink-200 hover:ring-ink-300 hover:bg-ink-50'}`}>
              <Miniatura tema={t} escuro={escuro} />
              <span className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-700">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.cor }} />
                <span className="truncate">{t.nome}</span>
              </span>
              {ativo && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white shadow">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {valor.tema === 'personalizado' && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-ink-200 bg-ink-50 p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600">Cor de destaque</label>
            <div className="flex items-center gap-2">
              <input type="color" value={personalizado.cor} onChange={e => onChange({ ...valor, tema_cor: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded-sm border border-ink-300" />
              <input value={valor.tema_cor || ''} onChange={e => onChange({ ...valor, tema_cor: e.target.value.trim() })}
                placeholder="#2547eb" className="input-field w-32 font-mono text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600">Menu lateral</label>
            <div className="flex rounded-lg border border-ink-200 bg-surface p-0.5 text-xs font-semibold">
              {[['claro', 'Claro'], ['colorido', 'Na cor do tema']].map(([v, rot]) => (
                <button key={v} type="button" onClick={() => onChange({ ...valor, tema_menu: v })}
                  className={`rounded-md px-3 py-1.5 ${personalizado.menu === v ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100'}`}>
                  {rot}
                </button>
              ))}
            </div>
          </div>
          <p className="basis-full text-[11px] text-ink-500">Cores muito claras são escurecidas automaticamente nos botões e links, para o texto continuar legível.</p>
        </div>
      )}
    </div>
  )
}

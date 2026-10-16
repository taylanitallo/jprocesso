// Importação de agentes por planilha (Organização › Cadastro de Agentes).
// Menu "Planilha": baixar modelo (com todos os campos do cadastro + aba com as
// secretarias) e importar. Só administradores e gestores — quem decide é a tela;
// o servidor confere de novo (POST /organizacao/agentes/importar).
import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { FileSpreadsheet, ChevronDown, Download, Upload, CheckCircle, XCircle } from 'lucide-react'
import api from '../../services/api'
import LoadingBar from '../LoadingBar'

// Colunas = campos do cadastro de agente (mesma ordem do formulário)
const COLUNAS = [
  { key: 'nome',          titulo: 'nome',          exemplo: 'MARIA DA SILVA SOUSA', obs: 'Obrigatório' },
  { key: 'nome_reduzido', titulo: 'nome_reduzido', exemplo: 'Maria Sousa',          obs: 'Opcional' },
  { key: 'cpf',           titulo: 'cpf',           exemplo: '000.000.000-00',       obs: 'Opcional; 11 dígitos, com ou sem pontuação. Não pode repetir' },
  { key: 'nascimento',    titulo: 'nascimento',    exemplo: '20/03/1987',           obs: 'Opcional; dd/mm/aaaa' },
  { key: 'telefone',      titulo: 'telefone',      exemplo: '(88) 99999-0000',      obs: 'Opcional' },
  { key: 'email',         titulo: 'email',         exemplo: 'maria@email.com',      obs: 'Opcional' },
  { key: 'matricula',     titulo: 'matricula',     exemplo: '12345',                obs: 'Opcional' },
  { key: 'cargo',         titulo: 'cargo',         exemplo: 'Agente Administrativo', obs: 'Opcional' },
  { key: 'secretaria',    titulo: 'secretaria',    exemplo: 'SEMAD',                obs: 'Opcional; sigla ou nome (veja a aba Secretarias). Gestor: só a própria' },
]

// "Nome Reduzido", "E-mail", "Matrícula"… viram a chave da coluna
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim().toLowerCase().replace(/[\s-]+/g, '_')
const APELIDOS = { e_mail: 'email', data_nascimento: 'nascimento', data_de_nascimento: 'nascimento', sigla: 'secretaria', secretaria_sigla: 'secretaria' }

export default function ImportarAgentes({ secretarias = [], onImportado }) {
  const inputRef = useRef(null)
  const [menu, setMenu] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState(null) // { resultados, erroGeral }

  const baixarModelo = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([COLUNAS.map(c => c.titulo), COLUNAS.map(c => c.exemplo)])
    ws['!cols'] = COLUNAS.map(() => ({ wch: 24 }))
    XLSX.utils.book_append_sheet(wb, ws, 'Agentes')
    const instr = XLSX.utils.aoa_to_sheet([['coluna', 'como preencher'], ...COLUNAS.map(c => [c.titulo, c.obs]),
      [], ['Apague a linha de exemplo antes de importar.']])
    instr['!cols'] = [{ wch: 18 }, { wch: 70 }]
    XLSX.utils.book_append_sheet(wb, instr, 'Instruções')
    const secs = XLSX.utils.aoa_to_sheet([['sigla', 'nome'], ...secretarias.map(s => [s.sigla || '', s.nome || ''])])
    secs['!cols'] = [{ wch: 14 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(wb, secs, 'Secretarias')
    XLSX.writeFile(wb, 'modelo_importacao_agentes.xlsx')
  }

  const importar = async (e) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setCarregando(true)
    setResultado({ resultados: [] })
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const ws = wb.Sheets['Agentes'] || wb.Sheets[wb.SheetNames[0]]
      const linhas = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const agentes = linhas.map(l => {
        const a = {}
        for (const [k, v] of Object.entries(l)) {
          const n = normalizar(k)
          a[APELIDOS[n] || n] = typeof v === 'string' ? v.trim() : v
        }
        return a
      }).filter(a => COLUNAS.some(c => String(a[c.key] ?? '').trim() !== ''))
      if (!agentes.length) {
        setResultado({ resultados: [], erroGeral: 'A planilha não tem agentes preenchidos.' })
        return
      }
      const { data } = await api.post('/organizacao/agentes/importar', { agentes })
      setResultado({ resultados: data.resultados || [] })
      if (data.importados) onImportado?.()
    } catch (err) {
      setResultado({ resultados: [], erroGeral: err.response?.data?.error || 'Falha ao ler ou importar a planilha.' })
    } finally {
      setCarregando(false)
    }
  }

  const ok = resultado?.resultados.filter(r => r.status === 'ok').length || 0
  const erros = resultado?.resultados.filter(r => r.status === 'erro').length || 0

  return (
    <>
      <div className="relative">
        <button type="button" onClick={() => setMenu(v => !v)}
          className="btn-secondary flex items-center gap-1.5 text-xs px-3 h-7">
          <FileSpreadsheet className="h-3.5 w-3.5" /> Planilha <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 mt-1 w-60 bg-surface border border-ink-200 rounded-lg shadow-lg z-20 overflow-hidden">
              <button type="button" onClick={() => { setMenu(false); inputRef.current?.click() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink-700 hover:bg-ink-50 text-left">
                <Upload className="h-4 w-4 text-brand-600" />
                <div>
                  <div className="font-medium">Importar agentes</div>
                  <div className="text-xs text-ink-400">Carregar planilha .xlsx</div>
                </div>
              </button>
              <button type="button" onClick={() => { setMenu(false); baixarModelo() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink-700 hover:bg-ink-50 text-left border-t border-ink-100">
                <Download className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="font-medium">Baixar modelo</div>
                  <div className="text-xs text-ink-400">Planilha com todos os campos</div>
                </div>
              </button>
            </div>
          </>
        )}
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={importar} />
      </div>

      {resultado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl max-w-lg w-full shadow-xl">
            <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-brand-600" /> Importação de agentes
              </h2>
              {!carregando && (
                <button onClick={() => setResultado(null)} className="p-1.5 text-ink-400 hover:text-ink-600 rounded-lg">
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="p-6">
              {carregando ? (
                <LoadingBar label="Importando agentes..." />
              ) : resultado.erroGeral ? (
                <p className="text-sm text-danger-700 dark:text-danger-300">{resultado.erroGeral}</p>
              ) : (
                <>
                  <div className="flex gap-4 mb-4 text-sm">
                    <span className="flex items-center gap-1.5 text-success-600 font-medium">
                      <CheckCircle className="h-4 w-4" /> {ok} importados
                    </span>
                    <span className="flex items-center gap-1.5 text-danger-600 font-medium">
                      <XCircle className="h-4 w-4" /> {erros} com erro
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5">
                    {resultado.resultados.map((r, i) => (
                      <div key={i} className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg ${
                        r.status === 'ok'
                          ? 'bg-success-50 dark:bg-success-900/20 text-success-800 dark:text-success-300'
                          : 'bg-danger-50 dark:bg-danger-900/20 text-danger-800 dark:text-danger-300'
                      }`}>
                        {r.status === 'ok' ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                        <div>
                          <span className="text-xs opacity-70 mr-1.5">Linha {r.linha}</span>
                          <span className="font-medium">{r.nome}</span>
                          <span className="ml-2 opacity-80">— {r.msg}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {!carregando && (
                <div className="flex justify-end mt-4">
                  <button onClick={() => setResultado(null)} className="btn-primary">Fechar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

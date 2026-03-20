import { useState, useEffect } from 'react'
import { RefreshCw, Hash } from 'lucide-react'
import api from '../services/api'

const required = 'border-red-400 focus:ring-red-300'
const base = 'w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-300'

export default function PatEntrada({ onSuccess, onCancel }) {
  const [loading, setLoading]     = useState(false)
  const [loadingTomb, setLT]      = useState(false)
  const [grupos, setGrupos]       = useState([])
  const [secretarias, setSecs]    = useState([])
  const [setores, setSetores]     = useState([])
  const [usuarios, setUsuarios]   = useState([])
  const [erros, setErros]         = useState({})
  const [form, setForm]           = useState({
    grupo_id: '', descricao: '', especificacao_tecnica: '', marca: '', modelo: '',
    numero_serie: '', cor: '', numero_tombamento_manual: '', ano_tombamento: new Date().getFullYear(),
    numero_nota_fiscal: '', serie_nf: '', chave_nfe: '', data_nota_fiscal: '',
    cnpj_fornecedor: '', nome_fornecedor: '', numero_empenho: '', numero_contrato: '',
    numero_processo: '', data_aquisicao: '', valor_aquisicao: '', vida_util_anos: '',
    taxa_depreciacao: '', valor_residual: '', estado_conservacao: 'BOM',
    secretaria_id: '', setor_id: '', responsavel_id: '',
    nome_responsavel: '', cargo_responsavel: '', matricula_responsavel: '',
    local_fisico: '', sala: '', placa: '', renavam: '', observacoes: ''
  })
  const [proximoTombamento, setProximoTombamento] = useState('')

  useEffect(() => {
    api.get('/patrimonio/grupos').then(({ data }) => setGrupos(data.grupos || []))
    api.get('/organizacao/secretarias').then(({ data }) => setSecs(data.secretarias || data || []))
  }, [])

  useEffect(() => {
    if (form.secretaria_id) {
      api.get(`/organizacao/secretarias/${form.secretaria_id}/setores`)
        .then(({ data }) => setSetores(data.setores || data || []))
        .catch(() => setSetores([]))
      api.get(`/organizacao/usuarios?secretaria_id=${form.secretaria_id}`)
        .then(({ data }) => setUsuarios(data.usuarios || data || []))
        .catch(() => setUsuarios([]))
    }
  }, [form.secretaria_id])

  useEffect(() => {
    const ano = form.ano_tombamento || new Date().getFullYear()
    setLT(true)
    api.get(`/patrimonio/bens/proximo-tombamento?ano=${ano}`)
      .then(({ data }) => setProximoTombamento(data.numero_tombamento))
      .catch(() => {})
      .finally(() => setLT(false))
  }, [form.ano_tombamento])

  // Preencher vida útil e taxa ao selecionar grupo
  useEffect(() => {
    if (form.grupo_id) {
      const g = grupos.find(x => String(x.id) === String(form.grupo_id))
      if (g) {
        setForm(f => ({
          ...f,
          vida_util_anos:  f.vida_util_anos  || (g.vida_util_anos  ? String(g.vida_util_anos)  : ''),
          taxa_depreciacao: f.taxa_depreciacao || (g.taxa_depreciacao ? String(g.taxa_depreciacao) : '')
        }))
      }
    }
  }, [form.grupo_id])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    const e = {}
    if (!form.descricao)      e.descricao = 'Obrigatório'
    if (!form.data_aquisicao) e.data_aquisicao = 'Obrigatório'
    if (!form.valor_aquisicao) e.valor_aquisicao = 'Obrigatório'
    if (!form.secretaria_id)  e.secretaria_id = 'Obrigatório'
    if (!form.nome_responsavel) e.nome_responsavel = 'Obrigatório'
    setErros(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload = { ...form }
      const { data } = await api.post('/patrimonio/bens', payload)
      alert(data.message || 'Bem tombado com sucesso!')
      onSuccess && onSuccess()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar bem')
    } finally {
      setLoading(false)
    }
  }

  const Label = ({ children, required: req }) => (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {children}{req && <span className="text-red-500 ml-1">*</span>}
    </label>
  )

  const Input = ({ field, ...props }) => (
    <input
      className={`${base} ${erros[field] ? required : ''}`}
      value={form[field]}
      onChange={e => set(field, e.target.value)}
      {...props}
    />
  )

  const Sel = ({ field, children, ...props }) => (
    <select
      className={`${base} ${erros[field] ? required : ''}`}
      value={form[field]}
      onChange={e => set(field, e.target.value)}
      {...props}
    >
      {children}
    </select>
  )

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Próximo tombamento */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Hash className="h-6 w-6 text-blue-600" />
          <div>
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Próximo número de tombamento</p>
            <p className="text-2xl font-bold font-mono text-blue-800 dark:text-blue-200">
              {loadingTomb ? '...' : (form.numero_tombamento_manual || proximoTombamento)}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="number"
              className="w-24 border rounded-lg px-2 py-1 text-sm dark:bg-gray-800 dark:border-gray-700"
              placeholder="Ano"
              value={form.ano_tombamento}
              onChange={e => set('ano_tombamento', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs text-blue-600 dark:text-blue-400">Tombamento manual (opcional – sobrescreve o automático)</label>
          <input
            className="w-full mt-1 border rounded-lg px-3 py-1.5 text-sm font-mono dark:bg-gray-800 dark:border-gray-700"
            placeholder="Ex: 2026000999"
            value={form.numero_tombamento_manual}
            onChange={e => set('numero_tombamento_manual', e.target.value)}
          />
        </div>
      </div>

      {/* Identificação */}
      <section>
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3 pb-1 border-b dark:border-gray-700">
          📝 Identificação do Bem
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label required>Descrição</Label>
            <Input field="descricao" placeholder="Ex: Mesa de escritório L com painel" />
            {erros.descricao && <p className="text-xs text-red-500 mt-1">{erros.descricao}</p>}
          </div>
          <div>
            <Label>Grupo (TCE-CE)</Label>
            <Sel field="grupo_id">
              <option value="">Selecione o grupo</option>
              {grupos.map(g => <option key={g.id} value={g.id}>{g.codigo} – {g.nome}</option>)}
            </Sel>
          </div>
          <div>
            <Label>Estado de Conservação</Label>
            <Sel field="estado_conservacao">
              {['OTIMO','BOM','REGULAR','RUIM','PESSIMO','INSERVIVEL'].map(s => <option key={s}>{s}</option>)}
            </Sel>
          </div>
          <div>
            <Label>Marca</Label>
            <Input field="marca" placeholder="Ex: Dell, Toyota, Tramontina" />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input field="modelo" placeholder="Ex: Latitude 5540" />
          </div>
          <div>
            <Label>Número de Série</Label>
            <Input field="numero_serie" placeholder="S/N do fabricante" />
          </div>
          <div>
            <Label>Cor</Label>
            <Input field="cor" placeholder="Ex: Preto, Branco, Cinza" />
          </div>
          <div>
            <Label>Especificação Técnica</Label>
            <textarea
              className={`${base} resize-none`}
              rows={2}
              value={form.especificacao_tecnica}
              onChange={e => set('especificacao_tecnica', e.target.value)}
              placeholder="Detalhes técnicos do bem"
            />
          </div>
          <div>
            <Label>Observações</Label>
            <textarea
              className={`${base} resize-none`}
              rows={2}
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Veículo (placa/RENAVAM) */}
      <section>
        <details>
          <summary className="cursor-pointer font-semibold text-gray-800 dark:text-white mb-3 pb-1 border-b dark:border-gray-700">
            🚗 Dados do Veículo (se aplicável)
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <div><Label>Placa</Label><Input field="placa" placeholder="ABC-1234" /></div>
            <div><Label>RENAVAM</Label><Input field="renavam" /></div>
          </div>
        </details>
      </section>

      {/* Aquisição */}
      <section>
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3 pb-1 border-b dark:border-gray-700">
          💰 Aquisição e Contabilidade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Data de Aquisição</Label>
            <Input field="data_aquisicao" type="date" />
            {erros.data_aquisicao && <p className="text-xs text-red-500 mt-1">{erros.data_aquisicao}</p>}
          </div>
          <div>
            <Label required>Valor de Aquisição (R$)</Label>
            <Input field="valor_aquisicao" type="number" step="0.01" min="0" placeholder="0,00" />
            {erros.valor_aquisicao && <p className="text-xs text-red-500 mt-1">{erros.valor_aquisicao}</p>}
          </div>
          <div>
            <Label>Nº da Nota Fiscal</Label>
            <Input field="numero_nota_fiscal" placeholder="000123" />
          </div>
          <div>
            <Label>Data da NF</Label>
            <Input field="data_nota_fiscal" type="date" />
          </div>
          <div>
            <Label>Série NF</Label>
            <Input field="serie_nf" />
          </div>
          <div>
            <Label>Chave NF-e (44 dígitos)</Label>
            <Input field="chave_nfe" maxLength={44} />
          </div>
          <div>
            <Label>CNPJ do Fornecedor</Label>
            <Input field="cnpj_fornecedor" placeholder="00.000.000/0001-00" />
          </div>
          <div>
            <Label>Nome do Fornecedor</Label>
            <Input field="nome_fornecedor" />
          </div>
          <div>
            <Label>Nº do Empenho</Label>
            <Input field="numero_empenho" />
          </div>
          <div>
            <Label>Nº do Contrato</Label>
            <Input field="numero_contrato" />
          </div>
          <div>
            <Label>Nº do Processo</Label>
            <Input field="numero_processo" />
          </div>
        </div>
      </section>

      {/* Depreciação */}
      <section>
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3 pb-1 border-b dark:border-gray-700">
          📉 Depreciação
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Vida Útil (anos)</Label>
            <Input field="vida_util_anos" type="number" min="1" placeholder="10" />
          </div>
          <div>
            <Label>Taxa de Depreciação (%/ano)</Label>
            <Input field="taxa_depreciacao" type="number" step="0.01" min="0" placeholder="10.00" />
          </div>
          <div>
            <Label>Valor Residual (R$)</Label>
            <Input field="valor_residual" type="number" step="0.01" min="0" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Valores padrão são preenchidos automaticamente ao selecionar o grupo conforme tabela TCE-CE.
        </p>
      </section>

      {/* Localização */}
      <section>
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3 pb-1 border-b dark:border-gray-700">
          📍 Localização e Responsabilidade
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Secretaria</Label>
            <Sel field="secretaria_id">
              <option value="">Selecione a secretaria</option>
              {secretarias.map(s => <option key={s.id} value={s.id}>{s.sigla ? `${s.sigla} – ` : ''}{s.nome}</option>)}
            </Sel>
            {erros.secretaria_id && <p className="text-xs text-red-500 mt-1">{erros.secretaria_id}</p>}
          </div>
          <div>
            <Label>Setor</Label>
            <Sel field="setor_id">
              <option value="">Selecione o setor</option>
              {setores.map(s => <option key={s.id} value={s.id}>{s.sigla ? `${s.sigla} – ` : ''}{s.nome}</option>)}
            </Sel>
          </div>
          <div>
            <Label>Local Físico</Label>
            <Input field="local_fisico" placeholder="Ex: Bloco A, 2º Andar" />
          </div>
          <div>
            <Label>Sala / Ambiente</Label>
            <Input field="sala" placeholder="Ex: Sala 201" />
          </div>

          <div className="md:col-span-2 border-t dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
              📄 Responsável pela Guarda (Termo de Responsabilidade)
            </h4>
          </div>

          <div>
            <Label>Responsável (usuário)</Label>
            <Sel field="responsavel_id">
              <option value="">Selecione (opcional)</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Sel>
          </div>
          <div>
            <Label required>Nome do Responsável</Label>
            <Input field="nome_responsavel" placeholder="Nome completo" />
            {erros.nome_responsavel && <p className="text-xs text-red-500 mt-1">{erros.nome_responsavel}</p>}
          </div>
          <div>
            <Label>Cargo</Label>
            <Input field="cargo_responsavel" placeholder="Ex: Diretor Administrativo" />
          </div>
          <div>
            <Label>Matrícula</Label>
            <Input field="matricula_responsavel" />
          </div>
        </div>
      </section>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-2 border-t dark:border-gray-700">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-6 py-2 border rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60">
          {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
          🏷️ Registrar Tombamento
        </button>
      </div>
    </form>
  )
}

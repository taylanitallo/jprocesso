// Cabeçalho das páginas públicas do município (Legislação, Verificar documento)
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import api, { apiUrl } from '../../services/api'
import BotaoTema from '../BotaoTema'


export default function CabecalhoPublico({ subdomain }) {
  const [tenant, setTenant] = useState(null)
  useEffect(() => {
    api.get(`/tenants/info?subdomain=${subdomain}`).then(({ data }) => setTenant(data.tenant)).catch(() => {})
  }, [subdomain])

  const logo = tenant?.configuracoes?.logo_login_url ? apiUrl(`/tenants/${subdomain}/logo/login`) : tenant?.configuracoes?.brasao_url
  const link = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold uppercase tracking-wide transition-colors ${
      isActive ? 'text-white bg-white/15' : 'text-white/80 hover:text-white hover:bg-white/10'}`

  return (
    // Faixa institucional fixa em tom escuro nos dois temas (ink-* inverte no escuro)
    <header className="bg-[#334155] dark:bg-[#0b1020] border-b-4 border-success-500">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {logo
            ? <img src={logo} alt="" className="h-11 w-auto max-w-[120px] object-contain" />
            : <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-white/70" /></div>}
          <div className="min-w-0">
            <p className="text-white font-bold leading-tight truncate">{tenant?.nome_municipio || 'Município'}</p>
            <p className="text-white/60 text-xs">jProcesso — Processo Eletrônico</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-1">
          <NavLink to={`/${subdomain}/login`} end className={link}>Início</NavLink>
          <NavLink to={`/${subdomain}/consulta`} className={link}>Consultar processo</NavLink>
          <NavLink to={`/${subdomain}/verificar`} className={link}>Verificar documento</NavLink>
          <NavLink to={`/${subdomain}/legislacao`} className={link}>Legislação</NavLink>
          <BotaoTema variante="escuro" className="ml-1" />
        </nav>
      </div>
    </header>
  )
}

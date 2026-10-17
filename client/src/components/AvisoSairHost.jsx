// Janela do sistema para "sair sem salvar?" (utils/alteracoesPendentes).
// Montado uma vez no Layout, dentro do roteador.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmModal } from './ui'
import { registrarHostSaida } from '../utils/alteracoesPendentes'

export default function AvisoSairHost() {
  const navigate = useNavigate()
  const [mensagem, setMensagem] = useState(null)
  const resolver = useRef(null)

  useEffect(() => registrarHostSaida(
    (msg) => new Promise(resolve => { resolver.current = resolve; setMensagem(msg) }),
    navigate,
  ), [navigate])

  const responder = (ok) => {
    setMensagem(null)
    resolver.current?.(ok)
    resolver.current = null
  }

  if (!mensagem) return null
  return (
    <ConfirmModal
      title="Sair sem salvar?"
      message={mensagem}
      confirmLabel="Sair sem salvar"
      cancelLabel="Continuar editando"
      danger={false}
      onConfirm={() => responder(true)}
      onClose={() => responder(false)}
    />
  )
}

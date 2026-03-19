import { supabase } from './supabaseClient'

async function testarEnvio() {
  const { data, error } = await supabase
    .from('processos')
    .insert([
      { 
        numero_processo: '001/2026-ADM', 
        secretaria_origem: 'Secretaria de Administração',
        assunto: 'Compra de suprimentos de informática'
      }
    ])

  if (error) {
    console.log('Erro ao enviar:', error.message)
  } else {
    console.log('Sucesso! Processo gravado:', data)
    alert('Deu certo! Vá ao painel do Supabase e atualize a tabela para ver o dado.')
  }
}

// Chame a função para testar
testarEnvio()

// Permissões iniciais por perfil — usadas ao cadastrar um usuário (tela de Usuários,
// planilha, superadmin, link de cadastro) e ao promover alguém a gestor. Depois o
// administrador liga/desliga o resto no editor de permissões; nada aqui tira opções
// do sistema. Mesmo conteúdo em client/src/utils/permissoesPadrao.js.

// Operacional (e padrão geral)
const PERMISSOES_PADRAO = () => ({
  processos:     { ver: true, criar: true, editar: true, excluir: false, tramitar: true, devolver: true, concluir: true, arquivar: false, anexar_documento: true, excluir_documento: false },
  arquivo:       { acessar: false },
  almoxarifado:  { acessar: false, painel: { ver: true }, estoque: { ver: true, editar: true }, entradas: { ver: true, registrar: true }, saidas: { ver: true, registrar: true }, requisicoes: { ver: true, criar: true, aprovar: false, cancelar: false }, cotas: { ver: true, gerenciar: false }, inventario: { ver: true, realizar: false }, auditoria: { ver: false } },
  patrimonio:    { acessar: false, painel: { ver: true }, bens: { ver: true, criar: false, editar: false, excluir: false }, tombamento: { ver: true, realizar: false }, transferencia: { ver: true, realizar: false }, baixa: { ver: true, realizar: false }, inventario: { ver: true, realizar: false }, grupos: { ver: false, gerenciar: false } },
  financeiro:    { acessar: false, painel: { ver: true }, processos_did: { ver: true }, relatorio: { ver: false } },
  contratos:     { acessar: false, itens: { ver: true, criar: false, editar: false, excluir: false }, credores: { ver: true, criar: false, editar: false, excluir: false }, contratos: { ver: true, criar: false, editar: false, excluir: false }, ordens: { ver: true, criar: false, editar: false, excluir: false }, relatorios: { ver: true } },
  tesouraria:    { acessar: false, contas: { ver: true, criar: false, editar: false, excluir: false }, receitas: { ver: true, criar: false, editar: false, excluir: false }, despesas: { ver: true, criar: false, editar: false, excluir: false }, relatorios: { ver: true } },
  administracao: { gerenciar_usuarios: false, gerenciar_secretarias: false, gerenciar_configuracoes: false, visualizar_relatorios: false, visualizar_registros: false },
});

// Gestor — padrão definido a partir do perfil de ALEXSANDRA BRAGA DE SOUSA (Irauçuba, 17/10/2026)
const PERMISSOES_GESTOR = () => ({
    _v: 2,
    arquivo: {
      acessar: true,
      gerados: {
        excluir: false
      }
    },
    contratos: {
      itens: {
        ver: true,
        criar: true,
        editar: true,
        excluir: true
      },
      ordens: {
        ver: true,
        criar: true,
        editar: true,
        excluir: true
      },
      acessar: true,
      credores: {
        ver: true,
        criar: true,
        editar: true,
        excluir: true
      },
      contratos: {
        ver: true,
        criar: true,
        editar: true,
        excluir: true
      },
      licitacoes: {
        ver: false,
        ver_secretarias: []
      },
      relatorios: {
        ver: true
      }
    },
    processos: {
      ver: true,
      criar: true,
      editar: true,
      excluir: false,
      arquivar: false,
      concluir: true,
      devolver: true,
      tramitar: true,
      anexar_documento: true,
      excluir_documento: false
    },
    financeiro: {
      painel: {
        ver: true
      },
      acessar: true,
      relatorio: {
        ver: 'propria',
        ver_secretarias: []
      },
      processos_did: {
        ver: true
      }
    },
    patrimonio: {
      bens: {
        ver: true,
        criar: false,
        editar: false,
        excluir: false
      },
      baixa: {
        ver: true,
        realizar: false
      },
      grupos: {
        ver: false,
        gerenciar: false
      },
      painel: {
        ver: true
      },
      acessar: false,
      inventario: {
        ver: true,
        realizar: false
      },
      tombamento: {
        ver: true,
        realizar: false
      },
      transferencia: {
        ver: true,
        realizar: false
      }
    },
    tesouraria: {
      contas: {
        ver: true,
        criar: false,
        editar: false,
        excluir: false
      },
      acessar: false,
      despesas: {
        ver: true,
        criar: false,
        editar: false,
        excluir: false
      },
      receitas: {
        ver: true,
        criar: false,
        editar: false,
        excluir: false
      },
      relatorios: {
        ver: true
      }
    },
    organizacao: {
      acessar: true,
      agentes: {
        ver: true,
        excluir: false
      },
      entidade: {
        ver: false,
        editar: false
      },
      usuarios: {
        excluir: false
      },
      secretarias: {
        ver: true,
        criar: true,
        excluir: false
      },
      responsaveis: {
        ver: true,
        excluir: false
      }
    },
    almoxarifado: {
      cotas: {
        ver: false,
        gerenciar: false,
        ver_secretarias: []
      },
      painel: {
        ver: true
      },
      saidas: {
        ver: true,
        registrar: false
      },
      acessar: true,
      estoque: {
        ver: true,
        editar: true
      },
      entradas: {
        ver: true,
        registrar: false
      },
      auditoria: {
        ver: false
      },
      inventario: {
        ver: true,
        realizar: false
      },
      requisicoes: {
        ver: true,
        criar: true,
        aprovar: true,
        cancelar: true
      }
    },
    administracao: {
      acessar: false,
      gerenciar_usuarios: false,
      visualizar_registros: false,
      gerenciar_secretarias: false,
      visualizar_relatorios: false,
      gerenciar_configuracoes: false
    },
    configuracoes: {
      acessar: false
    }
  });

// Padrão do perfil (admin não usa: sem configuração, administrador tem tudo)
const permissoesPadraoDoTipo = (tipo) => (tipo === 'gestor' ? PERMISSOES_GESTOR() : PERMISSOES_PADRAO());

module.exports = { PERMISSOES_PADRAO, PERMISSOES_GESTOR, permissoesPadraoDoTipo };

// Mesmo padrão dos PDFs (utils/padraoDocumentoOficial.js) para as impressões em HTML:
// texto preto; tabelas com grade preta, cabeçalho cinza claro e cantos arredondados.
// Arquivo separado para não carregar a biblioteca de PDF junto.
export const CSS_DOCUMENTO_OFICIAL = `
  *{color:#000!important}
  table{border-collapse:separate!important;border-spacing:0!important;border:1px solid #000!important;border-radius:6px!important;overflow:hidden}
  th{background:#e4e4e4!important;color:#000!important;font-weight:bold}
  th,td{border:0!important;border-left:1px solid #000!important;border-top:1px solid #000!important}
  tr>th:first-child,tr>td:first-child{border-left:0!important}
  thead tr:first-child th,table>tbody:first-child>tr:first-child>td,table>tr:first-child>td{border-top:0!important}
`

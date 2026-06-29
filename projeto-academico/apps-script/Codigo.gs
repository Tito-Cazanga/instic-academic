/**
 * ═══════════════════════════════════════════════════════════════════
 *  INSTIC ACADEMIC — Google Apps Script
 *  Sistema de Gestão Académica para Inscrição em Disciplinas
 *
 *  Ficheiro: Codigo.gs
 *  Versão  : 1.0.0
 *  Autor   : Projecto Tópico Especial I — INSTIC / Universidade de Luanda
 *
 *  INSTRUÇÕES DE CONFIGURAÇÃO:
 *  1. Abrir Google Sheets da base de dados
 *  2. Extensions → Apps Script → colar este código
 *  3. Preencher as constantes de configuração (SECÇÃO CONFIG abaixo)
 *  4. Executar setup() uma única vez para criar triggers e pastas
 *  5. Autorizar as permissões solicitadas pelo Google
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
//  SECÇÃO 1 — CONFIGURAÇÃO DO SISTEMA
// ═══════════════════════════════════════════════════════════════════

const CONFIG = {
  // IDs das folhas Google Sheets (copiar do URL após spreadsheets/d/)
  SPREADSHEET_ID: 'SEU_SPREADSHEET_ID_AQUI',

  // ID do Google Form de inscrição
  FORM_ID: 'SEU_FORM_ID_AQUI',

  // IDs dos templates Google Docs
  TEMPLATE_COMPROVATIVO_ID : 'SEU_TEMPLATE_COMPROVATIVO_ID',
  TEMPLATE_DECLARACAO_ID   : 'SEU_TEMPLATE_DECLARACAO_ID',
  TEMPLATE_LISTA_TURMA_ID  : 'SEU_TEMPLATE_LISTA_TURMA_ID',

  // ID da pasta raiz no Google Drive
  DRIVE_PASTA_RAIZ_ID: 'SEU_DRIVE_PASTA_RAIZ_ID',

  // Email da secretaria académica (recebe cópia das validações)
  EMAIL_SECRETARIA: 'secretaria@instic.ao',

  // Nome da instituição para documentos
  NOME_INST: 'Instituto de Tecnologias de Informação e Comunicação — INSTIC',
  ANO_LECTIVO: '2025/2026',

  // Nomes das folhas na Spreadsheet
  SHEET_INSCRICOES  : 'Inscricoes',
  SHEET_ESTUDANTES  : 'Estudantes',
  SHEET_DISCIPLINAS : 'Disciplinas',
  SHEET_PROPINAS    : 'Propinas',
  SHEET_HORARIOS    : 'Horarios',
  SHEET_CONFIG      : 'Configuracoes',
};


// ═══════════════════════════════════════════════════════════════════
//  SECÇÃO 2 — INICIALIZAÇÃO E TRIGGERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Executar UMA VEZ para configurar todos os triggers automáticos.
 * Menu: Executar → setup()
 */
function setup() {
  // Remover triggers antigos para evitar duplicados
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Trigger: processar nova inscrição quando o formulário é submetido
  const form = FormApp.openById(CONFIG.FORM_ID);
  ScriptApp.newTrigger('processarNovaInscricao')
    .forForm(form)
    .onFormSubmit()
    .create();

  // Trigger: lembrete diário de propinas em atraso (09:00)
  ScriptApp.newTrigger('enviarLembretesPropinas')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();

  // Trigger: relatório semanal para a secretaria (segunda-feira 08:00)
  ScriptApp.newTrigger('enviarRelatorioSemanal')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();

  // Criar estrutura de pastas no Google Drive
  criarEstruturaPastas_();

  // Verificar e criar folhas necessárias
  inicializarFolhas_();

  Logger.log('✅ Setup concluído com sucesso. Triggers configurados.');
}

/**
 * Criar estrutura hierárquica de pastas no Google Drive.
 * @private
 */
function criarEstruturaPastas_() {
  const raiz = DriveApp.getFolderById(CONFIG.DRIVE_PASTA_RAIZ_ID);
  const anoFolder = obterOuCriarPasta_(raiz, `Ano_Lectivo_${CONFIG.ANO_LECTIVO.replace('/','-')}`);
  ['LEI','LGI','LCC','TSI'].forEach(curso => obterOuCriarPasta_(anoFolder, curso));
  obterOuCriarPasta_(raiz, 'Listas_de_Turma');
  obterOuCriarPasta_(raiz, 'Relatorios');
  Logger.log('✅ Estrutura de pastas criada no Google Drive.');
}

function obterOuCriarPasta_(parent, nome) {
  const iter = parent.getFoldersByName(nome);
  return iter.hasNext() ? iter.next() : parent.createFolder(nome);
}

/**
 * Inicializar as folhas da Spreadsheet com cabeçalhos, se não existirem.
 * @private
 */
function inicializarFolhas_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  const esquemas = {
    [CONFIG.SHEET_INSCRICOES]: [
      'ID_Inscricao','Timestamp','Numero_Estudante','Nome_Completo','Email_Inst',
      'Telefone','Curso','Ano_Lectivo','Ano_Curso','Disciplinas',
      'Estado_Inscricao','Propinas_Estado','URL_Comprovativo','URL_Declaracao',
      'Observacoes_Adm','Data_Validacao','Validado_Por'
    ],
    [CONFIG.SHEET_ESTUDANTES]: [
      'Numero_Estudante','Nome_Completo','Email_Inst','Telefone','Curso','Ano_Curso','Data_Matricula'
    ],
    [CONFIG.SHEET_DISCIPLINAS]: [
      'Codigo','Designacao','Docente','Curso','Semestre','Vagas_Total','Vagas_Ocupadas','Horario','Sala'
    ],
    [CONFIG.SHEET_PROPINAS]: [
      'Numero_Estudante','Mes','Valor_AOA','Data_Vencimento','Data_Pagamento','Estado'
    ],
    [CONFIG.SHEET_HORARIOS]: [
      'Disciplina_Codigo','Dia_Semana','Hora_Inicio','Hora_Fim','Sala','Tipo_Aula','Docente'
    ],
  };

  Object.entries(esquemas).forEach(([nomeFolha, cabecalhos]) => {
    let folha = ss.getSheetByName(nomeFolha);
    if (!folha) {
      folha = ss.insertSheet(nomeFolha);
      folha.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
      folha.getRange(1, 1, 1, cabecalhos.length)
        .setBackground('#1F3864')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold');
      folha.setFrozenRows(1);
      Logger.log(`  Folha criada: ${nomeFolha}`);
    }
  });
}


// ═══════════════════════════════════════════════════════════════════
//  SECÇÃO 3 — PROCESSAMENTO DE INSCRIÇÕES (TRIGGER PRINCIPAL)
// ═══════════════════════════════════════════════════════════════════

/**
 * Processado automaticamente quando o Google Form é submetido.
 * Executado via trigger onFormSubmit.
 *
 * @param {Object} e - Objecto de evento do Google Forms
 */
function processarNovaInscricao(e) {
  try {
    const respostas = e.response.getItemResponses();
    const dados = extrairRespostas_(respostas);

    // 1. Gerar ID único de inscrição
    dados.idInscricao = gerarIdInscricao_();
    dados.timestamp   = new Date();

    // 2. Validar dados obrigatórios
    const erros = validarDados_(dados);
    if (erros.length > 0) {
      Logger.log(`⚠️  Erros de validação: ${erros.join(', ')}`);
      notificarEstudanteErro_(dados, erros);
      return;
    }

    // 3. Verificar situação de propinas
    dados.propinasEstado = verificarPropinas_(dados.numeroEstudante);
    if (dados.propinasEstado === 'Divida') {
      Logger.log(`⚠️  Estudante ${dados.numeroEstudante} tem propinas em dívida.`);
      notificarPropinasDivida_(dados);
      return;
    }

    // 4. Verificar disponibilidade de vagas
    const disciplinasSemVagas = verificarVagas_(dados.disciplinas);
    if (disciplinasSemVagas.length > 0) {
      notificarSemVagas_(dados, disciplinasSemVagas);
      return;
    }

    // 5. Registar inscrição na base de dados (Google Sheets)
    registarInscricao_(dados);

    // 6. Atualizar vagas ocupadas nas disciplinas
    atualizarVagas_(dados.disciplinas, 1);

    // 7. Notificar estudante — confirmação de submissão
    enviarEmailConfirmacaoSubmissao_(dados);

    // 8. Notificar secretaria — nova inscrição pendente
    notificarSecretaria_(dados);

    Logger.log(`✅ Inscrição ${dados.idInscricao} registada com sucesso para ${dados.nome}.`);

  } catch (err) {
    Logger.log(`❌ Erro ao processar inscrição: ${err.message}\n${err.stack}`);
    MailApp.sendEmail(CONFIG.EMAIL_SECRETARIA, '[SGA] Erro no processamento de inscrição', err.message);
  }
}

/**
 * Extrair respostas do formulário para um objecto estruturado.
 * @private
 */
function extrairRespostas_(respostas) {
  const dados = {};
  respostas.forEach(r => {
    const titulo = r.getItem().getTitle().toLowerCase().trim();
    const valor  = r.getResponse();
    if (titulo.includes('número de estudante') || titulo.includes('numero de estudante')) dados.numeroEstudante = valor.trim();
    else if (titulo.includes('nome completo')) dados.nome = valor.trim();
    else if (titulo.includes('email')) dados.email = valor.trim().toLowerCase();
    else if (titulo.includes('telefone')) dados.telefone = valor.trim();
    else if (titulo.includes('curso')) dados.curso = valor.trim();
    else if (titulo.includes('ano lectivo')) dados.anoLectivo = valor.trim();
    else if (titulo.includes('ano do curso')) dados.anoCurso = valor.trim();
    else if (titulo.includes('disciplina')) dados.disciplinas = Array.isArray(valor) ? valor.join(',') : valor;
    else if (titulo.includes('observa')) dados.observacoes = valor.trim();
  });
  return dados;
}

/**
 * Gerar ID único sequencial para a inscrição.
 * Formato: INS-AAAA-NNNN
 * @private
 */
function gerarIdInscricao_() {
  const ss        = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha     = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);
  const ultimaLin = folha.getLastRow();
  const numero    = ultimaLin; // Linha 1 = cabeçalho, portanto linha 2 = inscrição #1
  const ano       = new Date().getFullYear();
  return `INS-${ano}-${numero.toString().padStart(4, '0')}`;
}

/**
 * Validar campos obrigatórios da inscrição.
 * @private
 */
function validarDados_(dados) {
  const erros = [];
  if (!dados.numeroEstudante || !/^\d{7,12}$/.test(dados.numeroEstudante))
    erros.push('Número de estudante inválido');
  if (!dados.nome || dados.nome.length < 3)
    erros.push('Nome incompleto');
  if (!dados.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email))
    erros.push('Email inválido');
  if (!dados.curso)
    erros.push('Curso não especificado');
  if (!dados.disciplinas || dados.disciplinas.split(',').filter(Boolean).length < 4)
    erros.push('Mínimo de 4 disciplinas obrigatório');
  if (dados.disciplinas && dados.disciplinas.split(',').filter(Boolean).length > 6)
    erros.push('Máximo de 6 disciplinas permitido');
  return erros;
}

/**
 * Verificar situação de propinas na base de dados.
 * @private
 */
function verificarPropinas_(numeroEstudante) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_PROPINAS);
  const dados = folha.getDataRange().getValues();

  // Procurar propinas pendentes ou em dívida para este estudante
  const propinasEstudante = dados.slice(1).filter(row => row[0] == numeroEstudante);
  const emDivida = propinasEstudante.some(row =>
    ['Pendente','Dívida','Divida'].includes(String(row[5]).trim()) &&
    new Date(row[3]) < new Date() // data de vencimento no passado
  );

  return emDivida ? 'Divida' : 'Regularizado';
}

/**
 * Verificar disponibilidade de vagas nas disciplinas seleccionadas.
 * @private
 */
function verificarVagas_(disciplinasStr) {
  const ss      = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha   = ss.getSheetByName(CONFIG.SHEET_DISCIPLINAS);
  const dados   = folha.getDataRange().getValues();
  const codigos = disciplinasStr.split(',').map(c => c.trim());
  const semVagas = [];

  codigos.forEach(cod => {
    const row = dados.slice(1).find(r => r[0].trim() === cod);
    if (row) {
      const vagasTotal    = parseInt(row[5]) || 0;
      const vagasOcupadas = parseInt(row[6]) || 0;
      if (vagasOcupadas >= vagasTotal) semVagas.push(cod);
    }
  });

  return semVagas;
}

/**
 * Registar os dados da inscrição na folha Google Sheets.
 * @private
 */
function registarInscricao_(dados) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);

  folha.appendRow([
    dados.idInscricao,
    dados.timestamp,
    dados.numeroEstudante,
    dados.nome,
    dados.email,
    dados.telefone || '',
    dados.curso,
    dados.anoLectivo || CONFIG.ANO_LECTIVO,
    dados.anoCurso || '',
    dados.disciplinas,
    'Pendente',          // Estado_Inscricao
    dados.propinasEstado,
    '',                  // URL_Comprovativo (preenchido após validação)
    '',                  // URL_Declaracao
    dados.observacoes || '',
    '',                  // Data_Validacao
    '',                  // Validado_Por
  ]);
}

/**
 * Actualizar o número de vagas ocupadas de cada disciplina.
 * @param {string} disciplinasStr - Disciplinas separadas por vírgula
 * @param {number} delta - +1 para inscrição, -1 para anulação
 * @private
 */
function atualizarVagas_(disciplinasStr, delta) {
  const ss      = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha   = ss.getSheetByName(CONFIG.SHEET_DISCIPLINAS);
  const dados   = folha.getDataRange().getValues();
  const codigos = disciplinasStr.split(',').map(c => c.trim());

  codigos.forEach(cod => {
    for (let i = 1; i < dados.length; i++) {
      if (dados[i][0].trim() === cod) {
        const vagasOcupadas = parseInt(dados[i][6]) || 0;
        folha.getRange(i + 1, 7).setValue(vagasOcupadas + delta);
        break;
      }
    }
  });
}


// ═══════════════════════════════════════════════════════════════════
//  SECÇÃO 4 — VALIDAÇÃO E REJEIÇÃO (ACÇÕES DA SECRETARIA)
// ═══════════════════════════════════════════════════════════════════

/**
 * Validar uma inscrição identificada pelo seu ID.
 * Chamada pelo botão "Validar" no dashboard administrativo.
 *
 * @param {string} idInscricao - Referência da inscrição (ex: INS-2026-0001)
 * @param {string} validadoPor - Nome/email do administrador que valida
 * @return {Object} Resultado da operação
 */
function validarInscricao(idInscricao, validadoPor) {
  try {
    const linha = encontrarLinhaInscricao_(idInscricao);
    if (!linha) return { sucesso: false, erro: 'Inscrição não encontrada.' };

    const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const folha = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);
    const dados = folha.getRange(linha, 1, 1, 17).getValues()[0];

    // Verificar se ainda está pendente
    if (dados[10] !== 'Pendente') return { sucesso: false, erro: `Estado actual: ${dados[10]}` };

    // Gerar documentos PDF
    const dadosInscricao = {
      idInscricao    : dados[0],
      numeroEstudante: dados[2],
      nome           : dados[3],
      email          : dados[4],
      curso          : dados[6],
      anoLectivo     : dados[7],
      anoCurso       : dados[8],
      disciplinas    : dados[9],
    };

    const urlComp  = gerarComprovativoPDF_(dadosInscricao);
    const urlDecl  = gerarDeclaracaoMatriculaPDF_(dadosInscricao);

    // Actualizar estado na base de dados
    folha.getRange(linha, 11).setValue('Validada');
    folha.getRange(linha, 13).setValue(urlComp);
    folha.getRange(linha, 14).setValue(urlDecl);
    folha.getRange(linha, 16).setValue(new Date());
    folha.getRange(linha, 17).setValue(validadoPor || CONFIG.EMAIL_SECRETARIA);

    // Notificar estudante
    enviarEmailValidacao_(dadosInscricao, urlComp, urlDecl);

    Logger.log(`✅ Inscrição ${idInscricao} validada por ${validadoPor}.`);
    return { sucesso: true, urlComprovativo: urlComp, urlDeclaracao: urlDecl };

  } catch (err) {
    Logger.log(`❌ Erro ao validar inscrição ${idInscricao}: ${err.message}`);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Rejeitar uma inscrição com motivo obrigatório.
 *
 * @param {string} idInscricao - Referência da inscrição
 * @param {string} motivo - Justificação obrigatória da rejeição
 * @param {string} rejeitadoPor - Identificador do administrador
 * @return {Object} Resultado da operação
 */
function rejeitarInscricao(idInscricao, motivo, rejeitadoPor) {
  if (!motivo || motivo.trim().length < 10)
    return { sucesso: false, erro: 'O motivo da rejeição deve ter pelo menos 10 caracteres.' };

  try {
    const linha = encontrarLinhaInscricao_(idInscricao);
    if (!linha) return { sucesso: false, erro: 'Inscrição não encontrada.' };

    const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const folha = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);
    const dados = folha.getRange(linha, 1, 1, 17).getValues()[0];

    if (dados[10] !== 'Pendente') return { sucesso: false, erro: `Estado actual: ${dados[10]}` };

    // Repor vagas (a inscrição foi rejeitada)
    atualizarVagas_(dados[9], -1);

    // Actualizar estado
    folha.getRange(linha, 11).setValue('Rejeitada');
    folha.getRange(linha, 15).setValue(motivo.trim());
    folha.getRange(linha, 16).setValue(new Date());
    folha.getRange(linha, 17).setValue(rejeitadoPor || CONFIG.EMAIL_SECRETARIA);

    // Notificar estudante
    const dadosInscricao = { idInscricao:dados[0], nome:dados[3], email:dados[4], curso:dados[6], disciplinas:dados[9] };
    enviarEmailRejeicao_(dadosInscricao, motivo);

    Logger.log(`✅ Inscrição ${idInscricao} rejeitada por ${rejeitadoPor}.`);
    return { sucesso: true };

  } catch (err) {
    Logger.log(`❌ Erro ao rejeitar inscrição: ${err.message}`);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Encontrar o número de linha de uma inscrição pelo ID.
 * @private
 */
function encontrarLinhaInscricao_(idInscricao) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);
  const ids   = folha.getRange(2, 1, folha.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === idInscricao) return i + 2; // +2: linha 1 é cabeçalho
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════════
//  SECÇÃO 5 — GERAÇÃO DE DOCUMENTOS PDF (Google Docs → PDF)
// ═══════════════════════════════════════════════════════════════════

/**
 * Gerar o comprovativo de inscrição em PDF a partir do template.
 * @private
 * @return {string} URL do ficheiro PDF no Google Drive
 */
function gerarComprovativoPDF_(dados) {
  const template = DriveApp.getFileById(CONFIG.TEMPLATE_COMPROVATIVO_ID);
  const pasta    = obterPastaEstudante_(dados.curso, dados.numeroEstudante);
  const nomeFich = `${dados.idInscricao}_Comprovativo_Inscricao.pdf`;

  // Criar cópia temporária do template
  const copia = template.makeCopy(`[TEMP] ${nomeFich}`, pasta);
  const doc   = DocumentApp.openById(copia.getId());
  const corpo = doc.getBody();

  // Substituir todos os marcadores de posição
  const substituicoes = {
    '{{ID_INSCRICAO}}'     : dados.idInscricao,
    '{{DATA_EMISSAO}}'     : Utilities.formatDate(new Date(), 'Africa/Luanda', 'dd/MM/yyyy HH:mm'),
    '{{NUMERO_ESTUDANTE}}' : dados.numeroEstudante,
    '{{NOME_COMPLETO}}'    : dados.nome,
    '{{EMAIL}}'            : dados.email,
    '{{CURSO}}'            : obterNomeCurso_(dados.curso),
    '{{ANO_CURSO}}'        : dados.anoCurso + '.º Ano',
    '{{ANO_LECTIVO}}'      : dados.anoLectivo || CONFIG.ANO_LECTIVO,
    '{{DISCIPLINAS}}'      : formatarDisciplinas_(dados.disciplinas),
    '{{ESTADO}}'           : 'VALIDADA',
    '{{NOME_INST}}'        : CONFIG.NOME_INST,
  };

  Object.entries(substituicoes).forEach(([marcador, valor]) => {
    corpo.replaceText(marcador, valor || '');
  });

  doc.saveAndClose();

  // Converter para PDF e guardar na pasta do estudante
  const blob   = DriveApp.getFileById(copia.getId()).getAs('application/pdf');
  const pdfFile = pasta.createFile(blob.setName(nomeFich));

  // Remover cópia temporária
  copia.setTrashed(true);

  Logger.log(`  PDF gerado: ${nomeFich}`);
  return pdfFile.getUrl();
}

/**
 * Gerar a declaração de matrícula em PDF.
 * @private
 * @return {string} URL do ficheiro PDF no Google Drive
 */
function gerarDeclaracaoMatriculaPDF_(dados) {
  const template = DriveApp.getFileById(CONFIG.TEMPLATE_DECLARACAO_ID);
  const pasta    = obterPastaEstudante_(dados.curso, dados.numeroEstudante);
  const numDecl  = `DM-${new Date().getFullYear()}-${dados.idInscricao.split('-').pop()}`;
  const nomeFich = `${numDecl}_Declaracao_Matricula.pdf`;

  const copia = template.makeCopy(`[TEMP] ${nomeFich}`, pasta);
  const doc   = DocumentApp.openById(copia.getId());
  const corpo = doc.getBody();

  const substituicoes = {
    '{{NUM_DECLARACAO}}'   : numDecl,
    '{{DATA_EMISSAO}}'     : Utilities.formatDate(new Date(), 'Africa/Luanda', 'dd \'de\' MMMM \'de\' yyyy'),
    '{{NUMERO_ESTUDANTE}}' : dados.numeroEstudante,
    '{{NOME_COMPLETO}}'    : dados.nome,
    '{{CURSO}}'            : obterNomeCurso_(dados.curso),
    '{{ANO_CURSO}}'        : dados.anoCurso + '.º Ano',
    '{{ANO_LECTIVO}}'      : dados.anoLectivo || CONFIG.ANO_LECTIVO,
    '{{DISCIPLINAS_LISTA}}': formatarDisciplinas_(dados.disciplinas),
    '{{NOME_INST}}'        : CONFIG.NOME_INST,
    '{{CIDADE_DATA}}'      : `Luanda, ${Utilities.formatDate(new Date(), 'Africa/Luanda', 'dd \'de\' MMMM \'de\' yyyy')}`,
  };

  Object.entries(substituicoes).forEach(([m, v]) => corpo.replaceText(m, v || ''));
  doc.saveAndClose();

  const blob    = DriveApp.getFileById(copia.getId()).getAs('application/pdf');
  const pdfFile = pasta.createFile(blob.setName(nomeFich));
  copia.setTrashed(true);

  Logger.log(`  Declaração gerada: ${nomeFich}`);
  return pdfFile.getUrl();
}

/**
 * Gerar lista de turma em PDF para uma disciplina.
 *
 * @param {string} codigoDisciplina - Código da disciplina (ex: INF201)
 * @param {string} curso - Código do curso (ex: LEI)
 * @return {string} URL do PDF gerado
 */
function gerarListaTurmaPDF(codigoDisciplina, curso) {
  const estudantes = obterEstudantesPorDisciplina_(codigoDisciplina, curso);
  const template   = DriveApp.getFileById(CONFIG.TEMPLATE_LISTA_TURMA_ID);
  const raiz       = DriveApp.getFolderById(CONFIG.DRIVE_PASTA_RAIZ_ID);
  const pastaListas= obterOuCriarPasta_(raiz, 'Listas_de_Turma');
  const nomeFich   = `Lista_${codigoDisciplina}_${curso}_${CONFIG.ANO_LECTIVO.replace('/','-')}.pdf`;

  const copia = template.makeCopy(`[TEMP] ${nomeFich}`, pastaListas);
  const doc   = DocumentApp.openById(copia.getId());
  const corpo = doc.getBody();

  corpo.replaceText('{{DISCIPLINA}}',   obterNomeDisciplina_(codigoDisciplina));
  corpo.replaceText('{{CODIGO}}',       codigoDisciplina);
  corpo.replaceText('{{CURSO}}',        obterNomeCurso_(curso));
  corpo.replaceText('{{ANO_LECTIVO}}',  CONFIG.ANO_LECTIVO);
  corpo.replaceText('{{TOTAL}}',        estudantes.length.toString());
  corpo.replaceText('{{DATA_GERACAO}}', Utilities.formatDate(new Date(), 'Africa/Luanda', 'dd/MM/yyyy HH:mm'));

  // Inserir tabela de estudantes
  const tabela = corpo.appendTable();
  const cabecalho = tabela.appendTableRow();
  ['N.º','N.º Estudante','Nome Completo','Email','Data Validação','Assinatura'].forEach(h => {
    const celula = cabecalho.appendTableCell(h);
    celula.getChild(0).asParagraph().setAttributes({ [DocumentApp.Attribute.BOLD]: true });
  });

  estudantes.forEach((e, i) => {
    const linha = tabela.appendTableRow();
    [(i+1).toString(), e.numeroEstudante, e.nome, e.email, e.dataValidacao, ''].forEach(v =>
      linha.appendTableCell(v)
    );
  });

  doc.saveAndClose();
  const blob    = DriveApp.getFileById(copia.getId()).getAs('application/pdf');
  const pdfFile = pastaListas.createFile(blob.setName(nomeFich));
  copia.setTrashed(true);

  Logger.log(`✅ Lista de turma gerada: ${nomeFich} (${estudantes.length} estudantes)`);
  return pdfFile.getUrl();
}

// ── AUXILIARES DE DOCUMENTOS ──────────────────────────────────────

function obterPastaEstudante_(curso, numeroEstudante) {
  const raiz     = DriveApp.getFolderById(CONFIG.DRIVE_PASTA_RAIZ_ID);
  const anoFolder= obterOuCriarPasta_(raiz, `Ano_Lectivo_${CONFIG.ANO_LECTIVO.replace('/','-')}`);
  const cursoFld = obterOuCriarPasta_(anoFolder, curso);
  return obterOuCriarPasta_(cursoFld, numeroEstudante);
}

function obterNomeCurso_(codigo) {
  const nomes = { LEI:'Licenciatura em Engenharia Informática', LGI:'Licenciatura em Gestão de Informática',
                  LCC:'Licenciatura em Ciências da Computação', TSI:'Tecnologia em Sistemas de Informação' };
  return nomes[codigo] || codigo;
}

function obterNomeDisciplina_(codigo) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_DISCIPLINAS);
  const dados = folha.getDataRange().getValues();
  const row   = dados.slice(1).find(r => r[0].trim() === codigo);
  return row ? row[1] : codigo;
}

function formatarDisciplinas_(disciplinasStr) {
  return disciplinasStr.split(',').map(c => c.trim()).join('\n');
}

function obterEstudantesPorDisciplina_(codigo, curso) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);
  const dados = folha.getDataRange().getValues();

  return dados.slice(1)
    .filter(row =>
      row[10] === 'Validada' &&
      row[6]  === curso &&
      row[9].split(',').map(c=>c.trim()).includes(codigo)
    )
    .map(row => ({
      numeroEstudante: row[2],
      nome           : row[3],
      email          : row[4],
      dataValidacao  : row[15] ? Utilities.formatDate(new Date(row[15]),'Africa/Luanda','dd/MM/yyyy') : '',
    }));
}


// ═══════════════════════════════════════════════════════════════════
//  SECÇÃO 6 — SISTEMA DE NOTIFICAÇÕES POR EMAIL
// ═══════════════════════════════════════════════════════════════════

/**
 * Enviar email de confirmação de submissão ao estudante.
 * @private
 */
function enviarEmailConfirmacaoSubmissao_(dados) {
  const assunto = `[INSTIC Academic] Inscrição ${dados.idInscricao} — Submetida com sucesso`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1F3864;padding:24px 32px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:20px">🎓 INSTIC Academic</h2>
        <p style="color:rgba(255,255,255,.7);margin:4px 0 0;font-size:13px">Sistema de Gestão Académica</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#64748b;margin:0 0 16px">Caro(a) <strong style="color:#1F3864">${dados.nome}</strong>,</p>
        <p style="color:#374151;line-height:1.6">A sua inscrição em disciplinas foi submetida com sucesso e encontra-se em análise pela Secretaria Académica.</p>

        <div style="background:#f0f5fb;border-radius:8px;padding:16px 20px;margin:20px 0;border-left:4px solid #2E6DB4">
          <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600">NÚMERO DE REFERÊNCIA</p>
          <p style="margin:0;font-size:22px;font-weight:800;color:#1F3864;font-family:monospace">${dados.idInscricao}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          ${linhaTabela('Curso', obterNomeCurso_(dados.curso))}
          ${linhaTabela('Ano Lectivo', dados.anoLectivo || CONFIG.ANO_LECTIVO)}
          ${linhaTabela('Situação de Propinas', dados.propinasEstado === 'Regularizado' ? '✅ Regularizado' : '⚠️ Pendente')}
          ${linhaTabela('Disciplinas Seleccionadas', dados.disciplinas.split(',').length + ' disciplinas')}
        </table>

        <p style="color:#374151;line-height:1.6">Será notificado(a) por email assim que a inscrição for validada pela secretaria. O prazo normal de validação é de <strong>1 a 3 dias úteis</strong>.</p>

        <div style="text-align:center;margin:24px 0">
          <a href="https://sites.google.com/instic.ao/academic/consulta" style="background:#1F3864;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Acompanhar Estado da Inscrição</a>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px">INSTIC — Universidade de Luanda · academico@instic.ao</p>
      </div>
    </div>`;

  MailApp.sendEmail({ to: dados.email, subject: assunto, htmlBody: html });
}

/**
 * Notificar o estudante que a inscrição foi validada.
 * @private
 */
function enviarEmailValidacao_(dados, urlComp, urlDecl) {
  const assunto = `[INSTIC Academic] ✅ Inscrição ${dados.idInscricao} — Validada`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#16a34a;padding:24px 32px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">✅ Inscrição Validada!</h2>
        <p style="color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px">INSTIC Academic — Gestão Académica</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
        <p>Caro(a) <strong>${dados.nome}</strong>,</p>
        <p>A sua inscrição em disciplinas foi <strong style="color:#16a34a">validada</strong> pela Secretaria Académica.</p>
        <div style="background:#dcfce7;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #16a34a">
          <strong style="color:#166534">Referência: ${dados.idInscricao}</strong>
        </div>
        <p>Os seus documentos académicos estão disponíveis para download:</p>
        <div style="display:flex;gap:12px;margin:20px 0">
          <a href="${urlComp}" style="background:#dc2626;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px">📄 Comprovativo de Inscrição</a>
          <a href="${urlDecl}" style="background:#1F3864;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px">📋 Declaração de Matrícula</a>
        </div>
        <p style="color:#64748b;font-size:13px">Pode também consultar e descarregar os seus documentos através do Portal do Estudante.</p>
        <p style="color:#94a3b8;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px">INSTIC — Universidade de Luanda</p>
      </div>
    </div>`;
  MailApp.sendEmail({ to: dados.email, subject: assunto, htmlBody: html });
}

/**
 * Notificar o estudante que a inscrição foi rejeitada.
 * @private
 */
function enviarEmailRejeicao_(dados, motivo) {
  const assunto = `[INSTIC Academic] ❌ Inscrição ${dados.idInscricao} — Não aprovada`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#dc2626;padding:24px 32px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0">Inscrição Não Aprovada</h2>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
        <p>Caro(a) <strong>${dados.nome}</strong>,</p>
        <p>Lamentamos informar que a sua inscrição <strong>${dados.idInscricao}</strong> não foi aprovada pela Secretaria Académica.</p>
        <div style="background:#fee2e2;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #dc2626">
          <strong style="color:#991b1b">Motivo:</strong>
          <p style="margin:8px 0 0;color:#7f1d1d">${motivo}</p>
        </div>
        <p>Para resolver a situação e submeter uma nova inscrição, aceda ao Portal do Estudante ou dirija-se à Secretaria Académica.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="https://sites.google.com/instic.ao/academic/inscricao" style="background:#1F3864;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Nova Inscrição</a>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px">INSTIC — Universidade de Luanda · academico@instic.ao</p>
      </div>
    </div>`;
  MailApp.sendEmail({ to: dados.email, subject: assunto, htmlBody: html });
}

function notificarSecretaria_(dados) {
  const assunto = `[SGA] Nova inscrição pendente — ${dados.idInscricao} · ${dados.nome}`;
  MailApp.sendEmail({
    to      : CONFIG.EMAIL_SECRETARIA,
    subject : assunto,
    htmlBody: `<p>Nova inscrição submetida.</p>
               <ul>
                 <li><b>Referência:</b> ${dados.idInscricao}</li>
                 <li><b>Estudante:</b> ${dados.nome} (${dados.numeroEstudante})</li>
                 <li><b>Curso:</b> ${obterNomeCurso_(dados.curso)}</li>
                 <li><b>Propinas:</b> ${dados.propinasEstado}</li>
                 <li><b>Disciplinas:</b> ${dados.disciplinas}</li>
               </ul>
               <a href="https://sites.google.com/instic.ao/academic/admin/inscricoes">Validar no Portal</a>`
  });
}

function notificarEstudanteErro_(dados, erros) {
  if (!dados.email) return;
  MailApp.sendEmail({ to:dados.email, subject:'[SGA] Erro na submissão da inscrição',
    body:`Foram detectados os seguintes erros na sua inscrição:\n${erros.map(e=>'• '+e).join('\n')}\n\nPor favor aceda ao portal e tente novamente.` });
}

function notificarPropinasDivida_(dados) {
  MailApp.sendEmail({ to:dados.email, subject:'[SGA] Inscrição bloqueada — Propinas em dívida',
    body:`Caro(a) ${dados.nome},\n\nA sua inscrição foi bloqueada porque existem propinas em dívida associadas à sua conta.\n\nPor favor regularize a sua situação financeira e tente novamente.\n\nSecretaria Académica — INSTIC` });
}

function notificarSemVagas_(dados, disciplinasSemVagas) {
  MailApp.sendEmail({ to:dados.email, subject:'[SGA] Inscrição bloqueada — Disciplina(s) sem vagas',
    body:`Caro(a) ${dados.nome},\n\nAs seguintes disciplinas já não têm vagas disponíveis:\n${disciplinasSemVagas.join(', ')}\n\nPor favor aceda ao portal e seleccione outras disciplinas.\n\nSecretaria Académica — INSTIC` });
}

function linhaTabela(label, valor) {
  return `<tr>
    <td style="padding:8px 12px;background:#f8fafc;font-size:13px;color:#64748b;font-weight:600;width:40%">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:#1e293b">${valor}</td>
  </tr>`;
}


// ═══════════════════════════════════════════════════════════════════
//  SECÇÃO 7 — NOTIFICAÇÕES AUTOMÁTICAS AGENDADAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Enviar lembretes de propinas em atraso.
 * Executado diariamente às 09:00 via trigger.
 */
function enviarLembretesPropinas() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_PROPINAS);
  const dados = folha.getDataRange().getValues();
  const hoje  = new Date();

  let enviados = 0;
  dados.slice(1).forEach(row => {
    const estado       = String(row[5]).trim();
    const dataVenc     = new Date(row[3]);
    const numeroAluno  = row[0];
    const diasAtraso   = Math.floor((hoje - dataVenc) / 86400000);

    if (['Pendente','Divida'].includes(estado) && diasAtraso > 0 && diasAtraso <= 30) {
      // Procurar email do estudante
      const estudante = obterDadosEstudante_(numeroAluno);
      if (estudante && estudante.email) {
        MailApp.sendEmail({
          to      : estudante.email,
          subject : `[INSTIC] ⚠️ Propina de ${row[1]} em atraso — ${diasAtraso} dia(s)`,
          body    : `Caro(a) ${estudante.nome},\n\nA propina de ${row[1]} no valor de ${row[2]} AOA está em atraso há ${diasAtraso} dia(s).\n\nPor favor regularize a sua situação para não comprometer futuras inscrições.\n\nSecretaria Académica — INSTIC`,
        });
        enviados++;
      }
    }
  });
  Logger.log(`✅ Lembretes de propinas enviados: ${enviados}`);
}

/**
 * Enviar relatório semanal de inscrições para a secretaria.
 * Executado toda segunda-feira às 08:00.
 */
function enviarRelatorioSemanal() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);
  const dados = folha.getDataRange().getValues().slice(1);

  const total     = dados.length;
  const pendentes = dados.filter(r => r[10] === 'Pendente').length;
  const validadas = dados.filter(r => r[10] === 'Validada').length;
  const rejeitadas= dados.filter(r => r[10] === 'Rejeitada').length;

  const assunto = `[SGA] Relatório Semanal — ${Utilities.formatDate(new Date(),'Africa/Luanda','dd/MM/yyyy')}`;
  const html = `
    <h2>Relatório Semanal de Inscrições</h2>
    <p>Ano Lectivo: <strong>${CONFIG.ANO_LECTIVO}</strong></p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse">
      <tr style="background:#1F3864;color:#fff"><th>Indicador</th><th>Valor</th></tr>
      <tr><td>Total de Inscrições</td><td><b>${total}</b></td></tr>
      <tr><td>Pendentes de Validação</td><td style="color:orange"><b>${pendentes}</b></td></tr>
      <tr><td>Validadas</td><td style="color:green"><b>${validadas}</b></td></tr>
      <tr><td>Rejeitadas</td><td style="color:red"><b>${rejeitadas}</b></td></tr>
      <tr><td>Taxa de Validação</td><td><b>${total>0?Math.round(validadas/total*100):0}%</b></td></tr>
    </table>
    ${pendentes > 0 ? `<p style="color:orange"><b>⚠️ Atenção: ${pendentes} inscrições aguardam validação.</b></p>` : ''}
    <a href="https://sites.google.com/instic.ao/academic/admin/dashboard">Abrir Dashboard</a>`;

  MailApp.sendEmail({ to: CONFIG.EMAIL_SECRETARIA, subject: assunto, htmlBody: html });
  Logger.log(`✅ Relatório semanal enviado para ${CONFIG.EMAIL_SECRETARIA}`);
}

function obterDadosEstudante_(numeroEstudante) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_ESTUDANTES);
  const dados = folha.getDataRange().getValues();
  const row   = dados.slice(1).find(r => String(r[0]).trim() === String(numeroEstudante).trim());
  return row ? { numeroEstudante:row[0], nome:row[1], email:row[2] } : null;
}


// ═══════════════════════════════════════════════════════════════════
//  SECÇÃO 8 — WEB APP (API REST para o Portal Web)
// ═══════════════════════════════════════════════════════════════════

/**
 * Handler GET — consultado pelo Portal do Estudante via fetch().
 * Deploy: Extensions → Apps Script → Deploy → New Deployment → Web App
 *         Execute as: Me | Access: Anyone
 */
function doGet(e) {
  const acao   = e.parameter.acao || '';
  const numAluno = e.parameter.numAluno || '';

  try {
    let resultado;
    switch (acao) {
      case 'consultarInscricao':
        resultado = consultarInscricaoEstudante_(numAluno);
        break;
      case 'consultarPropinas':
        resultado = consultarPropinasEstudante_(numAluno);
        break;
      case 'consultarHorario':
        resultado = consultarHorarioEstudante_(numAluno);
        break;
      case 'listarDisciplinas':
        resultado = listarDisciplinas_(e.parameter.curso, e.parameter.ano);
        break;
      default:
        resultado = { erro: 'Acção não reconhecida.' };
    }
    return jsonResponse_(resultado);
  } catch (err) {
    return jsonResponse_({ erro: err.message });
  }
}

/**
 * Handler POST — acções administrativas via Portal Admin.
 */
function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    const acao  = dados.action || '';
    let resultado;

    switch (acao) {
      case 'validarInscricao':
        resultado = validarInscricao(dados.idInscricao, dados.adminEmail);
        break;
      case 'rejeitarInscricao':
        resultado = rejeitarInscricao(dados.idInscricao, dados.motivo, dados.adminEmail);
        break;
      case 'gerarListaTurma':
        resultado = { url: gerarListaTurmaPDF(dados.disciplina, dados.curso) };
        break;
      case 'gerarRelatorio':
        resultado = gerarDadosRelatorio_();
        break;
      default:
        resultado = { erro: 'Acção não reconhecida.' };
    }
    return jsonResponse_(resultado);
  } catch (err) {
    return jsonResponse_({ erro: err.message });
  }
}

// ── CONSULTAS PARA O PORTAL ──────────────────────────────────────

function consultarInscricaoEstudante_(numAluno) {
  if (!numAluno) return { erro: 'Número de estudante obrigatório.' };
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);
  const dados = folha.getDataRange().getValues();
  const rows  = dados.slice(1).filter(r => String(r[2]).trim() === numAluno);
  if (!rows.length) return { erro: 'Nenhuma inscrição encontrada.' };
  const r = rows[rows.length - 1]; // Mais recente
  return {
    idInscricao    : r[0],
    timestamp      : r[1],
    numeroEstudante: r[2],
    nome           : r[3],
    curso          : r[6],
    anoLectivo     : r[7],
    disciplinas    : r[9].split(',').map(c=>c.trim()),
    estado         : r[10],
    propinas       : r[11],
    urlComprovativo: r[12],
    urlDeclaracao  : r[13],
  };
}

function consultarPropinasEstudante_(numAluno) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_PROPINAS);
  const dados = folha.getDataRange().getValues();
  const rows  = dados.slice(1).filter(r => String(r[0]).trim() === numAluno);
  return {
    prestacoes: rows.map(r => ({
      mes: r[1], valor: r[2], dataVencimento: r[3], dataPagamento: r[4], estado: r[5]
    })),
    totalDivida: rows.filter(r=>['Pendente','Divida'].includes(r[5])).reduce((s,r)=>s+Number(r[2]),0),
    totalPago  : rows.filter(r=>r[5]==='Pago').reduce((s,r)=>s+Number(r[2]),0),
  };
}

function consultarHorarioEstudante_(numAluno) {
  const inscricao = consultarInscricaoEstudante_(numAluno);
  if (inscricao.erro || inscricao.estado !== 'Validada') return { erro:'Inscrição não validada.' };
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_HORARIOS);
  const dados = folha.getDataRange().getValues();
  const codigos = inscricao.disciplinas;
  const horario = dados.slice(1)
    .filter(r => codigos.includes(r[0].trim()))
    .map(r => ({ disciplina:r[0], dia:r[1], horaInicio:r[2], horaFim:r[3], sala:r[4], tipo:r[5], docente:r[6] }));
  return { horario };
}

function listarDisciplinas_(curso, ano) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_DISCIPLINAS);
  const dados = folha.getDataRange().getValues();
  const lista = dados.slice(1)
    .filter(r => (!curso || r[3]===curso))
    .map(r => ({
      codigo:r[0], nome:r[1], docente:r[2], vagasTotal:r[5],
      vagasOcupadas:r[6], disponivel: parseInt(r[6])<parseInt(r[5])
    }));
  return { disciplinas: lista };
}

function gerarDadosRelatorio_() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);
  const dados = folha.getDataRange().getValues().slice(1);
  return {
    total    : dados.length,
    pendentes: dados.filter(r=>r[10]==='Pendente').length,
    validadas: dados.filter(r=>r[10]==='Validada').length,
    rejeitadas:dados.filter(r=>r[10]==='Rejeitada').length,
    porCurso : ['LEI','LGI','LCC','TSI'].map(c=>({ curso:c, total:dados.filter(r=>r[6]===c).length })),
  };
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


// ═══════════════════════════════════════════════════════════════════
//  SECÇÃO 9 — MENU PERSONALIZADO NO GOOGLE SHEETS
// ═══════════════════════════════════════════════════════════════════

/**
 * Criar menu personalizado quando a Spreadsheet é aberta.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎓 INSTIC Academic')
    .addItem('📋 Validar Inscrições Pendentes', 'menuValidarPendentes')
    .addSeparator()
    .addItem('📄 Gerar Comprovativos em Lote', 'menuGerarComprovativosLote')
    .addItem('📑 Gerar Listas de Turma', 'menuGerarListasTurma')
    .addItem('📊 Relatório de Inscrições',  'menuRelatorioInscricoes')
    .addSeparator()
    .addItem('⚙️  Configurar Sistema (setup)',   'setup')
    .addItem('📧 Enviar Lembretes Propinas',   'enviarLembretesPropinas')
    .addItem('📈 Relatório Semanal',           'enviarRelatorioSemanal')
    .addToUi();
}

function menuValidarPendentes() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);
  const dados = folha.getDataRange().getValues();
  const pendentes = dados.slice(1).filter(r=>r[10]==='Pendente');
  const ui    = SpreadsheetApp.getUi();

  if (!pendentes.length) { ui.alert('Nenhuma inscrição pendente de validação.'); return; }
  const resp = ui.alert(
    `Validação em Lote`,
    `Existem ${pendentes.length} inscrições pendentes.\nDeseja validar TODAS automaticamente?`,
    ui.ButtonSet.YES_NO
  );
  if (resp === ui.Button.YES) {
    let count = 0;
    pendentes.forEach(r => { validarInscricao(r[0], CONFIG.EMAIL_SECRETARIA); count++; });
    ui.alert(`✅ ${count} inscrições validadas com sucesso!`);
  }
}

function menuGerarComprovativosLote() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_INSCRICOES);
  const dados = folha.getDataRange().getValues();
  const validadas = dados.slice(1).filter(r=>r[10]==='Validada' && !r[12]); // Sem URL de comprovativo
  const ui = SpreadsheetApp.getUi();

  if (!validadas.length) { ui.alert('Nenhuma inscrição validada sem comprovativo.'); return; }
  let count = 0;
  validadas.forEach(r => {
    try {
      gerarComprovativoPDF_({ idInscricao:r[0], numeroEstudante:r[2], nome:r[3], email:r[4], curso:r[6], anoLectivo:r[7], anoCurso:r[8], disciplinas:r[9] });
      count++;
    } catch(e) { Logger.log(`Erro em ${r[0]}: ${e.message}`); }
  });
  ui.alert(`✅ ${count} comprovativos gerados com sucesso!`);
}

function menuGerarListasTurma() {
  const ui   = SpreadsheetApp.getUi();
  const resp = ui.prompt('Gerar Lista de Turma', 'Introduza o código da disciplina (ex: INF201):', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const cod  = resp.getResponseText().trim().toUpperCase();
  const resp2= ui.prompt('Gerar Lista de Turma', 'Introduza o código do curso (ex: LEI):', ui.ButtonSet.OK_CANCEL);
  if (resp2.getSelectedButton() !== ui.Button.OK) return;
  const curso= resp2.getResponseText().trim().toUpperCase();
  const url  = gerarListaTurmaPDF(cod, curso);
  ui.alert(`✅ Lista gerada!\n\nDisponível em: ${url}`);
}

function menuRelatorioInscricoes() {
  const dados = gerarDadosRelatorio_();
  SpreadsheetApp.getUi().alert(
    '📊 Relatório de Inscrições',
    `Total: ${dados.total}\nValidadas: ${dados.validadas}\nPendentes: ${dados.pendentes}\nRejeitadas: ${dados.rejeitadas}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

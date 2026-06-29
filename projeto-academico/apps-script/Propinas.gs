/**
 * ═══════════════════════════════════════════════════════════════════
 *  INSTIC ACADEMIC — Módulo de Propinas e Horários
 *  Ficheiro: Propinas.gs
 * ═══════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════
//  GESTÃO DE PROPINAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Registar um pagamento de propina para um estudante.
 *
 * @param {string} numeroEstudante
 * @param {string} mes           - Ex: "Outubro 2025"
 * @param {number} valor         - Valor pago em AOA
 * @return {Object} resultado
 */
function registarPagamentoPropina(numeroEstudante, mes, valor) {
  try {
    const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const folha = ss.getSheetByName(CONFIG.SHEET_PROPINAS);
    const dados = folha.getDataRange().getValues();

    // Localizar a linha do mês em questão para este estudante
    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][0]).trim() === String(numeroEstudante).trim() &&
          String(dados[i][1]).trim() === mes.trim()) {
        folha.getRange(i + 1, 4).setValue(new Date());      // Data de pagamento
        folha.getRange(i + 1, 6).setValue('Pago');           // Estado
        Logger.log(`✅ Pagamento de ${valor} AOA registado para ${numeroEstudante} - ${mes}`);
        // Notificar estudante
        const est = obterDadosEstudante_(numeroEstudante);
        if (est) enviarEmailReciboPropina_(est, mes, valor);
        return { sucesso: true };
      }
    }

    // Se não existe, criar nova linha
    folha.appendRow([
      numeroEstudante, mes, valor,
      obterDataVencimentoMes_(mes),
      new Date(), 'Pago'
    ]);
    return { sucesso: true };

  } catch (err) {
    Logger.log(`❌ Erro ao registar pagamento: ${err.message}`);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Obter resumo financeiro completo de um estudante.
 *
 * @param {string} numeroEstudante
 * @return {Object} resumo com total pago, dívida e prestações
 */
function obterResumoFinanceiro(numeroEstudante) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_PROPINAS);
  const dados = folha.getDataRange().getValues();

  const prestacoes = dados.slice(1)
    .filter(r => String(r[0]).trim() === String(numeroEstudante).trim())
    .map(r => ({
      mes           : r[1],
      valor         : Number(r[2]),
      dataVencimento: r[3],
      dataPagamento : r[4],
      estado        : r[5],
    }));

  const totalPago  = prestacoes.filter(p => p.estado === 'Pago').reduce((s, p) => s + p.valor, 0);
  const totalDivida= prestacoes.filter(p => p.estado !== 'Pago').reduce((s, p) => s + p.valor, 0);
  const emAtraso   = prestacoes.filter(p => p.estado !== 'Pago' && new Date(p.dataVencimento) < new Date()).length;

  return {
    prestacoes,
    totalPago,
    totalDivida,
    emAtraso,
    regularizado: totalDivida === 0,
    percentagemPaga: prestacoes.length > 0 ? Math.round(totalPago / (totalPago + totalDivida) * 100) : 0,
  };
}

/**
 * Gerar as prestações anuais de propinas para um estudante.
 * Cria automaticamente as 10 prestações do ano lectivo.
 *
 * @param {string} numeroEstudante
 * @param {number} valorMensal - Valor em AOA de cada prestação
 */
function criarPrestacoes_AnuaisEstudante(numeroEstudante, valorMensal) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_PROPINAS);

  const meses = [
    ['Outubro 2025',   new Date(2025, 9, 31)],
    ['Novembro 2025',  new Date(2025, 10, 30)],
    ['Dezembro 2025',  new Date(2025, 11, 31)],
    ['Janeiro 2026',   new Date(2026, 0, 31)],
    ['Fevereiro 2026', new Date(2026, 1, 28)],
    ['Março 2026',     new Date(2026, 2, 31)],
    ['Abril 2026',     new Date(2026, 3, 30)],
    ['Maio 2026',      new Date(2026, 4, 31)],
    ['Junho 2026',     new Date(2026, 5, 30)],
    ['Julho 2026',     new Date(2026, 6, 31)],
  ];

  meses.forEach(([mes, dataVenc]) => {
    folha.appendRow([numeroEstudante, mes, valorMensal, dataVenc, '', 'Pendente']);
  });

  Logger.log(`✅ 10 prestações criadas para ${numeroEstudante} · ${valorMensal} AOA/mês`);
}

/**
 * Relatório de propinas em dívida para toda a instituição.
 * @return {Array} Lista de estudantes com dívidas
 */
function relatorioPropinasDivida() {
  const ss       = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folhaProp= ss.getSheetByName(CONFIG.SHEET_PROPINAS);
  const folhaEst = ss.getSheetByName(CONFIG.SHEET_ESTUDANTES);
  const propinas = folhaProp.getDataRange().getValues().slice(1);
  const estudantes = folhaEst.getDataRange().getValues().slice(1);

  // Agrupar dívidas por estudante
  const dividas = {};
  propinas.forEach(r => {
    if (r[5] !== 'Pago' && new Date(r[3]) < new Date()) {
      const num = String(r[0]).trim();
      if (!dividas[num]) dividas[num] = { totalDivida: 0, meses: [] };
      dividas[num].totalDivida += Number(r[2]);
      dividas[num].meses.push(r[1]);
    }
  });

  // Enriquecer com dados dos estudantes
  return Object.entries(dividas).map(([num, div]) => {
    const est = estudantes.find(e => String(e[0]).trim() === num);
    return {
      numeroEstudante: num,
      nome           : est ? est[1] : 'Desconhecido',
      email          : est ? est[2] : '',
      curso          : est ? est[5] : '',
      totalDivida    : div.totalDivida,
      mesesEmAtraso  : div.meses.length,
      meses          : div.meses.join(', '),
    };
  }).sort((a, b) => b.totalDivida - a.totalDivida);
}

function obterDataVencimentoMes_(mes) {
  const mapa = {
    'Outubro':31,'Novembro':30,'Dezembro':31,'Janeiro':31,'Fevereiro':28,
    'Março':31,'Abril':30,'Maio':31,'Junho':30,'Julho':31,
  };
  const partes = mes.split(' ');
  const nomeMes= partes[0];
  const ano    = parseInt(partes[1]);
  const dia    = mapa[nomeMes] || 31;
  const mesIdx = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].indexOf(nomeMes);
  return new Date(ano, mesIdx, dia);
}

function enviarEmailReciboPropina_(estudante, mes, valor) {
  MailApp.sendEmail({
    to     : estudante.email,
    subject: `[INSTIC] Recibo de Pagamento — Propina ${mes}`,
    htmlBody: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1F3864;padding:20px 28px;border-radius:8px 8px 0 0">
          <h3 style="color:#fff;margin:0">🎓 INSTIC Academic</h3>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px">
          <p>Caro(a) <strong>${estudante.nome}</strong>,</p>
          <p>O pagamento da sua propina foi registado com sucesso:</p>
          <div style="background:#dcfce7;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #16a34a">
            <strong>Mês:</strong> ${mes}<br>
            <strong>Valor:</strong> ${Number(valor).toLocaleString('pt-AO')} AOA<br>
            <strong>Data:</strong> ${new Date().toLocaleDateString('pt-PT')}<br>
            <strong>Estado:</strong> ✅ Pago
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:20px">INSTIC — Universidade de Luanda</p>
        </div>
      </div>`,
  });
}


// ═══════════════════════════════════════════════════════════════════
//  GESTÃO DE HORÁRIOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Adicionar ou actualizar uma aula no horário de uma disciplina.
 *
 * @param {string} codigoDisciplina
 * @param {string} diaSemana   - Ex: "Segunda"
 * @param {string} horaInicio  - Ex: "08:30"
 * @param {string} horaFim     - Ex: "10:00"
 * @param {string} sala        - Ex: "A-102"
 * @param {string} tipoAula    - "T" | "P" | "Lab"
 * @param {string} docente
 */
function adicionarHorario(codigoDisciplina, diaSemana, horaInicio, horaFim, sala, tipoAula, docente) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_HORARIOS);

  folha.appendRow([codigoDisciplina, diaSemana, horaInicio, horaFim, sala, tipoAula, docente]);
  Logger.log(`✅ Horário adicionado: ${codigoDisciplina} · ${diaSemana} ${horaInicio}–${horaFim} · ${sala}`);
}

/**
 * Obter o horário completo de um estudante baseado nas disciplinas inscritas.
 *
 * @param {string} numeroEstudante
 * @return {Array} Lista de aulas ordenadas por dia e hora
 */
function obterHorarioCompleto(numeroEstudante) {
  const inscricao = consultarInscricaoEstudante_(numeroEstudante);
  if (!inscricao || inscricao.erro) return [];

  const disciplinas = inscricao.disciplinas || [];
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_HORARIOS);
  const dados = folha.getDataRange().getValues();

  const ordemDias = { Segunda:1, Terça:2, Quarta:3, Quinta:4, Sexta:5, Sábado:6 };

  return dados.slice(1)
    .filter(r => disciplinas.includes(String(r[0]).trim()))
    .map(r => ({
      disciplina : r[0],
      dia        : r[1],
      horaInicio : r[2],
      horaFim    : r[3],
      sala       : r[4],
      tipo       : r[5],
      docente    : r[6],
      ordemDia   : ordemDias[r[1]] || 99,
    }))
    .sort((a, b) => a.ordemDia - b.ordemDia || String(a.horaInicio).localeCompare(String(b.horaInicio)));
}

/**
 * Verificar conflitos de horário entre as disciplinas seleccionadas.
 * Chamada durante a validação de inscrições.
 *
 * @param {string} disciplinasStr - Lista de códigos separados por vírgula
 * @return {Array} Lista de conflitos detectados
 */
function verificarConflitosHorario(disciplinasStr) {
  const ss       = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha    = ss.getSheetByName(CONFIG.SHEET_HORARIOS);
  const dados    = folha.getDataRange().getValues();
  const codigos  = disciplinasStr.split(',').map(c => c.trim());
  const conflitos= [];

  // Filtrar as aulas das disciplinas seleccionadas
  const aulas = dados.slice(1).filter(r => codigos.includes(String(r[0]).trim()));

  // Verificar sobreposições dentro do mesmo dia
  aulas.forEach((a1, i) => {
    aulas.forEach((a2, j) => {
      if (i >= j) return;
      if (a1[1] !== a2[1]) return; // Dias diferentes, sem conflito

      const h1Inicio = converterHoraParaMinutos_(a1[2]);
      const h1Fim    = converterHoraParaMinutos_(a1[3]);
      const h2Inicio = converterHoraParaMinutos_(a2[2]);
      const h2Fim    = converterHoraParaMinutos_(a2[3]);

      if (h1Inicio < h2Fim && h1Fim > h2Inicio) {
        conflitos.push({
          disciplina1: a1[0], disciplina2: a2[0],
          dia: a1[1],
          hora1: `${a1[2]}–${a1[3]}`, hora2: `${a2[2]}–${a2[3]}`,
        });
      }
    });
  });

  return conflitos;
}

function converterHoraParaMinutos_(hora) {
  if (!hora) return 0;
  const partes = String(hora).split(':');
  return parseInt(partes[0]) * 60 + parseInt(partes[1] || '0');
}


// ═══════════════════════════════════════════════════════════════════
//  GESTÃO DE DISCIPLINAS
// ═══════════════════════════════════════════════════════════════════

/**
 * Adicionar uma nova disciplina ao catálogo.
 *
 * @param {Object} disciplina - { codigo, designacao, docente, curso, semestre, vagasTotal, horario, sala }
 */
function adicionarDisciplina(disciplina) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_DISCIPLINAS);

  // Verificar se já existe
  const dados = folha.getDataRange().getValues();
  const existe = dados.slice(1).some(r => String(r[0]).trim() === disciplina.codigo.trim());
  if (existe) return { sucesso: false, erro: `Disciplina ${disciplina.codigo} já existe.` };

  folha.appendRow([
    disciplina.codigo,
    disciplina.designacao,
    disciplina.docente,
    disciplina.curso,
    disciplina.semestre,
    disciplina.vagasTotal,
    0,  // Vagas ocupadas (começa a zero)
    disciplina.horario || '',
    disciplina.sala    || '',
  ]);

  Logger.log(`✅ Disciplina ${disciplina.codigo} — ${disciplina.designacao} adicionada.`);
  return { sucesso: true };
}

/**
 * Actualizar o docente de uma disciplina.
 *
 * @param {string} codigoDisciplina
 * @param {string} novoDocente
 */
function actualizarDocenteDisciplina(codigoDisciplina, novoDocente) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_DISCIPLINAS);
  const dados = folha.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim() === codigoDisciplina.trim()) {
      folha.getRange(i + 1, 3).setValue(novoDocente);
      Logger.log(`✅ Docente de ${codigoDisciplina} actualizado para ${novoDocente}`);
      return { sucesso: true };
    }
  }
  return { sucesso: false, erro: 'Disciplina não encontrada.' };
}

/**
 * Obter estatísticas de ocupação de todas as disciplinas.
 * @return {Array} Lista com taxas de ocupação
 */
function estatisticasOcupacaoDisciplinas() {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const folha = ss.getSheetByName(CONFIG.SHEET_DISCIPLINAS);
  const dados = folha.getDataRange().getValues();

  return dados.slice(1).map(r => ({
    codigo        : r[0],
    designacao    : r[1],
    docente       : r[2],
    curso         : r[3],
    vagasTotal    : parseInt(r[5]) || 0,
    vagasOcupadas : parseInt(r[6]) || 0,
    taxaOcupacao  : r[5] > 0 ? Math.round(parseInt(r[6]) / parseInt(r[5]) * 100) : 0,
    disponivel    : parseInt(r[6]) < parseInt(r[5]),
  })).sort((a, b) => b.taxaOcupacao - a.taxaOcupacao);
}

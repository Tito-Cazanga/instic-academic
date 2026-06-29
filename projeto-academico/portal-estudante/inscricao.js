// ============================================================
// SGA — inscricao.js
// Lógica do formulário de inscrição em disciplinas
// Integra com Google Apps Script via fetch (CORS mode)
// ============================================================

// CONFIGURAÇÃO — substitua pelo URL do Web App do Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwg5nxVsrMcs4xQ3BzJ-a8sLuQF9xqJYV4_To69SNZS36xRBGdW9NprVh9keI8YBfVM/exec';

// ===== BASE DE DADOS LOCAL DE DISCIPLINAS =====
const DISCIPLINAS_DB = {
  LEI: {
    1: [
      { codigo: 'MAT101', nome: 'Matemática I', docente: 'Prof. João Silva',     vagas: 40, inscritos: 35, semestre: 1 },
      { codigo: 'FIS101', nome: 'Física Geral',  docente: 'Prof. Maria Santos',   vagas: 40, inscritos: 38, semestre: 1 },
      { codigo: 'INF101', nome: 'Introdução à Programação', docente: 'Prof. Carlos Lima', vagas: 35, inscritos: 30, semestre: 1 },
      { codigo: 'ALG101', nome: 'Álgebra Linear', docente: 'Prof. Ana Rodrigues', vagas: 40, inscritos: 40, semestre: 1 },
      { codigo: 'MAT102', nome: 'Matemática II', docente: 'Prof. João Silva',    vagas: 40, inscritos: 28, semestre: 2 },
      { codigo: 'INF102', nome: 'Programação Estruturada', docente: 'Prof. Carlos Lima', vagas: 35, inscritos: 22, semestre: 2 },
      { codigo: 'SIS101', nome: 'Sistemas Digitais', docente: 'Prof. Pedro Costa', vagas: 30, inscritos: 25, semestre: 2 },
      { codigo: 'ENG101', nome: 'Inglês Técnico', docente: 'Prof. Susana Neto',  vagas: 45, inscritos: 20, semestre: 2 },
    ],
    2: [
      { codigo: 'INF201', nome: 'Estruturas de Dados', docente: 'Prof. Carlos Lima', vagas: 35, inscritos: 30, semestre: 1 },
      { codigo: 'BD201',  nome: 'Bases de Dados I',    docente: 'Prof. Luísa Ferreira', vagas: 35, inscritos: 34, semestre: 1 },
      { codigo: 'SO201',  nome: 'Sistemas Operativos', docente: 'Prof. Rui Mendes', vagas: 35, inscritos: 28, semestre: 1 },
      { codigo: 'MAT201', nome: 'Cálculo Numérico',    docente: 'Prof. João Silva', vagas: 40, inscritos: 20, semestre: 1 },
      { codigo: 'INF202', nome: 'Programação Orientada a Objectos', docente: 'Prof. Carlos Lima', vagas: 35, inscritos: 35, semestre: 2 },
      { codigo: 'BD202',  nome: 'Bases de Dados II',   docente: 'Prof. Luísa Ferreira', vagas: 35, inscritos: 18, semestre: 2 },
      { codigo: 'REDES201', nome: 'Redes de Computadores I', docente: 'Prof. António Borges', vagas: 30, inscritos: 26, semestre: 2 },
      { codigo: 'INF203', nome: 'Algoritmia Avançada', docente: 'Prof. Beatriz Sousa', vagas: 35, inscritos: 15, semestre: 2 },
    ],
    3: [
      { codigo: 'IS301',  nome: 'Engenharia de Software', docente: 'Prof. Rui Mendes', vagas: 30, inscritos: 28, semestre: 1 },
      { codigo: 'IA301',  nome: 'Inteligência Artificial', docente: 'Prof. Diana Cruz', vagas: 30, inscritos: 25, semestre: 1 },
      { codigo: 'WEB301', nome: 'Desenvolvimento Web',    docente: 'Prof. Fábio Tavares', vagas: 30, inscritos: 30, semestre: 1 },
      { codigo: 'SEC301', nome: 'Segurança Informática',  docente: 'Prof. Hélder Vieira', vagas: 25, inscritos: 20, semestre: 1 },
      { codigo: 'MOB301', nome: 'Desenvolvimento Mobile', docente: 'Prof. Fábio Tavares', vagas: 25, inscritos: 22, semestre: 2 },
      { codigo: 'CC301',  nome: 'Computação em Nuvem',    docente: 'Prof. Diana Cruz',   vagas: 25, inscritos: 18, semestre: 2 },
      { codigo: 'PROJ301',nome: 'Gestão de Projectos TI', docente: 'Prof. Rui Mendes',   vagas: 30, inscritos: 24, semestre: 2 },
      { codigo: 'DAD301', nome: 'Data Analytics',         docente: 'Prof. Beatriz Sousa',vagas: 25, inscritos: 10, semestre: 2 },
    ],
  },
  LGI: {
    1: [
      { codigo: 'GES101', nome: 'Fundamentos de Gestão', docente: 'Prof. Isabel Morais', vagas: 45, inscritos: 40, semestre: 1 },
      { codigo: 'INF111', nome: 'Introdução à Informática', docente: 'Prof. Carlos Lima', vagas: 45, inscritos: 35, semestre: 1 },
      { codigo: 'MAT111', nome: 'Matemática para Gestão', docente: 'Prof. João Silva', vagas: 45, inscritos: 38, semestre: 1 },
      { codigo: 'ECO101', nome: 'Economia Geral', docente: 'Prof. Nelson Alves', vagas: 45, inscritos: 42, semestre: 2 },
    ],
  },
};

// Curso legível
const CURSO_LABELS = {
  LEI: 'Lic. Engenharia Informática',
  LGI: 'Lic. Gestão de Informática',
  LCC: 'Lic. Ciências da Computação',
  TSI: 'Tec. Sistemas de Informação',
};

// ===== ESTADO GLOBAL =====
let currentStep = 1;
let disciplinasSelecionadas = [];

// ===== STEPPER =====
function goStep(n) {
  document.getElementById('step' + currentStep).style.display = 'none';
  document.getElementById('sp' + currentStep).classList.remove('active');
  document.getElementById('sp' + currentStep).classList.add('done');
  currentStep = n;
  document.getElementById('step' + n).style.display = 'block';
  document.getElementById('sp' + n).classList.remove('done');
  document.getElementById('sp' + n).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== STEP 1: Validação =====
function validarStep1() {
  let ok = true;
  const campos = [
    { id: 'numAluno',       regex: /^\d{7,12}$/,         msg: 'Número de estudante inválido (7–12 dígitos).' },
    { id: 'nomeEstudante',  regex: /^.{3,}/,              msg: 'Nome deve ter pelo menos 3 caracteres.' },
    { id: 'emailEstudante', regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Email inválido.' },
    { id: 'telefone',       regex: /^\d{9}$/,              msg: 'Telefone deve ter 9 dígitos.' },
  ];
  campos.forEach(c => {
    const el = document.getElementById(c.id);
    if (!c.regex.test(el.value.trim())) {
      el.classList.add('is-invalid');
      el.nextElementSibling && (el.nextElementSibling.textContent = c.msg);
      ok = false;
    } else {
      el.classList.remove('is-invalid');
      el.classList.add('is-valid');
    }
  });
  if (!document.getElementById('cursoSelect').value) {
    mostrarToast('Seleccione o curso.', 'warning'); ok = false;
  }
  if (!document.getElementById('anoCurso').value) {
    mostrarToast('Seleccione o ano do curso.', 'warning'); ok = false;
  }
  if (ok) goStep(2);
}

// ===== DISCIPLINAS =====
function carregarDisciplinas() {
  const curso = document.getElementById('cursoSelect').value;
  const ano   = parseInt(document.getElementById('anoCurso').value);
  const cont  = document.getElementById('disciplinasContainer');

  if (!curso || !ano) return;

  const lista = (DISCIPLINAS_DB[curso] && DISCIPLINAS_DB[curso][ano]) || [];

  if (!lista.length) {
    cont.innerHTML = `<div class="alert alert-warning"><i class="bi bi-exclamation-circle me-2"></i>Não existem disciplinas configuradas para este curso/ano. Contacte a secretaria.</div>`;
    return;
  }

  // Agrupar por semestre
  const s1 = lista.filter(d => d.semestre === 1);
  const s2 = lista.filter(d => d.semestre === 2);

  cont.innerHTML = `
    ${renderSemestre('1.º Semestre', s1)}
    ${renderSemestre('2.º Semestre', s2)}
  `;
  disciplinasSelecionadas = [];
  atualizarContador();
}

function renderSemestre(label, disciplinas) {
  if (!disciplinas.length) return '';
  return `
    <h6 class="text-muted fw-bold mb-2 mt-3"><i class="bi bi-calendar2-week me-2"></i>${label}</h6>
    <div class="disc-grid mb-3">
      ${disciplinas.map(d => renderDisciplina(d)).join('')}
    </div>
  `;
}

function renderDisciplina(d) {
  const lotado = d.inscritos >= d.vagas;
  const pct    = Math.round((d.inscritos / d.vagas) * 100);
  return `
    <label class="disc-item${lotado ? ' opacity-60' : ''}" onclick="${lotado ? '' : `toggleDisc('${d.codigo}')`}" id="disc-${d.codigo}">
      <input type="checkbox" id="chk-${d.codigo}" ${lotado ? 'disabled' : ''} onclick="event.stopPropagation(); toggleDisc('${d.codigo}')" />
      <div style="flex:1">
        <div class="disc-name">${d.nome}</div>
        <div class="disc-meta"><i class="bi bi-person me-1"></i>${d.docente}</div>
        <div class="disc-meta mt-1">
          <span class="disc-badge ${lotado ? 'bg-danger text-white' : pct >= 80 ? 'bg-warning text-dark' : 'bg-success-soft text-success'}">
            ${lotado ? 'Lotado' : `${d.inscritos}/${d.vagas} vagas`}
          </span>
          <span class="disc-badge bg-light text-muted ms-1">${d.codigo}</span>
        </div>
      </div>
    </label>
  `;
}

function toggleDisc(codigo) {
  const chk  = document.getElementById('chk-' + codigo);
  const item = document.getElementById('disc-' + codigo);
  if (chk.disabled) return;

  if (disciplinasSelecionadas.includes(codigo)) {
    disciplinasSelecionadas = disciplinasSelecionadas.filter(c => c !== codigo);
    chk.checked = false;
    item.classList.remove('selected');
  } else {
    if (disciplinasSelecionadas.length >= 6) {
      mostrarToast('Máximo de 6 disciplinas permitido.', 'warning');
      return;
    }
    disciplinasSelecionadas.push(codigo);
    chk.checked = true;
    item.classList.add('selected');
  }
  atualizarContador();
}

function atualizarContador() {
  document.getElementById('contadorDisc').textContent = `${disciplinasSelecionadas.length} seleccionada(s)`;
}

// ===== STEP 2 =====
function validarStep2() {
  if (disciplinasSelecionadas.length < 4) {
    mostrarToast('Seleccione pelo menos 4 disciplinas.', 'danger');
    return;
  }
  preencherConfirmacao();
  goStep(3);
}

// ===== STEP 3 =====
function preencherConfirmacao() {
  const curso = document.getElementById('cursoSelect').value;
  const ano   = document.getElementById('anoCurso').value;

  document.getElementById('conf-num').textContent     = document.getElementById('numAluno').value;
  document.getElementById('conf-nome').textContent    = document.getElementById('nomeEstudante').value;
  document.getElementById('conf-email').textContent   = document.getElementById('emailEstudante').value;
  document.getElementById('conf-curso').textContent   = CURSO_LABELS[curso] || curso;
  document.getElementById('conf-ano').textContent     = ano + '.º Ano';
  document.getElementById('conf-lectivo').textContent = document.getElementById('anoLectivo').value;

  const ul = document.getElementById('conf-disciplinas');
  ul.innerHTML = '';
  const allDiscs = Object.values(DISCIPLINAS_DB[curso]?.[parseInt(ano)] || []);
  disciplinasSelecionadas.forEach(cod => {
    const d = allDiscs.find(x => x.codigo === cod);
    if (d) {
      ul.innerHTML += `
        <li class="list-group-item d-flex justify-content-between align-items-center px-0 py-1 border-0">
          <span><i class="bi bi-check2-circle text-success me-2"></i>${d.nome}</span>
          <small class="text-muted">${d.codigo}</small>
        </li>`;
    }
  });
}

// ===== SUBMETER =====
async function submeterInscricao() {
  if (!document.getElementById('declaroCheck').checked) {
    mostrarToast('Confirme a declaração antes de submeter.', 'warning');
    return;
  }
  document.getElementById('loadingOverlay').classList.add('show');

  const payload = {
    action:          'submitInscricao',
    numAluno:        document.getElementById('numAluno').value,
    nome:            document.getElementById('nomeEstudante').value,
    email:           document.getElementById('emailEstudante').value,
    telefone:        '+244' + document.getElementById('telefone').value,
    curso:           document.getElementById('cursoSelect').value,
    anoCurso:        document.getElementById('anoCurso').value,
    anoLectivo:      document.getElementById('anoLectivo').value,
    disciplinas:     disciplinasSelecionadas.join(','),
    observacoes:     document.getElementById('observacoes').value,
    timestamp:       new Date().toISOString(),
  };

  try {
    // Simulação (remover em produção e usar o fetch real abaixo)
    await simularEnvio(payload);

    document.getElementById('loadingOverlay').classList.remove('show');
    mostrarSucesso(payload);
  } catch (err) {
    document.getElementById('loadingOverlay').classList.remove('show');
    mostrarToast('Erro ao submeter. Tente novamente.', 'danger');
    console.error(err);
  }
}

/* Fetch real para o Apps Script — descomente em produção:
async function enviarAoAppsScript(payload) {
  const resp = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return resp;
}
*/

async function simularEnvio(payload) {
  await new Promise(r => setTimeout(r, 1800));
  // Guardar localmente para demonstração
  const inscricoes = JSON.parse(localStorage.getItem('sga_inscricoes') || '[]');
  const ref = 'INS-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9000)+1000);
  inscricoes.push({ ...payload, ref, estado: 'Pendente', data: new Date().toLocaleDateString('pt-PT') });
  localStorage.setItem('sga_inscricoes', JSON.stringify(inscricoes));
  payload._ref = ref;
}

function mostrarSucesso(payload) {
  document.getElementById('step3').style.display = 'none';
  document.getElementById('stepSucesso').style.display = 'block';
  document.getElementById('sucesso-email').textContent = payload.email;
  document.getElementById('sucesso-ref').textContent = payload._ref || 'INS-2026-XXXX';
}

// ===== TOAST =====
function mostrarToast(msg, tipo = 'info') {
  const toastEl = document.getElementById('toastMsg');
  const body    = document.getElementById('toastBody');
  toastEl.className = `toast align-items-center border-0 text-bg-${tipo}`;
  body.textContent = msg;
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
}

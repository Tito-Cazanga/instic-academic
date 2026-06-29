# INSTIC Academic — Sistema de Gestão Académica para Inscrição em Disciplinas

## Visão Geral

Sistema digital desenvolvido com **Google Workspace** + **HTML5 / CSS3 / Bootstrap 5 / JavaScript** para automatizar o processo de inscrição académica em disciplinas do INSTIC — Universidade de Luanda.

---

## Estrutura do Projecto

```
projeto-academico/
│
├── portal-estudante/          # Portal do Estudante (acesso público)
│   ├── index.html             # Página inicial com hero e funcionalidades
│   ├── inscricao.html         # Formulário de inscrição em disciplinas
│   ├── inscricao.js           # Lógica JS do formulário (validação + integração)
│   ├── consulta.html          # Consulta do estado da inscrição + download PDF
│   ├── propinas.html          # Consulta de propinas e histórico de pagamentos
│   ├── horario.html           # Horário semanal das disciplinas inscritas
│   └── styles.css             # Folha de estilos global (variáveis CSS + Bootstrap)
│
├── portal-admin/              # Portal Administrativo (acesso restrito)
│   ├── dashboard.html         # Dashboard com KPIs, gráficos e alertas
│   ├── inscricoes.html        # Gestão e validação de inscrições
│   ├── estudantes.html        # Cadastro e consulta de estudantes
│   ├── documentos.html        # Comprovativos, declarações e listas de turma
│   └── relatorios.html        # Relatórios estatísticos com Chart.js
│
└── apps-script/               # Código Google Apps Script
    ├── Codigo.gs              # Módulo principal (triggers, inscrições, docs, email, API)
    └── Propinas.gs            # Módulo de propinas, horários e disciplinas
```

---

## Tecnologias Utilizadas

| Componente            | Tecnologia                              |
|-----------------------|-----------------------------------------|
| Frontend              | HTML5, CSS3, Bootstrap 5.3, JavaScript  |
| Ícones                | Bootstrap Icons 1.11                    |
| Gráficos              | Chart.js 4.4                            |
| Backend / Automação   | Google Apps Script (JavaScript ES6)     |
| Base de Dados         | Google Sheets                           |
| Formulários           | Google Forms                            |
| Armazenamento         | Google Drive                            |
| Templates de Docs     | Google Docs                             |
| Publicação Web        | Google Sites                            |

---

## Configuração e Implementação

### 1. Google Sheets — Base de Dados

1. Criar uma nova Google Spreadsheet
2. Copiar o ID do URL: `https://docs.google.com/spreadsheets/d/**SPREADSHEET_ID**/edit`
3. Colar o ID em `CONFIG.SPREADSHEET_ID` no ficheiro `Codigo.gs`
4. Executar `setup()` — as folhas são criadas automaticamente

**Folhas criadas automaticamente:**
- `Inscricoes` — Registo de todas as inscrições
- `Estudantes` — Cadastro dos discentes
- `Disciplinas` — Catálogo de disciplinas com vagas
- `Propinas` — Registo de pagamentos mensais
- `Horarios` — Grade horária semanal

### 2. Google Forms — Formulário de Inscrição

1. Criar um Google Form com os campos:
   - Número de Estudante (resposta curta, obrigatório)
   - Nome Completo (resposta curta, obrigatório)
   - Email Institucional (resposta curta, obrigatório)
   - Telefone (resposta curta)
   - Curso (lista suspensa: LEI, LGI, LCC, TSI)
   - Ano Lectivo (lista suspensa)
   - Ano do Curso (lista suspensa: 1.º ao 5.º)
   - Disciplinas (caixas de verificação com as disciplinas disponíveis)
   - Observações (resposta longa, opcional)
2. Copiar o ID do formulário e inserir em `CONFIG.FORM_ID`
3. A ligação entre Forms e Sheets é configurada automaticamente pelo `setup()`

### 3. Google Apps Script

1. Abrir a Google Spreadsheet → Extensions → Apps Script
2. Copiar o conteúdo de `Codigo.gs` para o editor
3. Criar um segundo ficheiro e copiar o conteúdo de `Propinas.gs`
4. Preencher todas as constantes em `CONFIG` (IDs, emails, etc.)
5. Executar `setup()` uma única vez (autorizar permissões solicitadas)
6. Para o Web App: Deploy → New Deployment → Web App
   - Execute as: Me
   - Who has access: Anyone
7. Copiar o URL do Web App para o ficheiro `inscricao.js` (variável `APPS_SCRIPT_URL`)

### 4. Google Drive — Templates e Pastas

1. Criar no Google Drive uma pasta raiz: `INSTIC_Academic`
2. Copiar o ID da pasta e inserir em `CONFIG.DRIVE_PASTA_RAIZ_ID`
3. Criar os templates Google Docs:
   - **Template Comprovativo**: usar marcadores `{{ID_INSCRICAO}}`, `{{NOME_COMPLETO}}`, `{{CURSO}}`, etc.
   - **Template Declaração**: usar marcadores `{{NUM_DECLARACAO}}`, `{{NOME_COMPLETO}}`, etc.
   - **Template Lista de Turma**: base para geração de listas por disciplina
4. Copiar os IDs de cada template para `CONFIG`

### 5. Google Sites — Portal Web

1. Criar um Google Site em `sites.google.com`
2. Publicar o site com o domínio institucional
3. Incorporar as páginas HTML via Embed ou iframe
4. Configurar permissões de acesso (estudantes vs. administradores)

---

## Fluxo do Sistema

```
Estudante               Sistema                     Administrador
    │                      │                              │
    ├─ Acede ao Portal ────►│                              │
    ├─ Preenche Formulário ►│                              │
    │                      ├─ Valida dados ───────────────►│
    │                      ├─ Verifica propinas            │
    │                      ├─ Verifica vagas               │
    │                      ├─ Regista na BD (Pendente)     │
    │◄─ Email confirmação ──┤                              │
    │                      ├─ Notifica secretaria ────────►│
    │                      │                    ├─ Revê inscrição
    │                      │                    ├─ Valida / Rejeita
    │                      │◄── Decisão ─────────┤
    │                      ├─ Gera PDF Comprovativo        │
    │                      ├─ Gera PDF Declaração          │
    │                      ├─ Guarda no Drive              │
    │◄─ Email validação ────┤                              │
    ├─ Download PDF ───────►│                              │
    │                      │                              │
```

---

## Funcionalidades Implementadas

### Portal do Estudante
- [x] Página inicial com hero, funcionalidades e avisos
- [x] Formulário de inscrição com stepper (3 passos)
- [x] Validação client-side em JavaScript
- [x] Selecção de disciplinas com indicador de vagas em tempo real
- [x] Página de consulta do estado da inscrição com timeline
- [x] Download de comprovativo e declaração (integração Drive)
- [x] Consulta de propinas com tabela detalhada e barra de progresso
- [x] Horário semanal com grade visual e codificação por cor
- [x] Design responsivo (mobile + desktop)
- [x] Notificações via Bootstrap Toasts

### Portal Administrativo
- [x] Dashboard com KPIs em tempo real (inscrições, validações, alertas)
- [x] Gráficos interactivos: barras diárias, doughnut por curso (Chart.js)
- [x] Gestão de inscrições: tabela paginada com filtros e pesquisa
- [x] Modal de detalhe com validação / rejeição (com motivo obrigatório)
- [x] Acção rápida de validar/rejeitar directamente na tabela
- [x] Exportação de lista para CSV
- [x] Gestão de estudantes: cadastro, consulta, filtros e exportação
- [x] Registo de novo estudante via modal
- [x] Documentos: comprovativos, declarações e listas de turma
- [x] Geração de listas de turma com exportação
- [x] Relatórios estatísticos com 4 tabs (inscrições, ocupação, propinas, evolução)
- [x] Gráficos: barras agrupadas, doughnut, barras horizontais, linha temporal

### Google Apps Script
- [x] Trigger automático onFormSubmit
- [x] Trigger diário para lembretes de propinas
- [x] Trigger semanal para relatório da secretaria
- [x] Validação de dados (campos, formato email, número de disciplinas)
- [x] Verificação de propinas em dívida
- [x] Verificação de disponibilidade de vagas
- [x] Registo de inscrições no Google Sheets
- [x] Geração de comprovativo PDF (template Google Docs)
- [x] Geração de declaração de matrícula PDF
- [x] Geração de lista de turma em PDF
- [x] Organização automática no Google Drive
- [x] 5 tipos de email HTML responsivo (confirmação, validação, rejeição, propinas, recibo)
- [x] Web App API (doGet / doPost) para integração com o portal
- [x] Menu personalizado no Google Sheets
- [x] Módulo de propinas (pagamentos, resumo financeiro, relatório de dívidas)
- [x] Módulo de horários (verificação de conflitos, horário completo)
- [x] Módulo de disciplinas (gestão de vagas, estatísticas)

---

## Requisitos para Execução Local

Para testar o projecto localmente, basta abrir os ficheiros HTML num navegador.  
Não é necessário servidor web — todas as funcionalidades de demonstração usam `localStorage`.

```bash
# Exemplo com Python (opcional)
cd projeto-academico/portal-estudante
python3 -m http.server 8080
# Abrir: http://localhost:8080
```

---

## Credenciais de Demonstração

| Portal | Utilizador | Acesso |
|--------|-----------|--------|
| Estudante — Demo | N.º: `DEMO` ou Ref: `INS-2026-DEMO` | Portal Estudante → Consultar |
| Administrador | Qualquer email | Portal Administrativo — acesso directo |

---

## Autor e Contexto Académico

**Projecto Final — Tópico Especial I**  
Instituto de Tecnologias de Informação e Comunicação — INSTIC  
Universidade de Luanda · Ano Lectivo 2025/2026

---

*Desenvolvido com Google Workspace — Google Forms · Sheets · Docs · Drive · Apps Script · Sites*

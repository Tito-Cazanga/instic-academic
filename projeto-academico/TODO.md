# TODO — Adaptação para Google Sites + Apps Script

- [ ] Gerar versão “Google Sites friendly” das páginas do `portal-estudante` (index/inscricao/consulta/horario/propinas): CSS embutido em `<style>` e JS embutido (em `inscricao.html`).
- [ ] Garantir que os caminhos relativos (`styles.css`, `inscricao.js`) deixam de ser necessários.
- [ ] Manter compatibilidade com Google Apps Script/Workspace: preservar `fetch` (quando habilitado) para o Web App do Apps Script e evitar dependências externas locais.
- [ ] Atualizar/duplicar `inscricao.js` em forma inline apenas para `inscricao.html` (sem quebrar funções globais e `onclick`).
- [ ] Atualizar as demais páginas para remover necessidade de `styles.css` via inline.
- [x] Validar consistência: checar se as tags `<script>`/`<style>` estão no local correto e se não há referências quebradas.




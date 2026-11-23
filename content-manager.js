(function () {
  'use strict';

  const $ = (selector, root) => (root || document).querySelector(selector);
  const categorySelect = $('#content-category');
  const entryList = $('#content-entries');
  const entryForm = $('#content-entry-form');
  const fieldsHost = $('#content-entry-fields');
  const status = $('#content-status');
  let currentPage = '';
  let previewDoc = null;
  let currentCategory = '';
  let idCounter = 0;

  function setStatus(message, kind) {
    status.textContent = message || '';
    status.classList.toggle('error-text', kind === 'error');
    status.classList.toggle('success-text', kind === 'success');
  }
  function safeText(element) { return (element && element.textContent || '').replace(/\s+/g, ' ').trim(); }
  function makeId(prefix) { idCounter += 1; return prefix + '-' + Date.now().toString(36) + '-' + idCounter; }
  function dispatchChange(translations) {
    document.dispatchEvent(new CustomEvent('ecrin-content-change', { detail: { translations: translations || [] } }));
  }
  function makeEditable(element, value) {
    element.textContent = value;
    element.setAttribute('contenteditable', previewDoc.documentElement.getAttribute('data-lang') === 'en' || previewDoc.documentElement.getAttribute('data-editor-link-test') === 'true' ? 'false' : 'true');
    element.setAttribute('data-editor-original-text', value);
    element.setAttribute('data-editor-source-text', value);
    element.setAttribute('spellcheck', 'true');
    return element;
  }
  function categoryOptions() {
    if (!previewDoc) return [];
    const options = [];
    const doc = previewDoc;
    if (currentPage === 'logement.html') {
      if (doc.querySelector('.guide .tablist')) options.push({ key: 'equipment', label: 'Mode d’emploi des appareils' });
      if (doc.querySelector('#regles .rules')) options.push({ key: 'rules', label: 'Règles du logement' });
      if (doc.querySelector('#inventaire .rooms')) options.push({ key: 'inventory', label: 'Inventaire et équipements' });
      if (doc.querySelector('#faq .faq')) options.push({ key: 'faq', label: 'Questions fréquentes (FAQ)' });
      if (doc.querySelector('#arrival-list')) options.push({ key: 'checklist:arrival-list', label: 'Checklist d’arrivée' });
      if (doc.querySelector('#checklist')) options.push({ key: 'checklist:checklist', label: 'Checklist de départ' });
    }
    if (currentPage === 'station.html' && doc.querySelector('#today-list')) options.push({ key: 'checklist:today-list', label: 'Checklist « Aujourd’hui »' });
    if (doc.querySelector('.hero-actions, .quick-actions')) options.push({ key: 'shortcuts', label: 'Raccourcis de la page' });
    return options;
  }
  function fillCategories() {
    const options = categoryOptions();
    categorySelect.replaceChildren();
    if (!options.length) {
      const option = document.createElement('option'); option.value = ''; option.textContent = 'Aucun élément gérable sur cette page'; categorySelect.appendChild(option);
      currentCategory = ''; entryForm.hidden = true; entryList.innerHTML = '<p class="empty-state">Change de page dans l’aperçu pour gérer ses contenus.</p>'; return;
    }
    options.forEach(item => {
      const option = document.createElement('option'); option.value = item.key; option.textContent = item.label; categorySelect.appendChild(option);
    });
    if (!options.some(item => item.key === currentCategory)) currentCategory = options[0].key;
    categorySelect.value = currentCategory;
    renderCategory();
  }
  function inventoryTargets() {
    if (!previewDoc) return [];
    return Array.from(previewDoc.querySelectorAll('#inventaire .rooms .grp')).map(group => {
      let list = group.querySelector('ul');
      if (!list) { list = previewDoc.createElement('ul'); group.appendChild(list); }
      const room = group.closest('.room');
      const roomName = safeText(room && room.querySelector('h3')) || 'Pièce';
      const groupName = safeText(group.querySelector('h4')) || 'Équipements';
      return { list, label: roomName + ' — ' + groupName };
    });
  }
  function recordsFor(category) {
    if (!previewDoc || !category) return [];
    const doc = previewDoc;
    if (category === 'equipment') return Array.from(doc.querySelectorAll('.guide .tablist .tab[role="tab"]')).map(button => {
      const panel = doc.getElementById(button.getAttribute('aria-controls'));
      return { element: button, panel, title: safeText(button.querySelector('span')) || safeText(button), detail: safeText(panel && panel.querySelector('.appliance-heading + p, .appliance-heading ~ p, .tip span, ol li span')) };
    });
    if (category === 'rules') return Array.from(doc.querySelectorAll('#regles .rules > li')).map(element => ({ element, title: safeText(element.querySelector('b,strong')) || safeText(element), detail: safeText(element.querySelector('span')) }));
    if (category === 'inventory') return Array.from(doc.querySelectorAll('#inventaire .rooms .grp li')).map(element => {
      const group = element.closest('.grp'), room = element.closest('.room');
      return { element, title: safeText(element), detail: (safeText(room && room.querySelector('h3')) || 'Pièce') + ' · ' + (safeText(group && group.querySelector('h4')) || 'Équipements') };
    });
    if (category === 'faq') return Array.from(doc.querySelectorAll('#faq .faq > details')).map(element => ({ element, title: safeText(element.querySelector('summary')) || 'Question', detail: safeText(element.querySelector('p')) }));
    if (category.indexOf('checklist:') === 0) {
      const list = doc.getElementById(category.split(':')[1]);
      return Array.from(list ? list.querySelectorAll(':scope > li') : []).map(element => ({ element, title: safeText(element.querySelector('label span')) || safeText(element), detail: '' }));
    }
    if (category === 'shortcuts') return Array.from(doc.querySelectorAll('.hero-actions a, .quick-actions a')).map(element => ({ element, title: safeText(element), detail: element.getAttribute('href') || '' }));
    return [];
  }
  function addRemoveButton(onClick) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'button danger'; button.textContent = 'Retirer'; button.setAttribute('aria-label', 'Retirer cet élément'); button.addEventListener('click', onClick); return button;
  }
  function renderCategory() {
    if (!previewDoc || !currentCategory) return;
    entryList.replaceChildren();
    const records = recordsFor(currentCategory);
    if (!records.length) {
      const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'Aucun élément pour le moment. Tu peux en ajouter ci-dessous.'; entryList.appendChild(empty);
    } else records.forEach(record => {
      const row = document.createElement('div'); row.className = 'content-entry';
      const copy = document.createElement('div'); copy.className = 'content-entry-copy';
      const title = document.createElement('strong'); title.textContent = record.title || 'Élément sans titre'; copy.appendChild(title);
      if (record.detail) { const detail = document.createElement('span'); detail.textContent = record.detail; copy.appendChild(detail); }
      row.appendChild(copy);
      row.appendChild(addRemoveButton(() => {
        const wasSelected = currentCategory === 'equipment' && record.element.getAttribute('aria-selected') === 'true';
        if (currentCategory === 'equipment') { record.element.remove(); if (record.panel) record.panel.remove(); }
        else record.element.remove();
        if (wasSelected) { const first = previewDoc.querySelector('.guide .tablist .tab[role="tab"]'); if (first) first.click(); }
        dispatchChange([]); renderCategory(); setStatus('Élément retiré de cette page.','success');
      }));
      entryList.appendChild(row);
    });
    renderForm();
  }
  function addField(labelText, name, type, required, placeholder) {
    const wrapper = document.createElement('div'); wrapper.className = 'content-entry-field';
    const label = document.createElement('label'); label.textContent = labelText;
    let control;
    if (type === 'textarea') { control = document.createElement('textarea'); }
    else if (type === 'select') { control = document.createElement('select'); }
    else { control = document.createElement('input'); control.type = type || 'text'; }
    control.name = name; control.required = !!required; if (placeholder) control.placeholder = placeholder;
    label.appendChild(control); wrapper.appendChild(label); fieldsHost.appendChild(wrapper); return control;
  }
  function addEnglishFields(fields) {
    fields.forEach(field => addField(field.label + ' — anglais (facultatif)', field.name, field.type || 'text', false, 'Laisser vide pour une proposition automatique si la traduction est autorisée.'));
  }
  function renderForm() {
    fieldsHost.replaceChildren(); entryForm.hidden = false;
    const category = currentCategory;
    if (category === 'equipment') {
      addField('Nom de l’appareil', 'title', 'text', true, 'Ex. Machine à café');
      addField('Consigne ou description', 'detail', 'textarea', true, 'Explique son fonctionnement en quelques étapes.');
      addEnglishFields([{label:'Nom de l’appareil',name:'titleEn'},{label:'Consigne ou description',name:'detailEn',type:'textarea'}]);
    } else if (category === 'rules') {
      addField('Règle', 'title', 'text', true, 'Ex. Respecter le calme après 22 h');
      addField('Détail', 'detail', 'textarea', true, 'Ajoute une précision utile.');
      addEnglishFields([{label:'Règle',name:'titleEn'},{label:'Détail',name:'detailEn',type:'textarea'}]);
    } else if (category === 'inventory') {
      const targets = inventoryTargets();
      const selector = addField('Pièce et rubrique', 'target', 'select', true);
      targets.forEach((target,index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = target.label; selector.appendChild(option); });
      addField('Élément à ajouter', 'title', 'text', true, 'Ex. Grille-pain');
      addEnglishFields([{label:'Élément',name:'titleEn'}]);
    } else if (category === 'faq') {
      addField('Question', 'title', 'text', true, 'Ex. Où se trouve le local à skis ?');
      addField('Réponse', 'detail', 'textarea', true, 'Écris une réponse courte et claire.');
      addEnglishFields([{label:'Question',name:'titleEn'},{label:'Réponse',name:'detailEn',type:'textarea'}]);
    } else if (category.indexOf('checklist:') === 0) {
      addField('Tâche à cocher', 'title', 'text', true, 'Ex. Vérifier les fenêtres');
      addEnglishFields([{label:'Tâche',name:'titleEn'}]);
    } else if (category === 'shortcuts') {
      addField('Texte du raccourci', 'title', 'text', true, 'Ex. Météo de la station');
      addField('Adresse ou ancre', 'href', 'text', true, 'Ex. station.html#meteo ou https://…');
      addEnglishFields([{label:'Texte du raccourci',name:'titleEn'}]);
    }
  }
  function textPair(value, english) { return { fr: String(value || '').trim(), en: String(english || '').trim() }; }
  function makeTaskListItem(list, title, key) {
    const li = previewDoc.createElement('li');
    const label = previewDoc.createElement('label');
    const box = previewDoc.createElement('input'); box.type = 'checkbox'; box.setAttribute('data-added-task', key);
    const span = previewDoc.createElement('span'); makeEditable(span, title);
    label.appendChild(box); label.appendChild(span); li.appendChild(label); list.appendChild(li); return li;
  }
  function addEntry(event) {
    event.preventDefault();
    if (!previewDoc || !currentCategory) return;
    const values = Object.fromEntries(new FormData(entryForm).entries());
    const title = String(values.title || '').trim(), detail = String(values.detail || '').trim();
    if (!title) return;
    const translations = [];
    const addPair = (fr,en) => { if (String(fr || '').trim()) translations.push(textPair(fr,en)); };
    const doc = previewDoc;
    if (currentCategory === 'equipment') {
      const list = doc.querySelector('.guide .tablist');
      const panelsHost = list && list.parentElement;
      if (!list || !panelsHost) { setStatus('La zone des appareils est introuvable sur cette page.','error'); return; }
      const key = makeId('appliance'), tabId = 't-' + key, panelId = 'p-' + key;
      const button = doc.createElement('button'); button.type = 'button'; button.className = 'tab'; button.id = tabId; button.setAttribute('role','tab'); button.setAttribute('aria-controls',panelId); button.setAttribute('aria-selected','false'); button.tabIndex = -1;
      const label = doc.createElement('span'); makeEditable(label,title); button.appendChild(label); list.appendChild(button);
      let host = panelsHost.children[1]; if (!host) { host = doc.createElement('div'); panelsHost.appendChild(host); }
      const panel = doc.createElement('section'); panel.className = 'panel'; panel.id = panelId; panel.setAttribute('role','tabpanel'); panel.setAttribute('aria-labelledby',tabId); panel.hidden = true;
      const heading = doc.createElement('div'); heading.className = 'appliance-heading'; const headingText = doc.createElement('div'); const h3 = doc.createElement('h3'); makeEditable(h3,title); headingText.appendChild(h3); heading.appendChild(headingText); panel.appendChild(heading);
      const paragraph = doc.createElement('p'); makeEditable(paragraph,detail); panel.appendChild(paragraph); host.appendChild(panel);
      addPair(title,values.titleEn); addPair(detail,values.detailEn);
    } else if (currentCategory === 'rules') {
      const list = doc.querySelector('#regles .rules'); if (!list) return;
      const li = doc.createElement('li'), strong = doc.createElement('b'), span = doc.createElement('span'); makeEditable(strong,title); makeEditable(span,detail); li.appendChild(strong); li.appendChild(span); list.appendChild(li);
      addPair(title,values.titleEn); addPair(detail,values.detailEn);
    } else if (currentCategory === 'inventory') {
      const targets = inventoryTargets(), target = targets[Number(values.target)] || targets[0]; if (!target) return;
      const li = doc.createElement('li'); makeEditable(li,title); target.list.appendChild(li); addPair(title,values.titleEn);
    } else if (currentCategory === 'faq') {
      const host = doc.querySelector('#faq .faq'); if (!host) return;
      const details = doc.createElement('details'), summary = doc.createElement('summary'), answer = doc.createElement('p'); makeEditable(summary,title); makeEditable(answer,detail); details.appendChild(summary); details.appendChild(answer); host.appendChild(details);
      addPair(title,values.titleEn); addPair(detail,values.detailEn);
    } else if (currentCategory.indexOf('checklist:') === 0) {
      const list = doc.getElementById(currentCategory.split(':')[1]); if (!list) return;
      const item = makeTaskListItem(list,title,makeId('task')); addPair(title,values.titleEn);
      const progress = list.id === 'checklist' ? doc.getElementById('progress') : doc.getElementById(list.id === 'arrival-list' ? 'arrival-progress' : 'today-progress');
      if (progress) progress.textContent = '';
    } else if (currentCategory === 'shortcuts') {
      const host = doc.querySelector('.hero-actions, .quick-actions'); if (!host) return;
      const href = String(values.href || '').trim();
      if (!href || /^(javascript|data|file|blob):/i.test(href) || href.startsWith('//')) { setStatus('Adresse refusée. Utilise un lien https://, mailto:, tel:, un fichier local ou une ancre (#…).','error'); return; }
      const link = doc.createElement('a'); link.className = 'btn'; link.href = href; makeEditable(link,title);
      try { const target = new URL(href,new URL(currentPage,'https://ecrin-preview.invalid/')); if ((target.protocol === 'http:' || target.protocol === 'https:') && target.origin !== 'https://ecrin-preview.invalid') { link.target = '_blank'; link.rel = 'noopener noreferrer'; } } catch (e) {}
      host.appendChild(link); addPair(title,values.titleEn);
    }
    dispatchChange(translations);
    entryForm.reset(); renderCategory(); setStatus('Élément ajouté et enregistré dans cette page.','success');
  }
  function refresh() {
    if (!previewDoc) { entryForm.hidden = true; return; }
    fillCategories();
  }
  function refreshAfterLanguageChange() {
    if (!previewDoc || !currentCategory) return;
    const values = new Map(Array.from(fieldsHost.querySelectorAll('[name]')).map(control => [control.name,control.value]));
    renderCategory();
    fieldsHost.querySelectorAll('[name]').forEach(control => { if (values.has(control.name)) control.value = values.get(control.name); });
  }
  categorySelect.addEventListener('change', () => { currentCategory = categorySelect.value; renderCategory(); setStatus('',''); });
  entryForm.addEventListener('submit', addEntry);
  document.addEventListener('ecrin-preview-ready', event => {
    currentPage = event.detail.page; previewDoc = event.detail.document; currentCategory = ''; refresh();
  });
  document.addEventListener('ecrin-content-panel-open', refresh);
  document.addEventListener('ecrin-preview-language-change', refreshAfterLanguageChange);
})();

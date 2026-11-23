(function () {
  'use strict';
  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const folderInput = $('#folder-input');
  const importStatus = $('#import-status');
  const editorApp = $('#editor-app');
  const previewFrame = $('#preview-frame');
  const pageSelect = $('#page-select');
  const exportStatus = $('#export-status');
  const translationStatus = $('#translation-status');
  const translationConsent = $('#auto-translation-consent');
  const linkTestToggle = $('#link-test-toggle');
  const imageInput = $('#replace-image-input');
  const addGalleryImageInput = $('#add-gallery-image-input');
  const galleryTarget = $('#gallery-target');
  const DEFAULT_CONFIG = {
    NOM_LOGEMENT:'', NUMERO_LOGEMENT:'', NOM_RESIDENCE:'', NOM_STATION:'', ADRESSE_LOGEMENT:'',
    NOM_HOTES:'', NOM_CONCIERGERIE:'', TELEPHONE_CONCIERGERIE:'', EMAIL_HOTES:'', EMAIL_CONCIERGERIE:'',
    NOM_RESEAU_WIFI:'', MOT_DE_PASSE_WIFI:'', ANNEE:String(new Date().getFullYear()),
    TITRE_ACTUALITE_FR:'', TITRE_ACTUALITE_EN:'', TEXTE_ACTUALITE_FR:'', TEXTE_ACTUALITE_EN:'',
    ALT_PHOTO_ACTUALITE_FR:'', ALT_PHOTO_ACTUALITE_EN:'', URL_FORFAITS:'', URL_PISTES:'', URL_RANDONNEE:'',
    URL_CARTE_STATION:'', URL_NAVETTES:'', URL_NAVETTES_TEMPS_REEL:'', URL_APPLI_NAVETTES_IOS:'',
    URL_APPLI_NAVETTES_ANDROID:'', URL_METEO:'', URL_WEBCAMS:'', URL_ITINERAIRE:'',
    URL_AUTRE_LIEN_STATION:'', TELEPHONE_CENTRE_MEDICAL:'', URL_FORMULAIRE_AVIS:'', URL_FORMULAIRE_SIGNALEMENT:''
  };
  const FIELD_GROUPS = [
    { title:'Logement et station', fields:[
      ['NOM_LOGEMENT','Nom du logement','text'],['NUMERO_LOGEMENT','Numéro ou repère','text'],
      ['NOM_RESIDENCE','Résidence','text'],['NOM_STATION','Station ou ville','text'],['ADRESSE_LOGEMENT','Adresse complète','textarea']
    ]},
    { title:'Contacts et Wi-Fi', fields:[
      ['NOM_HOTES','Nom des hôtes','text'],['NOM_CONCIERGERIE','Nom de la conciergerie','text'],
      ['TELEPHONE_CONCIERGERIE','Téléphone de la conciergerie','tel'],['EMAIL_HOTES','E-mail des hôtes','email'],
      ['EMAIL_CONCIERGERIE','E-mail de la conciergerie','email'],['NOM_RESEAU_WIFI','Nom du réseau Wi-Fi','text'],
      ['MOT_DE_PASSE_WIFI','Mot de passe Wi-Fi','password'],['ANNEE','Année du copyright','text']
    ]},
    { title:'Actualité de l’appartement', fields:[
      ['TITRE_ACTUALITE_FR','Titre en français','text'],['TEXTE_ACTUALITE_FR','Texte en français','textarea'],
      ['ALT_PHOTO_ACTUALITE_FR','Description accessible de la photo (FR)','text'],
      ['TITRE_ACTUALITE_EN','Title in English','text'],['TEXTE_ACTUALITE_EN','Text in English','textarea'],
      ['ALT_PHOTO_ACTUALITE_EN','Accessible photo description (EN)','text']
    ]},
    { title:'Liens de la station', fields:[
      ['URL_FORFAITS','Forfaits','url'],['URL_PISTES','Pistes et remontées','url'],['URL_RANDONNEE','Randonnée','url'],
      ['URL_CARTE_STATION','Carte de la station','url'],['URL_NAVETTES','Navettes','url'],
      ['URL_NAVETTES_TEMPS_REEL','Navettes en temps réel','url'],['URL_APPLI_NAVETTES_IOS','Application navettes iOS','url'],
      ['URL_APPLI_NAVETTES_ANDROID','Application navettes Android','url'],['URL_METEO','Météo officielle','url'],
      ['URL_WEBCAMS','Webcams','url'],['URL_ITINERAIRE','Itinéraire (facultatif)','url'],
      ['URL_AUTRE_LIEN_STATION','Autre lien utile','url'],['TELEPHONE_CENTRE_MEDICAL','Téléphone du centre médical','tel']
    ]},
    { title:'Envoi des formulaires (facultatif)', fields:[
      ['URL_FORMULAIRE_AVIS','Adresse d’envoi du formulaire d’avis','url'],
      ['URL_FORMULAIRE_SIGNALEMENT','Adresse d’envoi d’un signalement','url']
    ]}
  ];
  const FIELD_PREVIEW_LABELS=Object.create(null);
  FIELD_GROUPS.forEach(group=>group.fields.forEach(([key,label])=>{FIELD_PREVIEW_LABELS[key]=label;}));
  const REQUIRED_CORE = ['index.html','logement.html','station.html','styles.css','site.js','season.js','parallax.js','lightbox.js'];
  const EXPORT_CORE = ['index.html','logement.html','station.html','styles.css','site.js','season.js','parallax.js','lightbox.js','configurer.html','configurer.css','configurer.js','content-manager.js','zip-store.js','LISEZ-MOI-CONFIGURATEUR.txt'];
  const IMAGE_EXTS = new Set(['.jpg','.jpeg','.png','.webp','.gif','.svg','.avif','.ico']);
  const SEASON_PHOTOS = { winter:['montagne-pistes.jpg','village-montagne.jpg'], spring:['montagne-printemps.jpg','montagne-randonnee.jpg'], summer:['montagne-randonnee.jpg','montagne-printemps.jpg'], autumn:['montagne-automne-3.jpg','montagne-automne-2.jpg','montagne-automne-hero.webp'] };
  let sourceFiles = new Map();
  let config = Object.assign({}, DEFAULT_CONFIG);
  let imageAlts = Object.create(null);
  let editedPages = new Map();
  let translations = Object.create(null);
  let interfaceTranslations = Object.create(null);
  let languageTexts = Object.create(null);
  let currentPage = 'index.html';
  let pendingImagePath = '';
  let imageUrls = new Map();
  let blobToFilePath = new Map();
  let previewReady = false;
  let translationCards = [];
  let previewUpdateTimer = 0;
  let linkTestMode = false;
  let previewLanguage = 'fr';
  const pendingTranslationTasks = new Set();
  const untranslatedEditedTexts = new Set();
  const manualTranslationOverrides = new Set();
  const manualNewsOverrides = new Set();
  const editedNewsFields = new Set();
  let pendingPreviewAnchor = '';
  const translationCache = new Map();
  const translationPending = new Map();
  const translationRequestVersions = new Map();
  const newsTranslationTimers = new Map();
  const newsTranslationVersions = new Map();

  function setStatus(el, message, kind) {
    el.textContent = message || '';
    el.classList.toggle('error-text', kind === 'error');
    el.classList.toggle('success-text', kind === 'success');
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function escapeJs(value) {
    return String(value == null ? '' : value).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/<\//g,'<\\/');
  }
  function normalizePath(path) {
    return String(path || '').replace(/\\/g,'/').replace(/^\.\//,'').replace(/^\/+/, '');
  }
  function fileExtension(path) {
    const name = normalizePath(path).split('/').pop() || '';
    const i = name.lastIndexOf('.');
    return i < 0 ? '' : name.slice(i).toLowerCase();
  }
  function safeRelativePath(path) {
    const p = normalizePath(path);
    return !!p && !p.split('/').some(part => !part || part === '.' || part === '..') && !p.startsWith('__MACOSX/');
  }
  function resolveAssetPath(path) {
    let p = normalizePath(String(path || '').split(/[?#]/)[0]);
    if (!p || /^(https?:|data:|blob:|mailto:|tel:|#)/i.test(p)) return '';
    if (sourceFiles.has(p) && IMAGE_EXTS.has(fileExtension(p))) return p;
    const base = p.split('/').pop();
    for (const key of sourceFiles.keys()) if (key.split('/').pop() === base && IMAGE_EXTS.has(fileExtension(key))) return key;
    return '';
  }
  function getImageUrl(path) {
    const p = normalizePath(path);
    if (imageUrls.has(p)) return imageUrls.get(p);
    const file = sourceFiles.get(p);
    if (!file) return '';
    const url = URL.createObjectURL(file);
    imageUrls.set(p, url);
    blobToFilePath.set(url, p);
    return url;
  }
  function getConfigValues() {
    const values = Object.assign({}, config);
    values.TEL_CONCIERGERIE_HREF = values.TELEPHONE_CONCIERGERIE ? 'tel:' + String(values.TELEPHONE_CONCIERGERIE).replace(/[^0-9+]/g,'') : '#';
    values.EMAIL_HOTES_HREF = values.EMAIL_HOTES ? 'mailto:' + values.EMAIL_HOTES : '#';
    values.EMAIL_CONCIERGERIE_HREF = values.EMAIL_CONCIERGERIE ? 'mailto:' + values.EMAIL_CONCIERGERIE : '#';
    const center = String(values.TELEPHONE_CENTRE_MEDICAL || '').replace(/[^0-9+]/g,'');
    values.TEL_CENTRE_MEDICAL_HREF = center ? 'tel:' + center : '#';
    if (!values.URL_ITINERAIRE && values.ADRESSE_LOGEMENT && values.NOM_STATION) {
      values.URL_ITINERAIRE = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(values.ADRESSE_LOGEMENT + ' ' + values.NOM_STATION);
    }
    return values;
  }
  function getPreviewValues() {
    const values=getConfigValues();
    Object.keys(DEFAULT_CONFIG).forEach(key=>{
      if(!String(config[key]||'').trim())values[key]='⟦'+(FIELD_PREVIEW_LABELS[key]||key)+'⟧';
    });
    return values;
  }
  function replaceTokens(text, values, isJs) {
    let out = String(text == null ? '' : text);
    Object.keys(values || {}).forEach(key => {
      const value = isJs ? escapeJs(values[key]) : escapeHtml(values[key]);
      out = out.split('[[' + key + ']]').join(value);
    });
    return out;
  }
  function replaceTokenValues(text, values) {
    let out = String(text == null ? '' : text);
    Object.keys(values || {}).forEach(key => {
      out = out.split('[[' + key + ']]').join(String(values[key] == null ? '' : values[key]));
    });
    return out;
  }
  function readQuoted(src, cursor) {
    const quote = src[cursor.i++];
    let value = '';
    while (cursor.i < src.length) {
      const ch = src[cursor.i++];
      if (ch === quote) return value;
      if (ch !== '\\') { value += ch; continue; }
      if (cursor.i >= src.length) break;
      const esc = src[cursor.i++];
      const map = { n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', v:'\v', '0':'\0' };
      if (esc === 'u') {
        const hex = src.slice(cursor.i, cursor.i + 4);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) { value += String.fromCharCode(parseInt(hex,16)); cursor.i += 4; }
        else value += 'u';
      } else if (esc === 'x') {
        const hex = src.slice(cursor.i, cursor.i + 2);
        if (/^[0-9a-fA-F]{2}$/.test(hex)) { value += String.fromCharCode(parseInt(hex,16)); cursor.i += 2; }
        else value += 'x';
      } else value += Object.prototype.hasOwnProperty.call(map,esc) ? map[esc] : esc;
    }
    throw new Error('Chaîne de traduction non terminée.');
  }
  function skipSpace(src, cursor) {
    while (cursor.i < src.length) {
      if (/\s/.test(src[cursor.i])) { cursor.i++; continue; }
      if (src[cursor.i] === '/' && src[cursor.i+1] === '/') { cursor.i += 2; while (cursor.i < src.length && src[cursor.i] !== '\n') cursor.i++; continue; }
      if (src[cursor.i] === '/' && src[cursor.i+1] === '*') { const end = src.indexOf('*/',cursor.i+2); cursor.i = end < 0 ? src.length : end+2; continue; }
      break;
    }
  }
  function parseJsValue(src, cursor) {
    skipSpace(src,cursor);
    const ch = src[cursor.i];
    if (ch === '{') return parseJsObject(src,cursor);
    if (ch === '"' || ch === "'") return readQuoted(src,cursor);
    const start = cursor.i;
    while (cursor.i < src.length && !/[\s,}:]/.test(src[cursor.i])) cursor.i++;
    const word = src.slice(start,cursor.i);
    if (word === 'true') return true;
    if (word === 'false') return false;
    if (word === 'null') return null;
    if (/^-?\d+(?:\.\d+)?$/.test(word)) return Number(word);
    return word;
  }
  function parseJsObject(src,cursor) {
    const result = Object.create(null);
    if (src[cursor.i] !== '{') throw new Error('Objet de traduction attendu.');
    cursor.i++;
    while (cursor.i < src.length) {
      skipSpace(src,cursor);
      if (src[cursor.i] === '}') { cursor.i++; return result; }
      if (src[cursor.i] === ',') { cursor.i++; continue; }
      let key;
      if (src[cursor.i] === '"' || src[cursor.i] === "'") key = readQuoted(src,cursor);
      else {
        const start = cursor.i;
        while (cursor.i < src.length && !/[\s:,{]/.test(src[cursor.i])) cursor.i++;
        key = src.slice(start,cursor.i);
      }
      skipSpace(src,cursor);
      if (src[cursor.i] !== ':') throw new Error('Deux-points manquant dans les traductions.');
      cursor.i++;
      result[String(key)] = parseJsValue(src,cursor);
      skipSpace(src,cursor);
      if (src[cursor.i] === ',') cursor.i++;
      else if (src[cursor.i] !== '}') throw new Error('Séparateur de traduction invalide.');
    }
    throw new Error('Objet de traduction non terminé.');
  }
  function parseObjectAfter(source, marker) {
    const found = source.indexOf(marker);
    if (found < 0) return null;
    const brace = source.indexOf('{',found + marker.length);
    if (brace < 0) return null;
    const cursor = { i:brace };
    const value = parseJsObject(source,cursor);
    return { value, start:brace, end:cursor.i };
  }
  function loadTranslationObjects(siteJs) {
    translations = Object.create(null);
    interfaceTranslations = Object.create(null);
    languageTexts = Object.create(null);
    try {
      const full = parseObjectAfter(siteJs,'var fullEnglishTranslations =');
      if (full) Object.assign(translations,full.value);
      let position = 0;
      const marker = 'Object.assign(fullEnglishTranslations,';
      while ((position = siteJs.indexOf(marker,position)) >= 0) {
        const obj = parseObjectAfter(siteJs.slice(position),marker);
        if (!obj) break;
        Object.assign(translations,obj.value);
        position += obj.end;
      }
      const interfaceObj = parseObjectAfter(siteJs,'var interfaceEnglishTranslations =');
      if (interfaceObj) Object.assign(interfaceTranslations,interfaceObj.value);
      const langs = parseObjectAfter(siteJs,'var languageTexts =');
      if (langs) Object.assign(languageTexts,langs.value);
      return true;
    } catch (error) {
      console.warn('Impossible de lire toutes les traductions :',error);
      return false;
    }
  }
  function replaceObjectDeclaration(source, marker, value) {
    const parsed = parseObjectAfter(source,marker);
    if (!parsed) return source;
    return source.slice(0,parsed.start) + JSON.stringify(value) + source.slice(parsed.end);
  }
  function mergeTranslationEdits(siteJs) {
    let out = sourceText(siteJs);
    out = replaceObjectDeclaration(out,'var fullEnglishTranslations =',translations);
    out = replaceObjectDeclaration(out,'var interfaceEnglishTranslations =',interfaceTranslations);
    out = replaceObjectDeclaration(out,'var languageTexts =',languageTexts);
    const marker = 'Object.assign(fullEnglishTranslations,';
    let position = 0;
    while ((position = out.indexOf(marker,position)) >= 0) {
      const obj = parseObjectAfter(out.slice(position),marker);
      if (!obj) break;
      let end = position + obj.end;
      while (end < out.length && /\s/.test(out[end])) end++;
      if (out[end] === ')') end++;
      if (out[end] === ';') end++;
      out = out.slice(0,position) + out.slice(end);
    }
    return out;
  }
  function sourceText(value) { return String(value == null ? '' : value); }
  function removeEditorArtifacts(text) {
    return text.replace(/\scontenteditable=(?:"[^"]*"|'[^']*')/gi,'')
      .replace(/\sdata-editor-[a-z0-9_-]+=(?:"[^"]*"|'[^']*')/gi,'')
      .replace(/\sdata-language-gate=(?:"[^"]*"|'[^']*')/gi,'');
  }
  function extractOriginalScripts(source) {
    const headEnd = source.search(/<\/head\s*>/i);
    const scripts = Array.from(source.matchAll(/<script\b[\s\S]*?<\/script\s*>/gi));
    const head = [], body = [];
    scripts.forEach(match => (headEnd >= 0 && match.index < headEnd ? head : body).push(match[0]));
    const stylesheet = (source.match(/<link\b(?=[^>]*\bhref\s*=\s*["'](?:\.\/)?styles\.css["'])[^>]*>/i) || [])[0] || '<link href="styles.css" rel="stylesheet">';
    return { head, body, stylesheet };
  }
  function restorePageAssets(html) {
    let out = String(html);
    for (const [blob,path] of blobToFilePath) out = out.split(blob).join(path);
    return out;
  }
  function normalizeConfigValuesInDom(root) {
    const values=getConfigValues();
    const pairs=Object.keys(values).map(key=>[key,String(values[key]==null?'':values[key])])
      .filter(pair=>pair[1].length>1).sort((a,b)=>b[1].length-a[1].length);
    const emptyMarkers=Object.keys(DEFAULT_CONFIG)
      .map(key=>[key,'⟦'+(FIELD_PREVIEW_LABELS[key]||key)+'⟧']);
    const replace=value=>{
      let out=String(value);
      pairs.forEach(([key,current])=>{out=out.split(current).join('[['+key+']]');});
      emptyMarkers.forEach(([key,marker])=>{out=out.split(marker).join('[['+key+']]');});
      return out;
    };
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{if(!node.parentElement.closest('script,style'))node.nodeValue=replace(node.nodeValue);});
    $$('*',root).forEach(el=>Array.from(el.attributes).forEach(attr=>{
      if(!/^data-|^on/i.test(attr.name))el.setAttribute(attr.name,replace(attr.value));
    }));
  }
  function syncTranslationsFromDoc(doc) {
    $$('[data-editor-original-text]',doc).forEach(el => {
      const after = (el.textContent || '').trim();
      el.setAttribute('data-editor-original-text',after);
    });
  }
  function trackTranslation(task) {
    const tracked=Promise.resolve(task);pendingTranslationTasks.add(tracked);
    tracked.then(()=>pendingTranslationTasks.delete(tracked),()=>pendingTranslationTasks.delete(tracked));
    return tracked;
  }
  function containsSensitiveEditorialData(text) {
    const value=String(text||'');
    if(/https?:\/\/|www\.|mailto:|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value))return true;
    if(/(?:^|\D)\+?\d(?:[\s().-]*\d){7,}(?:\D|$)/.test(value))return true;
    if(/\b-?\d{1,2}(?:[.,]\d+)\s*[,;]\s*-?\d{1,3}(?:[.,]\d+)\b/.test(value))return true;
    if(/\b\d{1,4}\s+(?:rue|avenue|av\.|boulevard|bd\.|chemin|route|impasse|place|allée|allee)\b/i.test(value))return true;
    const keys=['ADRESSE_LOGEMENT','NOM_HOTES','NOM_CONCIERGERIE','TELEPHONE_CONCIERGERIE','EMAIL_HOTES','EMAIL_CONCIERGERIE','NOM_RESEAU_WIFI','MOT_DE_PASSE_WIFI','TELEPHONE_CENTRE_MEDICAL'];
    const lower=value.toLocaleLowerCase();
    return keys.some(key=>{const privateValue=String(config[key]||'').trim().toLocaleLowerCase();return privateValue.length>2&&lower.includes(privateValue);});
  }
  function utf8Length(text) { return new TextEncoder().encode(String(text)).length; }
  function splitTranslationText(text,maxBytes) {
    const chunks=[];let current='';
    String(text).trim().split(/\s+/u).forEach(word=>{
      let remaining=word;
      while(utf8Length(remaining)>maxBytes){
        let part='';
        for(const character of Array.from(remaining)){
          if(utf8Length(part+character)>maxBytes)break;
          part+=character;
        }
        if(!part)break;
        if(current.trim()){chunks.push(current.trim());current='';}
        chunks.push(part);remaining=remaining.slice(part.length);
      }
      if(!remaining)return;
      const next=current?current+' '+remaining:remaining;
      if(utf8Length(next)>maxBytes){if(current.trim())chunks.push(current.trim());current=remaining;}
      else current=next;
    });
    if(current.trim())chunks.push(current.trim());
    return chunks;
  }
  function decodeTranslationEntities(value) {
    const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
    return String(value||'').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(all,entity)=>{
      if(entity[0]==='#'){
        const number=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);
        return Number.isFinite(number)?String.fromCodePoint(number):all;
      }
      return named[entity.toLowerCase()]||all;
    });
  }
  async function translateMyMemoryPart(text) {
    const clean=String(text||'').trim();if(!clean)return '';
    if(translationCache.has(clean))return translationCache.get(clean);
    if(translationPending.has(clean))return translationPending.get(clean);
    const request=(async()=>{
      const url=new URL('https://api.mymemory.translated.net/get');
      url.searchParams.set('q',clean);url.searchParams.set('langpair','fr|en');
      const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),20000);
      try{
        const response=await fetch(url.toString(),{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal});
        if(!response.ok)throw new Error('Service de traduction indisponible (HTTP '+response.status+').');
        const payload=await response.json();
        if(payload.quotaFinished)throw new Error('Quota quotidien gratuit MyMemory atteint. Réessaie demain ou saisis la traduction dans l’onglet Anglais.');
        if(payload.responseStatus!==200||!payload.responseData||!payload.responseData.translatedText)throw new Error(payload.responseDetails||'La traduction automatique n’a pas abouti.');
        return decodeTranslationEntities(payload.responseData.translatedText);
      }catch(error){if(error.name==='AbortError')throw new Error('Le service de traduction ne répond pas. Vérifie la connexion et réessaie.');throw error;}
      finally{window.clearTimeout(timeout);}
    })();
    translationPending.set(clean,request);
    try{const value=await request;translationCache.set(clean,value);return value;}
    finally{translationPending.delete(clean);}
  }
  async function translateEditorialText(text) {
    const paragraphs=String(text||'').split(/(\n+)/g);const translated=[];
    for(const paragraph of paragraphs){
      if(/^\n+$/.test(paragraph)){translated.push(paragraph);continue;}
      const pieces=splitTranslationText(paragraph,450);const line=[];
      for(const piece of pieces){if(!translationConsent.checked)throw new Error('Consentement désactivé : la traduction a été arrêtée.');line.push(await translateMyMemoryPart(piece));}
      translated.push(line.join(' '));
    }
    return translated.join('').trim();
  }
  async function translateEditedText(text) {
    const french=String(text||'').trim();if(!french)return;
    if(manualTranslationOverrides.has(french))return;
    if(Object.prototype.hasOwnProperty.call(translations,french)&&String(translations[french]||'').trim())return;
    if(!translationConsent.checked){untranslatedEditedTexts.add(french);setStatus(translationStatus,'Texte gardé localement. Coche la case dans l’onglet Anglais pour autoriser sa traduction.','');return;}
    untranslatedEditedTexts.delete(french);
    if(containsSensitiveEditorialData(french)){setStatus(translationStatus,'Cette phrase semble contenir une coordonnée, un lien ou une donnée privée : elle n’a pas été envoyée. Traduis-la manuellement dans l’onglet Anglais.','error');return;}
    if(!Object.prototype.hasOwnProperty.call(translations,french))translations[french]='';
    const version=(translationRequestVersions.get(french)||0)+1;translationRequestVersions.set(french,version);
    setStatus(translationStatus,'Traduction anglaise en cours…','');
    try{
      const english=await translateEditorialText(french);
      if(translationRequestVersions.get(french)!==version||manualTranslationOverrides.has(french))return;
      translations[french]=english;renderTranslationList();
      if(previewFrame.contentWindow)previewFrame.contentWindow.postMessage({type:'ecrin-editor-translation-updated',french,english},'*');
      setStatus(translationStatus,'Traduction anglaise ajoutée. Vérifie-la dans l’onglet Anglais.','success');
    }catch(error){
      if(translationRequestVersions.get(french)===version)setStatus(translationStatus,error.message||'La traduction automatique a échoué.','error');
    }
  }
  const NEWS_ENGLISH_FIELDS={TITRE_ACTUALITE_FR:'TITRE_ACTUALITE_EN',TEXTE_ACTUALITE_FR:'TEXTE_ACTUALITE_EN',ALT_PHOTO_ACTUALITE_FR:'ALT_PHOTO_ACTUALITE_EN'};
  function scheduleNewsFieldTranslation(key,text) {
    const targetKey=NEWS_ENGLISH_FIELDS[key];if(!targetKey)return;
    if(manualNewsOverrides.has(targetKey))return;
    window.clearTimeout(newsTranslationTimers.get(targetKey));
    const version=(newsTranslationVersions.get(targetKey)||0)+1;newsTranslationVersions.set(targetKey,version);
    const value=String(text||'').trim();if(!value){newsTranslationTimers.delete(targetKey);return;}
    const timer=window.setTimeout(()=>{
      newsTranslationTimers.delete(targetKey);
      if(!translationConsent.checked){setStatus(translationStatus,'Actualité gardée localement. Coche la case dans l’onglet Anglais pour autoriser sa traduction.','');return;}
      if(containsSensitiveEditorialData(value)){setStatus(translationStatus,'Cette actualité contient une coordonnée, un lien ou une donnée privée : elle n’a pas été envoyée.','error');return;}
      const task=(async()=>{
        setStatus(translationStatus,'Traduction de l’actualité en cours…','');
        try{
          const english=await translateEditorialText(value);
          if(newsTranslationVersions.get(targetKey)!==version||manualNewsOverrides.has(targetKey))return;
          config[targetKey]=english;const field=$('#field-'+targetKey);if(field)field.value=english;
          setStatus(translationStatus,'Traduction de l’actualité ajoutée. Vérifie le champ anglais.','success');schedulePreviewUpdate();
        }catch(error){if(newsTranslationVersions.get(targetKey)===version)setStatus(translationStatus,error.message||'La traduction automatique a échoué.','error');}
      })();
      trackTranslation(task);
    },900);
    newsTranslationTimers.set(targetKey,timer);
  }
  function serializeCurrentPage() {
    if (!previewReady || !previewFrame.contentDocument) return '';
    const doc = previewFrame.contentDocument;
    const originalLanguage=doc.documentElement.getAttribute('data-lang')||'fr';
    const setPreviewLanguage=previewFrame.contentWindow&&previewFrame.contentWindow.__ecrinSetPreviewLanguage;
    if(originalLanguage==='en'&&typeof setPreviewLanguage==='function')setPreviewLanguage('fr',false);
    syncTranslationsFromDoc(doc);
    const pageSource = sourceFiles.get(currentPage);
    const sections = extractOriginalScripts(pageSource ? pageSource.__text || '' : '');
    const clone = doc.documentElement.cloneNode(true);
    const sourceDoc=new DOMParser().parseFromString(pageSource ? pageSource.__text || '' : '','text/html');
    const pageBody=clone.querySelector('body');
    if(pageBody&&!clone.querySelector('.language-gate')){
      sourceDoc.querySelectorAll('.language-gate').forEach(gate=>pageBody.insertBefore(gate.cloneNode(true),pageBody.firstChild));
    }
    clone.querySelectorAll('script[data-editor-preview],style[data-editor-css],style#editor-inline-css').forEach(el => el.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('[data-editor-original-text]').forEach(el => el.removeAttribute('data-editor-original-text'));
    clone.querySelectorAll('[data-editor-asset]').forEach(el => {
      const path = el.getAttribute('data-editor-asset');
      if (path) el.setAttribute('src',path);
      el.removeAttribute('data-editor-asset');
    });
    clone.querySelectorAll('[data-editor-link]').forEach(el => el.removeAttribute('data-editor-link'));
    Array.from(clone.attributes).filter(attr=>attr.name.startsWith('data-editor-')).forEach(attr=>clone.removeAttribute(attr.name));
    clone.querySelectorAll('*').forEach(el=>Array.from(el.attributes).filter(attr=>attr.name.startsWith('data-editor-')).forEach(attr=>el.removeAttribute(attr.name)));
    clone.removeAttribute('data-lang');clone.removeAttribute('data-language-gate');clone.removeAttribute('data-season');clone.removeAttribute('data-mode');
    clone.style.removeProperty('--site-bg');clone.style.removeProperty('--hero-image');if(!clone.getAttribute('style'))clone.removeAttribute('style');
    normalizeConfigValuesInDom(clone);
    let html = '<!DOCTYPE html>\n' + clone.outerHTML;
    html = restorePageAssets(html);
    html = html.replace(/<link\b[^>]*href=(?:"|')styles\.css(?:"|')[^>]*>/i,'');
    html = html.replace(/<\/head\s*>/i, sections.head.join('\n') + '\n' + sections.stylesheet + '\n</head>');
    html = html.replace(/<\/body\s*>/i, sections.body.join('\n') + '\n</body>');
    if(originalLanguage==='en'&&typeof setPreviewLanguage==='function')setPreviewLanguage('en',false);
    return html;
  }
  function saveCurrentPage() {
    if (!previewReady) return;
    const html = serializeCurrentPage();
    if (html) editedPages.set(currentPage,html);
  }
  function schedulePreviewUpdate() {
    if(previewReady)saveCurrentPage();
    window.clearTimeout(previewUpdateTimer);
    previewUpdateTimer=window.setTimeout(()=>renderPreview(currentPage),450);
  }
  function previewBootstrap(pageName) {
    const root=document.documentElement;
    root.setAttribute('data-language-gate','done');
    const translationMap=JSON.parse(root.getAttribute('data-editor-translations')||'{}');
    const interfaceMap=JSON.parse(root.getAttribute('data-editor-interface-translations')||'{}');
    const seasonPhotos=JSON.parse(root.getAttribute('data-editor-season-photos')||'{}');
    const frenchText=new WeakMap(),frenchAttrs=new WeakMap();
    let activeLanguage='fr',activeSeason='winter',photoIndex={winter:0,spring:0,summer:0,autumn:0};
    const selector='h1,h2,h3,h4,h5,p,li,dt,dd,figcaption,button,a,label,summary,legend,small,strong,em,span';
    document.querySelectorAll(selector).forEach(el=>{
      if(el.closest('svg,script,style,canvas,.nav-controls'))return;
      if(!(el.textContent||'').trim())return;
      el.setAttribute('contenteditable',root.getAttribute('data-editor-link-test')==='true'?'false':'true');
      el.setAttribute('data-editor-original-text',(el.textContent||'').trim());
      el.setAttribute('data-editor-source-text',(el.textContent||'').trim());
      el.setAttribute('spellcheck','true');
    });
    function eachTextNode(callback){
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
      while((node=walker.nextNode())){if(node.parentElement&&!node.parentElement.closest('svg,script,style,canvas,.nav-controls'))callback(node);}
    }
    function normalized(value){return String(value||'').replace(/\s+/g,' ').trim();}
    function setLanguage(language,notify){
      activeLanguage=language==='en'?'en':'fr';root.setAttribute('data-lang',activeLanguage);document.documentElement.lang=activeLanguage;
      eachTextNode(node=>{
        if(!frenchText.has(node))frenchText.set(node,node.nodeValue);
        const raw=frenchText.get(node),key=normalized(raw);if(!key)return;
        const translated=translationMap[key]||interfaceMap[key]||key;
        const lead=raw.match(/^\s*/)[0],trail=raw.match(/\s*$/)[0];
        node.nodeValue=activeLanguage==='en'?lead+translated+trail:raw;
      });
      document.querySelectorAll('[aria-label],[placeholder],[title],[alt]').forEach(el=>{
        let saved=frenchAttrs.get(el);if(!saved){saved={};frenchAttrs.set(el,saved);}
        ['aria-label','placeholder','title','alt'].forEach(attr=>{
          if(!el.hasAttribute(attr))return;if(saved[attr]===undefined)saved[attr]=el.getAttribute(attr);
          const key=saved[attr];el.setAttribute(attr,activeLanguage==='en'?(interfaceMap[key]||translationMap[key]||key):key);
        });
      });
      const editingDisabled=activeLanguage==='en'||root.getAttribute('data-editor-link-test')==='true';
      document.querySelectorAll('[data-editor-original-text]').forEach(el=>el.setAttribute('contenteditable',editingDisabled?'false':'true'));
      document.querySelectorAll('[data-lang-btn]').forEach(btn=>btn.setAttribute('aria-pressed',btn.getAttribute('data-lang-btn')===activeLanguage?'true':'false'));
      updateSeasonLabel();
      if(notify!==false)parent.postMessage({type:'ecrin-editor-preview-language',lang:activeLanguage},'*');
    }
    function updateSeasonLabel(){
      const label=document.getElementById('season-label');if(!label)return;
      const labels=activeLanguage==='en'?{winter:'Winter',spring:'Spring',summer:'Summer',autumn:'Autumn'}:{winter:'Hiver',spring:'Printemps',summer:'Été',autumn:'Automne'};
      label.textContent='· '+(labels[activeSeason]||labels.winter);
    }
    function updatePhotoIndicator(){
      const indicator=document.getElementById('photo-indicator');if(!indicator)return;
      const list=seasonPhotos[activeSeason]||[];indicator.textContent=(activeLanguage==='en'?'Landscape ':'Paysage ')+(photoIndex[activeSeason]+1)+' / '+Math.max(1,list.length);
    }
    function applySeason(season){
      if(!seasonPhotos[season]||!seasonPhotos[season].length)return;
      activeSeason=season;root.setAttribute('data-season',season);root.setAttribute('data-mode',season==='winter'?'winter':'summer');
      const list=seasonPhotos[season],url=list[photoIndex[season]%list.length];
      root.style.setProperty('--site-bg','url("'+url+'")');root.style.setProperty('--hero-image','url("'+url+'")');
      document.querySelectorAll('[data-season-btn]').forEach(btn=>btn.setAttribute('aria-pressed',btn.getAttribute('data-season-btn')===season?'true':'false'));
      updateSeasonLabel();updatePhotoIndicator();
    }
    document.querySelectorAll('[data-season-btn]').forEach(btn=>btn.addEventListener('click',()=>{activeSeason=btn.getAttribute('data-season-btn');photoIndex[activeSeason]=0;applySeason(activeSeason);}));
    function movePhoto(delta){const list=seasonPhotos[activeSeason]||[];if(!list.length)return;photoIndex[activeSeason]=(photoIndex[activeSeason]+delta+list.length)%list.length;applySeason(activeSeason);}
    document.querySelectorAll('[data-photo-prev]').forEach(btn=>btn.addEventListener('click',()=>movePhoto(-1)));
    document.querySelectorAll('[data-photo-next]').forEach(btn=>btn.addEventListener('click',()=>movePhoto(1)));
    function selectApplianceTab(tab,focus){
      document.querySelectorAll('.tab[role="tab"]').forEach(button=>{
        const active=button===tab;button.setAttribute('aria-selected',active?'true':'false');button.tabIndex=active?0:-1;
        const panel=document.getElementById(button.getAttribute('aria-controls'));if(panel)panel.hidden=!active;
      });
      if(focus&&tab)tab.focus();
    }
    document.addEventListener('click',event=>{
      const tab=event.target.closest&&event.target.closest('.tab[role="tab"]');
      if(tab&&tab.closest('[role="tablist"]'))selectApplianceTab(tab,false);
    });
    document.addEventListener('keydown',event=>{
      const tab=event.target.closest&&event.target.closest('.tab[role="tab"]');if(!tab||!tab.closest('[role="tablist"]'))return;
      const visible=Array.from(document.querySelectorAll('.tab[role="tab"]')).filter(button=>button.offsetParent!==null),index=visible.indexOf(tab);if(!visible.length)return;
      let next=-1;if(event.key==='ArrowRight'||event.key==='ArrowDown')next=(index+1)%visible.length;else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=(index-1+visible.length)%visible.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=visible.length-1;
      if(next>-1){event.preventDefault();selectApplianceTab(visible[next],true);}
    });
    const now=new Date(),md=(now.getMonth()+1)*100+now.getDate();
    activeSeason=md>=1221||md<=319?'winter':md<=620?'spring':md<=921?'summer':'autumn';
    if(!seasonPhotos[activeSeason]||!seasonPhotos[activeSeason].length)activeSeason='winter';
    applySeason(activeSeason);
    document.querySelectorAll('[data-lang-btn]').forEach(btn=>btn.addEventListener('click',()=>setLanguage(btn.getAttribute('data-lang-btn'),true)));
    setLanguage(root.getAttribute('data-editor-preview-lang')||'fr',false);
    document.addEventListener('focusout',event=>{
      if(activeLanguage!=='fr')return;
      const editable=event.target&&event.target.closest?event.target.closest('[contenteditable="true"]'):null;if(!editable)return;
      const current=(editable.textContent||'').trim(),before=editable.getAttribute('data-editor-source-text')||'';
      if(!current||current===before)return;
      const walker=document.createTreeWalker(editable,NodeFilter.SHOW_TEXT);let node;
      while((node=walker.nextNode())){const phrase=normalized(node.nodeValue);if(phrase)parent.postMessage({type:'ecrin-editor-translate-text',text:phrase},'*');}
      editable.setAttribute('data-editor-source-text',current);
    },true);
    const previewBase=new URL(root.getAttribute('data-editor-page')||'index.html','https://ecrin-preview.invalid/');
    document.querySelectorAll('a[href]').forEach(link=>{
      try{const destination=new URL((link.getAttribute('href')||'').trim(),previewBase);if((destination.protocol==='http:'||destination.protocol==='https:')&&destination.origin!==previewBase.origin){link.setAttribute('target','_blank');link.setAttribute('rel','noopener noreferrer');}}catch(e){}
    });
    document.querySelectorAll('a[href]').forEach(link=>link.addEventListener('click',event=>{
      if(root.getAttribute('data-editor-link-test')!=='true'){event.preventDefault();return;}
      const href=(link.getAttribute('href')||'').trim();if(!href||href==='#'){event.preventDefault();return;}
      const pageName=root.getAttribute('data-editor-page')||'index.html';
      let base;try{base=new URL(pageName,'https://ecrin-preview.invalid/');}catch(e){event.preventDefault();return;}
      let url;try{url=new URL(href,base);}catch(e){event.preventDefault();return;}
      if((url.protocol==='http:'||url.protocol==='https:')&&url.origin!==base.origin){
        event.preventDefault();link.setAttribute('target','_blank');link.setAttribute('rel','noopener noreferrer');
        const opened=window.open(url.href,'_blank');if(opened)opened.opener=null;else window.location.assign(url.href);return;
      }
      if(url.protocol==='mailto:'||url.protocol==='tel:')return;
      const target=(url.pathname.split('/').pop()||'').toLowerCase();
      if(['index.html','logement.html','station.html'].includes(target)){
        event.preventDefault();let anchor='';try{anchor=decodeURIComponent(url.hash.slice(1));}catch(e){anchor=url.hash.slice(1);}
        parent.postMessage({type:'ecrin-editor-navigate',page:target,anchor},'*');return;
      }
      if(url.hash&&url.pathname===base.pathname)return;
      event.preventDefault();
    }));
    window.addEventListener('message',event=>{
      if(event.source!==parent||!event.data)return;
      if(event.data.type==='ecrin-editor-set-link-test'){
        root.setAttribute('data-editor-link-test',event.data.enabled?'true':'false');
        const editingDisabled=activeLanguage==='en'||event.data.enabled===true;
        document.querySelectorAll('[data-editor-original-text]').forEach(el=>el.setAttribute('contenteditable',editingDisabled?'false':'true'));
      } else if(event.data.type==='ecrin-editor-translation-updated'){
        translationMap[event.data.french]=event.data.english;
        if(activeLanguage==='en')setLanguage('en',false);
      } else if(event.data.type==='ecrin-editor-set-language')setLanguage(event.data.lang,false);
    });
    document.addEventListener('submit',event=>event.preventDefault(),true);
    const style=document.createElement('style');style.setAttribute('data-editor-css','');
    style.textContent='[contenteditable="true"]{outline:1px dashed transparent;outline-offset:2px;cursor:text}[contenteditable="true"]:hover,[contenteditable="true"]:focus{outline-color:#c4a76c;background:rgba(196,167,108,.08)}';
    document.head.appendChild(style);
    document.body.addEventListener('input',()=>{
      if(activeLanguage==='fr')eachTextNode(node=>frenchText.set(node,node.nodeValue));
      parent.postMessage({type:'ecrin-editor-input'},'*');
    });
    window.__ecrinSetPreviewLanguage=setLanguage;
  }
  async function renderPreview(pageName) {
    if (!sourceFiles.has(pageName)) return;
    currentPage = pageName;
    pageSelect.value = pageName;
    previewReady = false;
    const originalFile = sourceFiles.get(pageName);
    if (!originalFile.__text) originalFile.__text = await originalFile.text();
    let html = editedPages.get(pageName) || originalFile.__text;
    html = replaceTokens(html,getPreviewValues(),false);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html,'text/html');
    doc.documentElement.setAttribute('data-editor-page',pageName);
    doc.documentElement.setAttribute('data-editor-link-test',String(linkTestMode));
    doc.documentElement.setAttribute('data-editor-preview-lang',previewLanguage);
    const seasonUrls={};Object.keys(SEASON_PHOTOS).forEach(season=>{seasonUrls[season]=SEASON_PHOTOS[season].map(path=>resolveAssetPath(path)).filter(Boolean).map(path=>getImageUrl(path)).filter(Boolean);});
    doc.documentElement.setAttribute('data-editor-season-photos',JSON.stringify(seasonUrls));
    doc.documentElement.setAttribute('data-editor-translations',JSON.stringify(translations));
    doc.documentElement.setAttribute('data-editor-interface-translations',JSON.stringify(interfaceTranslations));
    doc.querySelectorAll('script').forEach(el => el.remove());
    doc.querySelectorAll('.language-gate').forEach(el => el.remove());
    doc.querySelectorAll('link[href*="fonts.googleapis.com"],link[href*="fonts.gstatic.com"]').forEach(el => el.remove());
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
      const href = normalizePath(el.getAttribute('href'));
      if (href === 'styles.css' || href.endsWith('/styles.css')) el.remove();
    });
    let css = sourceFiles.has('styles.css') ? await sourceFiles.get('styles.css').text() : '';
    css = replaceTokens(css,getConfigValues(),false);
    css = css.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi,(all,quote,path) => {
      const asset = resolveAssetPath(path);
      return asset ? 'url("' + getImageUrl(asset) + '")' : all;
    });
    const style = doc.createElement('style');
    style.id = 'editor-inline-css';
    style.textContent = css;
    doc.head.appendChild(style);
    $$('#preview-frame-placeholder').forEach(x => x.remove());
    doc.querySelectorAll('img[src],source[src]').forEach(el => {
      const asset = resolveAssetPath(el.getAttribute('src'));
      if (!asset) return;
      el.setAttribute('data-editor-asset',asset);
      el.setAttribute('src',getImageUrl(asset));
      if (el.tagName.toLowerCase() === 'img' && Object.prototype.hasOwnProperty.call(imageAlts,asset)) el.setAttribute('alt',replaceTokenValues(imageAlts[asset],getPreviewValues()));
    });
    const bootstrap = doc.createElement('script');
    bootstrap.setAttribute('data-editor-preview','');
    bootstrap.textContent = '(' + previewBootstrap.toString() + ')(' + JSON.stringify(pageName) + ');';
    doc.body.appendChild(bootstrap);
    previewFrame.onload = function () {
      previewReady = true;
      const frameDoc = previewFrame.contentDocument;
      if (frameDoc) frameDoc.addEventListener('input',function () { window.setTimeout(renderLinks,120); });
      document.dispatchEvent(new CustomEvent('ecrin-preview-ready',{detail:{page:pageName,document:frameDoc}}));
      if(frameDoc&&pendingPreviewAnchor){const anchor=pendingPreviewAnchor;pendingPreviewAnchor='';window.setTimeout(()=>{const target=frameDoc.getElementById(anchor);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});},80);}
      renderLinks();
    };
    previewFrame.srcdoc = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }
  function buildConfigFields() {
    const host = $('#config-fields');
    host.replaceChildren();
    FIELD_GROUPS.forEach(group => {
      const section = document.createElement('section'); section.className = 'field-group';
      const heading = document.createElement('h4'); heading.textContent = group.title; section.appendChild(heading);
      group.fields.forEach(([key,label,type]) => {
        const row = document.createElement('div'); row.className = 'field-row';
        const id = 'field-' + key;
        const lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = label; row.appendChild(lab);
        const input = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
        if (type !== 'textarea') input.type = type;
        input.id = id; input.dataset.key = key; input.value = config[key] == null ? '' : String(config[key]);
        input.autocomplete = 'off';
        input.addEventListener('input',function () {
          config[key] = input.value;
          if(Object.prototype.hasOwnProperty.call(NEWS_ENGLISH_FIELDS,key)){
            editedNewsFields.add(key);scheduleNewsFieldTranslation(key,input.value);
          } else {
            const frenchKey=Object.keys(NEWS_ENGLISH_FIELDS).find(sourceKey=>NEWS_ENGLISH_FIELDS[sourceKey]===key);
            if(frenchKey&&!input.dataset.autoTranslation){
              manualNewsOverrides.add(key);window.clearTimeout(newsTranslationTimers.get(key));
              newsTranslationVersions.set(key,(newsTranslationVersions.get(key)||0)+1);
            }
          }
        });
        input.addEventListener('change',function () {
          config[key] = input.value;
          schedulePreviewUpdate();
        });
        row.appendChild(input); section.appendChild(row);
      });
      host.appendChild(section);
    });
  }
  function getVisibleLinkText(el) {
    return ((el.innerText || el.textContent || '').replace(/\s+/g,' ').trim()).slice(0,100) || (el.tagName === 'FORM' ? 'Formulaire' : 'Lien sans texte');
  }
  function validLink(value) {
    const v = String(value || '').trim();
    if (!v || v === '#') return true;
    if (/^(javascript|data|file|blob):/i.test(v) || v.startsWith('//')) return false;
    return /^(https?:|mailto:|tel:|sms:|#|\.\.?\/|[a-z0-9_-]+\.html(?:#.*)?$)/i.test(v) || !/^[a-z][a-z0-9+.-]*:/i.test(v);
  }
  function renderLinks() {
    const host = $('#links-list');
    if (!previewReady || !previewFrame.contentDocument) return;
    const doc = previewFrame.contentDocument;
    const elements = [...$$('a[href]',doc), ...$$('form[action]',doc)];
    host.replaceChildren();
    if (!elements.length) { const p=document.createElement('p'); p.className='empty-state'; p.textContent='Aucun lien à modifier sur cette page.'; host.appendChild(p); return; }
    elements.forEach((el,index) => {
      const row=document.createElement('div'); row.className='link-row';
      const label=document.createElement('label');
      const type=document.createElement('span'); type.className='link-type'; type.textContent=el.tagName==='FORM'?'FORMULAIRE':'LIEN';
      label.appendChild(document.createTextNode(getVisibleLinkText(el) + ' ')); label.appendChild(type); row.appendChild(label);
      const input=document.createElement('input'); input.type='text'; input.value=el.tagName==='FORM'?(el.getAttribute('action')||'#'):(el.getAttribute('href')||'');
      input.setAttribute('aria-label','Destination de '+getVisibleLinkText(el)); input.placeholder='https://… ou mailto:…';
      input.addEventListener('change',function(){
        if (!validLink(input.value)) { input.setCustomValidity('Adresse refusée : javascript:, data:, file: et blob: ne sont pas autorisés.'); input.reportValidity(); return; }
        input.setCustomValidity('');
        const destination=input.value.trim()||'#';el.setAttribute(el.tagName==='FORM'?'action':'href',destination);
        if(el.tagName==='A'){
          try{const base=new URL(currentPage,'https://ecrin-preview.invalid/'),url=new URL(destination,base);if((url.protocol==='http:'||url.protocol==='https:')&&url.origin!==base.origin){el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer');}else{el.removeAttribute('target');el.removeAttribute('rel');}}catch(e){el.removeAttribute('target');el.removeAttribute('rel');}
        }
        saveCurrentPage();
      });
      row.appendChild(input); host.appendChild(row);
    });
  }
  function isImagePath(path) { return IMAGE_EXTS.has(fileExtension(path)); }
  function renderImages() {
    const host=$('#images-list'); const query=($('#image-search').value||'').toLowerCase().trim();
    host.replaceChildren();
    const paths=Array.from(sourceFiles.keys()).filter(p=>isImagePath(p)).sort((a,b)=>a.localeCompare(b,'fr'));
    const visible=paths.filter(p=>!query||p.toLowerCase().includes(query));
    if(!visible.length){const p=document.createElement('p');p.className='empty-state';p.textContent='Aucune image ne correspond à la recherche.';host.appendChild(p);return;}
    visible.forEach(path=>{
      const card=document.createElement('div');card.className='image-card';
      const preview=document.createElement('img');preview.src=getImageUrl(path);preview.alt='Aperçu de '+path;preview.loading='lazy';card.appendChild(preview);
      const meta=document.createElement('div');meta.className='image-meta';
      const name=document.createElement('span');name.className='image-name';name.textContent=path;meta.appendChild(name);
      const replace=document.createElement('button');replace.type='button';replace.className='button secondary';replace.textContent='Remplacer cette image';replace.addEventListener('click',()=>{pendingImagePath=path;imageInput.accept=fileExtension(path)==='.svg'?'.svg,image/svg+xml':fileExtension(path);imageInput.value='';imageInput.click();});meta.appendChild(replace);
      const alt=document.createElement('input');alt.type='text';alt.value=imageAlts[path]||'';alt.placeholder='Texte alternatif (facultatif)';alt.setAttribute('aria-label','Texte alternatif de '+path);
      alt.addEventListener('input',()=>{imageAlts[path]=alt.value;});
      alt.addEventListener('change',()=>{applyAltToCurrentFrame(path,alt.value);saveCurrentPage();});
      meta.appendChild(alt);card.appendChild(meta);host.appendChild(card);
    });
  }
  function applyAltToCurrentFrame(path,value) {
    const doc=previewFrame.contentDocument;if(!doc)return;
    $$('[data-editor-asset]',doc).forEach(img=>{if(img.getAttribute('data-editor-asset')===path)img.setAttribute('alt',value);});
  }
  async function convertReplacement(file,path) {
    const ext=fileExtension(path); const originalName=normalizePath(path).split('/').pop();
    if(file.size>40*1024*1024) throw new Error('Cette image dépasse 40 Mo. Choisis un fichier plus léger.');
    if(ext==='.svg') {
      if(fileExtension(file.name)!=='.svg' && file.type!=='image/svg+xml') throw new Error('Pour ce visuel, sélectionne un fichier SVG.');
      return new File([file],originalName,{type:'image/svg+xml'});
    }
    if(ext==='.gif') {
      if(fileExtension(file.name)!=='.gif') throw new Error('Pour ce visuel, sélectionne un fichier GIF.');
      return new File([file],originalName,{type:'image/gif'});
    }
    const mime={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.ico':'image/png'}[ext];
    if(!mime) throw new Error('Format d’image non pris en charge.');
    if(file.type===mime) return new File([file],originalName,{type:mime});
    let bitmap;
    try { bitmap=await createImageBitmap(file); } catch(e) { throw new Error('Le navigateur ne peut pas lire cette image.'); }
    const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext('2d');
    if(ext==='.jpg'||ext==='.jpeg'){context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);}
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,0.9));
    if(!blob) throw new Error('La conversion de cette image a échoué.');
    return new File([blob],originalName,{type:mime});
  }
  async function handleImageReplacement() {
    const file=imageInput.files && imageInput.files[0];if(!file||!pendingImagePath)return;
    try {
      saveCurrentPage();
      const replacement=await convertReplacement(file,pendingImagePath);
      sourceFiles.set(pendingImagePath,replacement);
      getImageUrl(pendingImagePath);
      const url=URL.createObjectURL(replacement);imageUrls.set(pendingImagePath,url);blobToFilePath.set(url,pendingImagePath);
      renderImages();
      await renderPreview(currentPage);
      setStatus(exportStatus,'Image remplacée : '+pendingImagePath,'success');
    } catch(error) { setStatus(exportStatus,error.message,'error'); }
    finally { pendingImagePath='';imageInput.value=''; }
  }
  function photoLabel(filename) {
    const label=String(filename||'').replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
    return label ? label.charAt(0).toLocaleUpperCase('fr')+label.slice(1) : 'Nouvelle photo';
  }
  function newGalleryImagePath(file,reserved) {
    const ext=fileExtension(file.name);
    const allowed=new Set(['.jpg','.jpeg','.png','.webp','.gif','.svg','.avif']);
    if(!allowed.has(ext))throw new Error('Format non pris en charge pour « '+file.name+' ». Utilise JPG, PNG, WebP, GIF, AVIF ou SVG.');
    const base=String(file.name).replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64)||'photo';
    let path='photos-ajoutees/'+base+ext,index=2;
    while(sourceFiles.has(path)||reserved.has(path)){path='photos-ajoutees/'+base+'-'+index+ext;index++;}
    reserved.add(path);
    return path;
  }
  async function handleGalleryImageAddition() {
    const files=Array.from(addGalleryImageInput.files||[]);
    if(!files.length)return;
    const pageName=galleryTarget.value;
    const status=$('#gallery-add-status');
    try {
      if(!['index.html','station.html'].includes(pageName)||!sourceFiles.has(pageName))throw new Error('La galerie choisie n’est pas disponible dans le dossier chargé.');
      saveCurrentPage();
      const previewLoaded=new Promise(resolve=>previewFrame.addEventListener('load',resolve,{once:true}));
      await renderPreview(pageName);
      await previewLoaded;
      const doc=previewFrame.contentDocument;
      const grid=pageName==='index.html'?doc&&doc.querySelector('#photos-appartement .photo-grid'):doc&&doc.querySelector('.photo-gallery .photo-grid');
      if(!grid)throw new Error('Aucune galerie compatible n’a été trouvée sur cette page.');
      const reserved=new Set(),prepared=[];
      for(const file of files){
        const path=newGalleryImagePath(file,reserved);
        prepared.push({path,file:await convertReplacement(file,path),alt:photoLabel(file.name)});
      }
      prepared.forEach(item=>{
        sourceFiles.set(item.path,item.file);
        const url=URL.createObjectURL(item.file);imageUrls.set(item.path,url);blobToFilePath.set(url,item.path);imageAlts[item.path]=item.alt;
        const figure=doc.createElement('figure');figure.className='photo-card';
        const image=doc.createElement('img');image.src=url;image.alt=item.alt;image.loading='lazy';image.setAttribute('data-editor-asset',item.path);
        const caption=doc.createElement('figcaption');const title=doc.createElement('strong');title.textContent=item.alt;caption.appendChild(title);
        figure.appendChild(image);figure.appendChild(caption);grid.appendChild(figure);
      });
      saveCurrentPage();
      renderImages();
      setStatus(status,prepared.length+' photo'+(prepared.length>1?'s ajoutées à la galerie.':' ajoutée à la galerie.'),'success');
    } catch(error) {
      setStatus(status,error.message||'L’ajout des photos a échoué.','error');
    } finally {
      addGalleryImageInput.value='';
    }
  }
  function extractImageAlts() {
    const saved=Object.assign(Object.create(null),imageAlts);
    imageAlts=Object.create(null);
    Object.assign(imageAlts,saved);
    ['index.html','logement.html','station.html'].forEach(page=>{
      const file=sourceFiles.get(page);if(!file||!file.__text)return;
      const doc=new DOMParser().parseFromString(file.__text,'text/html');
      $$('img[src]',doc).forEach(img=>{
        const path=resolveAssetPath(img.getAttribute('src'));
        if(path&&!Object.prototype.hasOwnProperty.call(imageAlts,path))imageAlts[path]=img.getAttribute('alt')||'';
      });
    });
  }
  function renderConfigPanel() { buildConfigFields(); }
  function renderTranslationList() {
    const host=$('#translations-list');const query=($('#translation-search').value||'').toLowerCase().trim();host.replaceChildren();translationCards=[];
    const rows=[];
    Object.keys(translations).forEach(key=>rows.push({kind:'full',key,value:translations[key]}));
    Object.keys(interfaceTranslations).forEach(key=>rows.push({kind:'interface',key,value:interfaceTranslations[key]}));
    Object.keys(languageTexts).forEach(lang=>{
      const section=languageTexts[lang];
      if(section&&typeof section==='object')Object.keys(section).forEach(key=>rows.push({kind:'language',lang,key,value:section[key]}));
    });
    rows.sort((a,b)=>(a.kind+a.key).localeCompare(b.kind+b.key,'fr'));
    const matches=rows.filter(row=>!query||(row.key+' '+String(row.value)+' '+row.kind+' '+(row.lang||'')).toLowerCase().includes(query));
    if(!matches.length){const p=document.createElement('p');p.className='empty-state';p.textContent='Aucune traduction trouvée.';host.appendChild(p);return;}
    matches.forEach(row=>{
      const card=document.createElement('div');card.className='translation-card';
      const kind=document.createElement('span');kind.className='link-type';kind.textContent=row.kind==='full'?'PAGE':row.kind==='interface'?'INTERFACE':'INTERFACE '+String(row.lang).toUpperCase();card.appendChild(kind);
      let keyInput=null;
      if(row.kind==='full'){
        const keyLabel=document.createElement('label');keyLabel.className='translation-key';keyLabel.textContent='Texte français';keyInput=document.createElement('textarea');keyInput.value=row.key;keyInput.setAttribute('aria-label','Texte source en français');keyLabel.appendChild(keyInput);card.appendChild(keyLabel);
      } else {
        const keyLabel=document.createElement('span');keyLabel.className='translation-key';keyLabel.textContent=row.key;card.appendChild(keyLabel);
      }
      const valueLabel=document.createElement('label');valueLabel.className='translation-key';valueLabel.textContent=row.kind==='language'?'Traduction':'Texte anglais';
      const valueInput=document.createElement('textarea');valueInput.value=String(row.value==null?'':row.value);valueInput.setAttribute('aria-label','Traduction anglaise de '+row.key);valueLabel.appendChild(valueInput);card.appendChild(valueLabel);
      if(row.kind==='full'){
        keyInput.addEventListener('change',()=>{
          const next=keyInput.value; if(next!==row.key){const previous=row.key;const current=translations[previous];delete translations[previous];translations[next]=valueInput.value||current||'';manualTranslationOverrides.delete(previous);manualTranslationOverrides.add(next);translationRequestVersions.set(previous,(translationRequestVersions.get(previous)||0)+1);row.key=next;}
        });
        valueInput.addEventListener('input',()=>{
          const key=keyInput.value;translations[key]=valueInput.value;manualTranslationOverrides.add(key);
          translationRequestVersions.set(key,(translationRequestVersions.get(key)||0)+1);
          if(previewFrame.contentWindow)previewFrame.contentWindow.postMessage({type:'ecrin-editor-translation-updated',french:key,english:valueInput.value},'*');
        });
      } else if(row.kind==='interface') {
        valueInput.addEventListener('input',()=>{interfaceTranslations[row.key]=valueInput.value;});
      } else {
        valueInput.addEventListener('input',()=>{languageTexts[row.lang][row.key]=valueInput.value;});
      }
      host.appendChild(card);translationCards.push({card,row});
    });
  }
  function listenForPreviewMessages() {
    window.addEventListener('message',event=>{
      if(event.source!==previewFrame.contentWindow||!event.data)return;
      const data=event.data;
      if(data.type==='ecrin-editor-input'){
        if(previewFrame.contentDocument)syncTranslationsFromDoc(previewFrame.contentDocument);
        window.setTimeout(renderLinks,120);
      } else if(data.type==='ecrin-editor-preview-language'){
        previewLanguage=data.lang==='en'?'en':'fr';
        document.dispatchEvent(new CustomEvent('ecrin-preview-language-change',{detail:{lang:previewLanguage}}));
      } else if(data.type==='ecrin-editor-translate-text'){
        trackTranslation(translateEditedText(data.text));
      } else if(data.type==='ecrin-editor-navigate'){
        if(!['index.html','logement.html','station.html'].includes(data.page)||!sourceFiles.has(data.page))return;
        saveCurrentPage();pendingPreviewAnchor=data.anchor||'';renderPreview(data.page);
      }
    });
  }
  document.addEventListener('ecrin-content-change',function(event){
    if(!previewReady)return;
    const pairs=event.detail&&Array.isArray(event.detail.translations)?event.detail.translations:[];
    pairs.forEach(pair=>{
      const french=String(pair&&pair.fr||'').trim(),english=String(pair&&pair.en||'').trim();
      if(!french)return;
      if(english){translations[french]=english;manualTranslationOverrides.add(french);translationRequestVersions.set(french,(translationRequestVersions.get(french)||0)+1);if(previewFrame.contentWindow)previewFrame.contentWindow.postMessage({type:'ecrin-editor-translation-updated',french,english},'*');}
      else trackTranslation(translateEditedText(french));
    });
    saveCurrentPage();renderLinks();renderTranslationList();
  });
  async function loadFolder(fileList) {
    const list=Array.from(fileList||[]);
    if(!list.length){setStatus(importStatus,'Aucun fichier sélectionné.','error');return;}
    newsTranslationTimers.forEach(timer=>window.clearTimeout(timer));newsTranslationTimers.clear();
    translationRequestVersions.forEach((version,key)=>translationRequestVersions.set(key,version+1));
    newsTranslationVersions.forEach((version,key)=>newsTranslationVersions.set(key,version+1));
    untranslatedEditedTexts.clear();manualTranslationOverrides.clear();manualNewsOverrides.clear();editedNewsFields.clear();
    translationConsent.checked=false;linkTestMode=false;previewLanguage='fr';pendingPreviewAnchor='';
    const linkButton=$('#link-test-toggle');linkButton.setAttribute('aria-pressed','false');linkButton.textContent='Tester les liens';
    sourceFiles=new Map();editedPages=new Map();imageUrls=new Map();blobToFilePath=new Map();previewReady=false;
    list.forEach(file=>{
      let rel=file.webkitRelativePath||file.name;
      const parts=rel.split('/');if(parts.length>1)rel=parts.slice(1).join('/');
      rel=normalizePath(rel);
      if(!safeRelativePath(rel)||rel.includes('/.'))return;
      sourceFiles.set(rel,file);
    });
    const missing=REQUIRED_CORE.filter(name=>!sourceFiles.has(name));
    if(missing.length){editorApp.hidden=true;setStatus(importStatus,'Dossier incomplet. Fichiers manquants : '+missing.join(', '),'error');return;}
    config=Object.assign({},DEFAULT_CONFIG);
    if(sourceFiles.has('configuration.json')){
      try {
        const loaded=JSON.parse(await sourceFiles.get('configuration.json').text());
        config=Object.assign({},DEFAULT_CONFIG,loaded);
        if(loaded.IMAGE_ALT_TEXTS&&typeof loaded.IMAGE_ALT_TEXTS==='object')imageAlts=Object.assign(Object.create(null),loaded.IMAGE_ALT_TEXTS);
      } catch(e) { setStatus(importStatus,'Le fichier configuration.json est illisible. Les champs repartent à blanc.','error'); }
    }
    Object.values(NEWS_ENGLISH_FIELDS).forEach(key=>{if(String(config[key]||'').trim())manualNewsOverrides.add(key);});
    await Promise.all(['index.html','logement.html','station.html','styles.css','site.js'].map(async name=>{const file=sourceFiles.get(name);if(file&&!file.__text)file.__text=await file.text();}));
    const jsFile=sourceFiles.get('site.js');if(!jsFile.__text)jsFile.__text=await jsFile.text();
    const translationsOk=loadTranslationObjects(jsFile.__text);
    extractImageAlts();renderConfigPanel();renderImages();renderTranslationList();
    $('#loaded-status').textContent='Dossier chargé · '+sourceFiles.size+' fichiers lus'+(translationsOk?'':' · traductions à vérifier');
    editorApp.hidden=false;
    setStatus(importStatus,'Modèle prêt à modifier.','success');
    await renderPreview(pageSelect.value||'index.html');
    renderLinks();
  }
  function extractScripts(source) { return extractOriginalScripts(source||''); }
  function restoreScriptsAndStyle(page,html) {
    const file=sourceFiles.get(page);const original=file?file.__text||'':'';const parts=extractScripts(original);
    let out=String(html);
    out=out.replace(/<link\b[^>]*href=(?:"|')styles\.css(?:"|')[^>]*>/i,'');
    out=out.replace(/<\/head\s*>/i,parts.head.join('\n')+'\n'+parts.stylesheet+'\n</head>');
    out=out.replace(/<\/body\s*>/i,parts.body.join('\n')+'\n</body>');
    return out;
  }
  function applyImageAltMap(html) {
    const doc=new DOMParser().parseFromString(String(html),'text/html');
    $$('img[src]',doc).forEach(img=>{
      const path=resolveAssetPath(img.getAttribute('src'));
      if(path&&Object.prototype.hasOwnProperty.call(imageAlts,path))img.setAttribute('alt',imageAlts[path]);
    });
    return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
  }
  function processHtmlForExport(page,html) {
    let out=replaceTokens(html,getConfigValues(),false);
    out=out.replace(/https:\/\/[a-z0-9.-]+\/f\/[A-Za-z0-9]+/gi,'#');
    const doc=new DOMParser().parseFromString(out,'text/html');
    doc.querySelectorAll('link[href*="fonts.googleapis.com"],link[href*="fonts.gstatic.com"]').forEach(link=>link.remove());
    const review=doc.getElementById('review-form');if(review&&config.URL_FORMULAIRE_AVIS)review.setAttribute('action',config.URL_FORMULAIRE_AVIS);
    const issue=doc.getElementById('issue-form');if(issue&&config.URL_FORMULAIRE_SIGNALEMENT)issue.setAttribute('action',config.URL_FORMULAIRE_SIGNALEMENT);
    $$('img[src]',doc).forEach(img=>{
      const path=resolveAssetPath(img.getAttribute('src'));
      if(path&&Object.prototype.hasOwnProperty.call(imageAlts,path))img.setAttribute('alt',replaceTokenValues(imageAlts[path],getConfigValues()));
    });
    return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
  }
  function replaceBalancedObject(source,marker,value) {
    const parsed=parseObjectAfter(source,marker);if(!parsed)return source;
    return source.slice(0,parsed.start)+JSON.stringify(value)+source.slice(parsed.end);
  }
  function processSiteJs(source) {
    let out=mergeTranslationEdits(source);
    out=replaceTokens(out,getConfigValues(),true);
    out=out.replace(/https:\/\/[a-z0-9.-]+\/f\/[A-Za-z0-9]+/gi,'#');
    return out;
  }
  function buildConfigJson() {
    const result=Object.assign({},config,{IMAGE_ALT_TEXTS:Object.assign({},imageAlts)});
    return JSON.stringify(result,null,2)+'\n';
  }
  function downloadBlob(blob,filename) {
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  function sanitizeExportFilename() {
    const name=(config.NOM_LOGEMENT||'site-location').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    return (name||'site-location')+'.zip';
  }
  async function exportZip() {
    if(!sourceFiles.size){setStatus(exportStatus,'Ouvre d’abord le dossier du modèle.','error');return;}
    setStatus(exportStatus,'Vérification des traductions en cours…','');
    await new Promise(resolve=>window.setTimeout(resolve,120));
    if(newsTranslationTimers.size)await new Promise(resolve=>window.setTimeout(resolve,980));
    if(pendingTranslationTasks.size)await Promise.allSettled(Array.from(pendingTranslationTasks));
    saveCurrentPage();
    const values=getConfigValues();
    const missing=['NOM_LOGEMENT','NOM_RESIDENCE','NOM_STATION','ADRESSE_LOGEMENT','EMAIL_HOTES'].filter(key=>!String(values[key]||'').trim());
    if(missing.length&&!window.confirm('Certains champs sont encore vides : '+missing.join(', ')+'. Le ZIP pourra être complété plus tard. Continuer ?'))return;
    setStatus(exportStatus,'Préparation des pages et des images…','');
    const entries=[];
    for(const name of EXPORT_CORE){
      if(!sourceFiles.has(name))continue;
      const file=sourceFiles.get(name);
      if(name.endsWith('.html')){
        let html=editedPages.get(name);
        if(!html){html=await file.text();html=replaceTokens(html,values,false);}
        html=processHtmlForExport(name,html);
        entries.push({name,data:new TextEncoder().encode(html)});
      } else if(name==='site.js'){
        const text=await file.text();entries.push({name,data:new TextEncoder().encode(processSiteJs(text))});
      } else if(name==='configuration.json') {
        entries.push({name,data:new TextEncoder().encode(buildConfigJson())});
      } else {
        entries.push({name,data:file});
      }
    }
    if(!entries.some(e=>e.name==='configuration.json'))entries.push({name:'configuration.json',data:new TextEncoder().encode(buildConfigJson())});
    const blocked=/^(personnaliser\.(py|ps1|cmd)|.*\.md|\.git.*|.*\.log)$/i;
    for(const [name,file] of sourceFiles){
      if(!isImagePath(name)||blocked.test(name)||name.startsWith('.'))continue;
      if(entries.some(entry=>entry.name===name))continue;
      entries.push({name,data:file});
    }
    try{
      const blob=await window.buildStaticZip(entries);
      downloadBlob(blob,sanitizeExportFilename());
      setStatus(exportStatus,'ZIP complet créé : '+entries.length+' fichiers. Les anciens ZIP ne sont pas modifiés.','success');
    }catch(error){setStatus(exportStatus,'Export impossible : '+error.message,'error');}
  }
  function downloadConfig() {
    if(!sourceFiles.size){setStatus(exportStatus,'Ouvre d’abord le dossier du modèle.','error');return;}
    const blob=new Blob([buildConfigJson()],{type:'application/json;charset=utf-8'});
    downloadBlob(blob,'configuration.json');
    setStatus(exportStatus,'Configuration JSON téléchargée.','success');
  }
  function setupTabs() {
    $$('.tool-tab').forEach(button=>button.addEventListener('click',()=>{
      $$('.tool-tab').forEach(tab=>{const active=tab===button;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',active?'true':'false');});
      $$('.tool-content').forEach(panel=>{const active=panel.id==='panel-'+button.dataset.panel;panel.classList.toggle('active',active);panel.hidden=!active;});
      if(button.dataset.panel==='links')renderLinks();
      if(button.dataset.panel==='content')document.dispatchEvent(new CustomEvent('ecrin-content-panel-open'));
      if(button.dataset.panel==='images')renderImages();
      if(button.dataset.panel==='translations')renderTranslationList();
    }));
  }
  $('#choose-folder').addEventListener('click',()=>folderInput.click());
  $('#choose-another').addEventListener('click',()=>folderInput.click());
  folderInput.addEventListener('change',()=>loadFolder(folderInput.files));
  $('#image-search').addEventListener('input',renderImages);
  $('#translation-search').addEventListener('input',renderTranslationList);
  imageInput.addEventListener('change',handleImageReplacement);
  $('#add-gallery-images').addEventListener('click',()=>addGalleryImageInput.click());
  addGalleryImageInput.addEventListener('change',handleGalleryImageAddition);
  pageSelect.addEventListener('change',async()=>{saveCurrentPage();await renderPreview(pageSelect.value);});
  $('#link-test-toggle').addEventListener('click',()=>{
    linkTestMode=!linkTestMode;const button=$('#link-test-toggle');
    button.setAttribute('aria-pressed',linkTestMode?'true':'false');button.textContent=linkTestMode?'Arrêter le test des liens':'Tester les liens';
    const doc=previewFrame.contentDocument;if(doc){doc.documentElement.setAttribute('data-editor-link-test',String(linkTestMode));previewFrame.contentWindow.postMessage({type:'ecrin-editor-set-link-test',enabled:linkTestMode},'*');}
  });
  translationConsent.addEventListener('change',()=>{
    if(!translationConsent.checked){setStatus(translationStatus,'Traduction automatique désactivée. Les fichiers restent locaux.','');return;}
    setStatus(translationStatus,'Consentement enregistré. Les textes éditoriaux modifiés admissibles seront traduits.','success');
    Array.from(untranslatedEditedTexts).forEach(text=>trackTranslation(translateEditedText(text)));
    editedNewsFields.forEach(key=>scheduleNewsFieldTranslation(key,config[key]));
  });
  $('#download-zip').addEventListener('click',exportZip);
  $('#download-config').addEventListener('click',downloadConfig);
  setupTabs();listenForPreviewMessages();
  if(!('webkitdirectory' in folderInput))setStatus(importStatus,'La sélection de dossier nécessite Microsoft Edge ou Google Chrome.','error');
})();

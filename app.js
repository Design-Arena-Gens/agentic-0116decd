const ideaEl = document.querySelector('#idea');
const triggerEl = document.querySelector('#trigger');
const modelEl = document.querySelector('#aiModel');
const serviceEls = Array.from(document.querySelectorAll('.service'));
const planEl = document.querySelector('#plan');
const jsonEl = document.querySelector('#json');

const generateBtn = document.querySelector('#generate');
const clearBtn = document.querySelector('#clear');
const copyBtns = Array.from(document.querySelectorAll('[data-copy]'));
const downloadBtn = document.querySelector('#download-json');

function detectServices(text, preselected) {
  const lowered = text.toLowerCase();
  const services = new Set(preselected);
  const map = [
    ['typeform', ['typeform']],
    ['webhook', ['webhook', 'http']],
    ['sheets', ['google sheet', 'g-sheet', 'sheet', 'sheets', 'google sheets']],
    ['slack', ['slack']],
    ['gmail', ['gmail', 'email', 'mail']],
    ['notion', ['notion']],
    ['calendar', ['calendar', 'calendrier']]
  ];
  for (const [key, keywords] of map) {
    if (keywords.some(k => lowered.includes(k))) services.add(key);
  }
  return Array.from(services);
}

function pickTrigger(text, fallback) {
  const t = text.toLowerCase();
  if (t.includes('tous les jours') || t.includes('chaque jour') || t.includes('cron')) return 'schedule';
  if (t.includes('lorsque') || t.includes('quand') || t.includes('webhook') || t.includes('formulaire')) return 'webhook';
  return fallback || 'webhook';
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildAIModule(model, idea) {
  const id = makeId('ai');
  const prompt = [
    'Tu es un expert Make.com et prompt engineer.',
    'But: transformer des donn?es brutes en r?sultat actionnable conforme au besoin m?tier.',
    'Contraintes: JSON valide, champs clairs, langue = fran?ais, structure stable.',
    'Renvoie un objet avec: {"insights": string[], "resume": string, "champSortie": object}.',
    'Respecte les limites de tokens, sois concis et pr?cis.'
  ].join('\n');
  return {
    id,
    app: 'OpenAI',
    type: 'chat-completion',
    model,
    fields: {
      system: prompt,
      user: `Contexte du sc?nario: ${idea}\n\nDonn?es: {{data}}`,
      temperature: 0.2
    },
    outputs: ['insights', 'resume', 'champSortie']
  };
}

function moduleFor(service, position = 'action') {
  const id = makeId(service);
  const dict = {
    webhook: { app: 'Webhooks', type: 'custom-webhook', name: 'Webhook' },
    typeform: { app: 'Typeform', type: 'watch-responses', name: 'Watch Responses' },
    sheets: { app: 'Google Sheets', type: 'add-row', name: 'Add Row' },
    slack: { app: 'Slack', type: 'post-message', name: 'Post Message' },
    gmail: { app: 'Gmail', type: 'send-email', name: 'Send Email' },
    notion: { app: 'Notion', type: 'create-page', name: 'Create Page' },
    calendar: { app: 'Google Calendar', type: 'create-event', name: 'Create Event' }
  };
  const base = dict[service] || { app: 'Tool', type: 'noop', name: 'Step' };
  return {
    id,
    position,
    name: `${base.app} ? ${base.name}`,
    app: base.app,
    type: base.type,
    fields: {}
  };
}

function buildScenario(idea, selectedTrigger, model, preselectedServices) {
  const services = detectServices(idea, preselectedServices);
  const trigger = pickTrigger(idea, selectedTrigger);

  const modules = [];
  let triggerModule;
  if (trigger === 'webhook') {
    triggerModule = moduleFor('webhook', 'trigger');
  } else if (trigger === 'schedule') {
    triggerModule = { id: makeId('schedule'), position: 'trigger', name: 'Scheduler ? Cron', app: 'Tools', type: 'cron', fields: { cron: '0 8 * * *' } };
  } else {
    // watch
    const watchService = services.find(s => ['typeform', 'gmail', 'notion', 'sheets', 'slack'].includes(s)) || 'webhook';
    triggerModule = moduleFor(watchService, 'trigger');
  }
  modules.push(triggerModule);

  // Normaliser/mapper les donn?es d'entr?e
  const mapper = { id: makeId('map'), position: 'transform', name: 'Tools ? JSON > Normalize', app: 'Tools', type: 'json-map', fields: { mapping: { data: '{{input}}' } } };
  modules.push(mapper);

  // ?tape IA
  const ai = buildAIModule(model, idea);
  modules.push(ai);

  // Actions en aval selon services
  const downstream = [];
  if (services.includes('sheets')) downstream.push(moduleFor('sheets'));
  if (services.includes('notion')) downstream.push(moduleFor('notion'));
  if (services.includes('calendar')) downstream.push(moduleFor('calendar'));

  // Communication
  if (services.includes('slack')) downstream.push(moduleFor('slack'));
  if (services.includes('gmail')) downstream.push(moduleFor('gmail'));

  modules.push(...downstream);

  // Gestion des erreurs
  const errorHandler = { id: makeId('error'), position: 'error', name: 'Error Handler ? Log & Retry', app: 'Tools', type: 'error-handler', fields: { retries: 2, backoff: 'exponential' } };

  // Connexions simples en cha?ne
  const connections = [];
  for (let i = 0; i < modules.length - 1; i++) {
    connections.push({ from: modules[i].id, to: modules[i + 1].id });
  }

  const blueprint = {
    version: 1,
    name: `Sc?nario IA ? ${idea.slice(0, 60)}`,
    metadata: {
      createdAt: new Date().toISOString(),
      generator: 'Architecte Make IA (statique)'
    },
    modules,
    connections,
    error: errorHandler
  };

  const plan = renderPlan(idea, triggerModule, ai, downstream, errorHandler);

  return { services, trigger, modules, plan, blueprint };
}

function renderPlan(idea, triggerModule, ai, downstream, errorHandler) {
  const lines = [];
  lines.push(`# Objectif`);
  lines.push(`- ${idea}`);
  lines.push('');
  lines.push(`# D?clencheur`);
  lines.push(`- ${triggerModule.name}`);
  lines.push('');
  lines.push(`# Flux principal`);
  lines.push('1. Normaliser les donn?es (Tools ? JSON > Normalize)');
  lines.push(`2. Appel IA (OpenAI ? ${ai.model}) pour analyser, structurer et r?sumer les donn?es`);
  if (downstream.length) {
    downstream.forEach((m, idx) => {
      lines.push(`${idx + 3}. ${m.name}`);
    });
  }
  lines.push('');
  lines.push(`# Prompt IA (sugg?r?)`);
  lines.push('System: Tu es un expert Make et data product.');
  lines.push('User: Utilise le contenu ci-dessous pour produire {insights[], resume, champSortie:{...}} en JSON strict.');
  lines.push('{{data}}');
  lines.push('');
  lines.push(`# Mappages recommand?s`);
  lines.push('- Entr?e IA: donn?es normalis?es du module 2 ({{data}})');
  if (downstream.some(m => m.app === 'Google Sheets')) lines.push('- Google Sheets: mappez champSortie.* vers les colonnes');
  if (downstream.some(m => m.app === 'Notion')) lines.push('- Notion: mappez champSortie.* vers les propri?t?s');
  if (downstream.some(m => m.app === 'Slack')) lines.push('- Slack: message = resume + puces des insights');
  if (downstream.some(m => m.app === 'Gmail')) lines.push('- Gmail: objet = r?sum? court, corps = r?sum? + d?tails');
  if (downstream.some(m => m.app === 'Google Calendar')) lines.push('- Calendar: titre = champSortie.titre, dates = champSortie.debut/fin');
  lines.push('');
  lines.push(`# Gestion des erreurs`);
  lines.push(`- ${errorHandler.name}`);

  return lines.join('\n');
}

function getPreselectedServices() {
  return serviceEls.filter(el => el.checked).map(el => el.value);
}

function setOutputs(plan, blueprint) {
  planEl.value = plan;
  jsonEl.value = JSON.stringify(blueprint, null, 2);
}

function handleGenerate() {
  const idea = ideaEl.value.trim();
  if (!idea) {
    alert('D?crivez votre id?e.');
    return;
  }
  const selectedTrigger = triggerEl.value;
  const model = modelEl.value;
  const preselected = getPreselectedServices();
  const { plan, blueprint } = buildScenario(idea, selectedTrigger, model, preselected);
  setOutputs(plan, blueprint);
}

function handleClear() {
  ideaEl.value = '';
  planEl.value = '';
  jsonEl.value = '';
  serviceEls.forEach(el => { el.checked = false; });
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch(e) {
    // Fallback invisible textarea
    const t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
  }
}

function handleCopy(selector) {
  const el = document.querySelector(selector);
  if (el && el.value) copyToClipboard(el.value);
}

function handleDownloadJson() {
  const content = jsonEl.value || '{}';
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'make_blueprint.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Events
generateBtn.addEventListener('click', handleGenerate);
clearBtn.addEventListener('click', handleClear);
copyBtns.forEach(btn => btn.addEventListener('click', () => handleCopy(btn.getAttribute('data-copy'))));
downloadBtn.addEventListener('click', handleDownloadJson);

// Example placeholder to help users
ideaEl.value = 'Quand un formulaire Typeform est soumis, analyser avec l\'IA, ajouter une ligne dans Google Sheets et notifier sur Slack.';

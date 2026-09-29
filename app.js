import { CATEGORIES, initialSubscriptions } from './data.js';
import { STORAGE_KEY, money, todayISO, nextRenewal, daysUntil, statusOf, monthlyEquivalent, summarize, upcoming, validateSubscriptions, parseBackup, createBackup } from './model.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const paths = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-14 4h2m3 0h2"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  filter: '<path d="M4 7h16M7 12h10m-7 5h4"/>',
  sort: '<path d="M8 4v16m-4-4 4 4 4-4m4-12v16m-4-12 4-4 4 4"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  chevrons: '<path d="m8 8 4-4 4 4m-8 8 4 4 4-4"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  chart: '<path d="M4 4v16h16M8 15v-3m5 3V8m5 7V5"/>',
  sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  wallet: '<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8h18m-5 5h5m-5 3h.01M6 5V3h12"/>',
  repeat: '<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.layers}</svg>`; }
$$('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });

const categoryColors = { 'AI & productivity': '#4e8969', 'Entertainment': '#92af72', 'Cloud & hosting': '#8faab7', 'Software & tools': '#c6ae7c', 'Travel & lifestyle': '#af9ac0' };
const brands = {
  Spotify: ['#e9f8e9', '#368246', '≋'], AWS: ['#fff2e3', '#b9893b', 'aws'], Hetzner: ['#fcecef', '#c04b63', 'H'],
  Gemini: ['#eef0ff', '#7479be', '✦'], OpenAI: ['#e9f1ed', '#517767', '◎'], 'OpenAI Businesses': ['#e9f1ed', '#517767', '◎'],
  Base: ['#ebefff', '#748ecf', 'b'], Fabhouse: ['#faedf2', '#b67d96', 'f'], TradingView: ['#edf1fa', '#7791bb', 'TV'],
  Easynews: ['#eaf4f5', '#72a4ad', 'e'], Loopcloud: ['#f1edfb', '#9782b7', '∞'], ACE: ['#f5eee6', '#a28c74', 'A'],
  'Microsoft 365 fons': ['#eff2f7', '#758cac', '⊞'], IDrive: ['#eaf2fa', '#6d92b7', 'iD'], eDreams: ['#edf6fa', '#6796b4', 'eD'],
};
function avatar(subscription) {
  const [background, color, letters] = brands[subscription.name] || ['#f1f3ef', '#8a9888', subscription.name.slice(0, 2)];
  return `<span class="service-avatar" style="background:${background};color:${color}" aria-hidden="true">${escapeHTML(letters)}</span>`;
}
function dateLabel(value, options = { day: 'numeric', month: 'short' }) {
  return value ? new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'No date set';
}
function relativeDate(value) {
  const days = daysUntil(value);
  return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}

let subscriptions;
let recoveryData = null;
let storageAvailable = true;
let storageBlocked = false;
let needsInitialSave = false;
const state = { view: 'overview', status: 'all', query: '', category: 'all', sort: 'name', page: 1 };
const PAGE_SIZE = 8;
let toastTimer;

function storageWarning(message) {
  $('#storage-warning').textContent = message;
  $('#storage-warning').hidden = !message;
}
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) { subscriptions = initialSubscriptions(); needsInitialSave = true; }
  else {
    try { subscriptions = parseBackup(saved); }
    catch {
      recoveryData = saved;
      storageBlocked = true;
      subscriptions = [];
      storageWarning('Your saved data could not be read. It has been preserved. Use Export to download it for recovery, then import a valid backup to continue.');
    }
  }
} catch {
  subscriptions = initialSubscriptions();
  storageAvailable = false;
  storageWarning('Browser storage is unavailable. Changes will last only for this session. Export a backup to keep them.');
}

function persist() {
  if (storageBlocked) return false;
  try {
    localStorage.setItem(STORAGE_KEY, createBackup(subscriptions));
    storageAvailable = true;
    storageWarning('');
    return true;
  } catch {
    storageAvailable = false;
    storageWarning('Changes could not be saved to browser storage. They are available for this session; export a backup to keep them.');
    return false;
  }
}
if (needsInitialSave && storageAvailable && !storageBlocked) persist();

function toast(message, action) {
  clearTimeout(toastTimer);
  const element = $('#toast');
  element.replaceChildren(document.createTextNode(message));
  if (action) {
    const button = document.createElement('button');
    button.textContent = action.label;
    button.addEventListener('click', () => { action.run(); element.hidden = true; });
    element.append(button);
  }
  element.hidden = false;
  toastTimer = setTimeout(() => { element.hidden = true; }, action ? 12000 : 6000);
}

function renderStats() {
  const totals = summarize(subscriptions);
  const next = upcoming(subscriptions)[0];
  const monthlyCount = subscriptions.filter(s => s.active && s.interval === 'monthly').length;
  const yearlyCount = subscriptions.filter(s => s.active && s.interval === 'yearly').length;
  const stats = [
    { label: 'Monthly subscriptions', value: money(totals.monthly), unit: '/ month', icon: 'wallet', foot: `<strong>${monthlyCount} monthly plans</strong><span>in your active subscriptions</span>`, featured: true },
    { label: 'Annual subscriptions', value: money(totals.yearly), unit: '/ year', icon: 'repeat', foot: `${yearlyCount} annual plans · ${money(totals.yearly / 12)}/mo equivalent` },
    { label: 'Active subscriptions', value: totals.active, unit: `of ${subscriptions.length} total`, icon: 'layers', foot: `<span class="tiny-dot"></span>${totals.cancelling} with cancellation planned or requested` },
    { label: 'Total monthly equivalent', value: money(totals.monthlyEquivalent), unit: '/ month', icon: 'chart', foot: `${money(totals.annualized)} projected per year${totals.unknown ? ` · ${totals.unknown} unknown price(s)` : ''}` },
  ];
  $('#stats').innerHTML = stats.map(s => `<article class="stat-card${s.featured ? ' featured' : ''}"><div class="stat-top"><span>${s.label}</span><span class="stat-icon">${icon(s.icon)}</span></div><div class="stat-value">${s.value}<small>${s.unit}</small></div><div class="stat-foot">${s.foot}</div></article>`).join('');
  $('#stats').title = next ? `Next renewal: ${next.subscription.name}, ${dateLabel(next.date)}` : 'No upcoming renewals';
  $('#nav-count').textContent = subscriptions.length;
  $('#all-count').textContent = subscriptions.length;
}

function visibleSubscriptions() {
  return subscriptions.filter(s => {
    const matchesStatus = state.status === 'all' || (state.status === 'active' ? s.active : statusOf(s) === state.status);
    const searchText = [s.name, s.category, s.account, s.email, s.notes, s.paymentMethod, s.last4, s.userId].join(' ').toLowerCase();
    return matchesStatus && (state.category === 'all' || s.category === state.category) && searchText.includes(state.query.toLowerCase().trim()) && (state.view !== 'renewals' || nextRenewal(s));
  }).sort((a, b) => {
    if (state.sort === 'renewal') return (nextRenewal(a) || '9999').localeCompare(nextRenewal(b) || '9999') || a.name.localeCompare(b.name);
    if (state.sort === 'cost') return monthlyEquivalent(b) - monthlyEquivalent(a) || a.name.localeCompare(b.name);
    if (state.sort === 'recent') return b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

function renderRows() {
  const visible = visibleSubscriptions();
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * PAGE_SIZE;
  $('#list-count').textContent = visible.length;
  $('#results-label').textContent = `${visible.length} subscription${visible.length === 1 ? '' : 's'}`;
  $('#subscription-rows').innerHTML = visible.slice(start, start + PAGE_SIZE).map(s => {
    const date = nextRenewal(s);
    const status = statusOf(s);
    const statusLabel = { active: 'Active', inactive: 'Inactive', cancelling: 'Cancelling' }[status];
    const dateMain = date ? dateLabel(date, { day: 'numeric', month: 'short', year: 'numeric' }) : s.active && s.endsAt ? `Ends ${dateLabel(s.endsAt)}` : s.active ? 'No date set' : '—';
    const dateSub = date ? relativeDate(date) : s.active && s.endsAt ? 'No further payment' : s.active ? 'Add a billing date' : s.cancellation === 'requested' ? 'Cancelled' : 'Not billing';
    const payment = s.paymentMethod || 'Not set';
    const paymentIcon = s.paymentMethod === 'PayPal' ? '<span class="payment-symbol paypal">P</span>' : s.paymentMethod === 'Visa' ? '<span class="payment-symbol">VISA</span>' : s.paymentMethod === 'Mastercard' ? '<span class="payment-symbol mastercard">●●</span>' : '';
    return `<tr><td><div class="service-cell">${avatar(s)}<div><button class="service-name" data-edit="${escapeHTML(s.id)}" title="Edit ${escapeHTML(s.name)}">${escapeHTML(s.name)}</button><span class="service-category">${escapeHTML(s.category)}</span></div></div></td><td><span class="amount">${s.amount === null ? 'Unknown' : money(s.amount)}</span><span class="cell-subtext">/ ${s.interval === 'monthly' ? 'month' : 'year'}</span></td><td><span class="renewal-date">${dateMain}</span><span class="cell-subtext${date && daysUntil(date) <= 3 ? ' renewal-near' : ''}">${dateSub}</span></td><td><span class="payment-cell">${paymentIcon}${escapeHTML(payment)}</span>${s.last4 ? `<span class="cell-subtext">•••• ${escapeHTML(s.last4)}</span>` : ''}</td><td><span class="status ${status}">${statusLabel}</span></td><td><button class="icon-button row-action" data-edit="${escapeHTML(s.id)}" aria-label="Edit ${escapeHTML(s.name)}">${icon('edit')}</button></td></tr>`;
  }).join('');
  $('#empty-state').hidden = visible.length > 0;
  $('#table-summary').textContent = visible.length ? `Showing ${start + 1}–${Math.min(start + PAGE_SIZE, visible.length)} of ${visible.length}` : '0 subscriptions';
  $('#page-number').textContent = `${state.page} / ${pages}`;
  $('#previous-page').disabled = state.page === 1;
  $('#next-page').disabled = state.page === pages;
  $('#save-label').textContent = storageBlocked ? 'Saved data needs recovery' : storageAvailable ? 'All changes saved locally' : 'Session only · export to keep changes';
  $$('.segmented button').forEach(button => { const selected = button.dataset.status === state.status; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', selected); });
}

function renderInsights() {
  const renewals = upcoming(subscriptions, todayISO(), 30);
  $('#upcoming-list').innerHTML = renewals.length ? renewals.slice(0, 5).map(({ subscription: s, date }) => `<button class="upcoming-item" data-edit="${escapeHTML(s.id)}" aria-label="Edit ${escapeHTML(s.name)}, renewal ${dateLabel(date)}">${avatar(s)}<span class="upcoming-detail"><strong>${escapeHTML(s.name)}</strong><small>${dateLabel(date)} · ${s.interval === 'monthly' ? 'Monthly' : 'Yearly'}</small></span><span class="upcoming-amount"><strong>${s.amount === null ? 'Unknown' : money(s.amount)}</strong><small class="${daysUntil(date) <= 3 ? 'soon' : ''}">${relativeDate(date)}</small></span></button>`).join('') : '<p class="no-upcoming">All clear for now.<br>No payments due in the next 30 days.</p>';
  const total = renewals.reduce((sum, { subscription }) => sum + Math.round((subscription.amount ?? 0) * 100), 0) / 100;
  $('#upcoming-total').textContent = money(total) + (renewals.some(r => r.subscription.amount === null) ? ' + unknown' : '');
  const categories = CATEGORIES.map(category => ({ category, total: subscriptions.filter(s => s.active && s.category === category).reduce((sum, s) => sum + monthlyEquivalent(s), 0) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  const sum = categories.reduce((total, category) => total + category.total, 0);
  $('#category-breakdown').innerHTML = categories.length ? categories.map(({ category, total }) => `<div class="category-row"><div class="category-row-top"><span><i class="tiny-dot" style="background:${categoryColors[category]}"></i>${escapeHTML(category)}</span><strong>${money(total)}</strong></div><div class="category-track" role="img" aria-label="${escapeHTML(category)}: ${money(total)} per month, ${Math.round(total / sum * 100)} percent"><div class="category-fill" style="width:${total / sum * 100}%;background:${categoryColors[category]}"></div></div></div>`).join('') : '<p class="no-upcoming">Add an active subscription to see your spending breakdown.</p>';
}

function render() { renderStats(); renderRows(); renderInsights(); }

function switchView() {
  const view = location.hash.slice(1);
  state.view = ['overview', 'subscriptions', 'renewals'].includes(view) ? view : 'overview';
  state.status = 'all';
  state.page = 1;
  state.sort = state.view === 'renewals' ? 'renewal' : 'name';
  state.query = '';
  state.category = 'all';
  $('#search').value = '';
  $('#category-filter').value = 'all';
  $('#sort').value = state.sort;
  document.body.classList.remove('overview-view', 'subscriptions-view', 'renewals-view');
  document.body.classList.add(`${state.view}-view`);
  $$('[data-view]').forEach(link => { const active = link.dataset.view === state.view; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  const titles = { overview: ['Your subscriptions, in order', 'A clear view of what you pay for. No spreadsheet required.', 'Your subscriptions', 'Overview'], subscriptions: ['A place for every subscription', 'Keep the useful ones. Keep an eye on the rest.', 'All subscriptions', 'Subscriptions'], renewals: ['Know what’s coming next', 'Next scheduled payments for your active subscriptions, in date order.', 'Upcoming renewals', 'Upcoming renewals'] };
  const [title, description, listTitle, breadcrumb] = titles[state.view];
  $('#page-title').innerHTML = `${title}<span>.</span>`;
  $('#page-description').textContent = description;
  $('#list-title').textContent = listTitle;
  $('#breadcrumb-current').textContent = breadcrumb;
  document.title = `${breadcrumb} — Subfolio`;
  render();
}

function openEditor(id) {
  if (storageBlocked) { toast('Export your recovery data, then import a valid backup before editing.'); return; }
  const form = $('#subscription-form');
  form.reset();
  $('#form-error').hidden = true;
  $('.additional-fields').open = false;
  const subscription = id ? subscriptions.find(s => s.id === id) : null;
  if (id && !subscription) return;
  const values = subscription || { id: '', active: true, category: CATEGORIES[0], nextPayment: todayISO(), interval: 'monthly', cancellation: 'none' };
  for (const element of form.elements) {
    if (!element.name) continue;
    if (element.type === 'checkbox') element.checked = Boolean(values[element.name]);
    else element.value = values[element.name] ?? '';
  }
  $('#dialog-title').textContent = subscription ? `Edit ${subscription.name}` : 'Add subscription';
  $('#delete-button').hidden = !subscription;
  $('#manage-link').hidden = !subscription?.url;
  if (subscription?.url) $('#manage-link').href = subscription.url;
  else $('#manage-link').removeAttribute('href');
  $('#subscription-dialog').showModal();
  form.elements.name.focus();
}

let confirmCallback = null;
function confirmAction(title, message, label, action) {
  $('#confirm-title').textContent = title;
  $('#confirm-message').textContent = message;
  $('#confirm-action').textContent = label;
  confirmCallback = action;
  $('#confirm-dialog').showModal();
}
$('#confirm-action').addEventListener('click', () => {
  const callback = confirmCallback;
  $('#confirm-dialog').close();
  confirmCallback = null;
  callback?.();
});
$('#confirm-dialog').addEventListener('close', () => { confirmCallback = null; });

$('#subscription-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  const existing = subscriptions.find(s => s.id === values.id);
  const entry = { ...values, id: existing?.id || `sub-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`, active: form.elements.active.checked, amount: values.amount === '' ? null : Number(values.amount), createdAt: existing?.createdAt || new Date().toISOString() };
  try {
    const validated = validateSubscriptions([entry])[0];
    const updated = existing ? subscriptions.map(s => s.id === existing.id ? validated : s) : [...subscriptions, validated];
    if (updated.length > 5000) throw new Error('Your workspace can hold up to 5,000 subscriptions.');
    subscriptions = updated;
    const saved = persist();
    render();
    $('#subscription-dialog').close();
    toast(`${validated.name} ${existing ? 'updated' : 'added'}${saved ? '.' : ' for this session. Export to keep your changes.'}`);
  } catch (error) {
    $('#form-error').textContent = error.message;
    $('#form-error').hidden = false;
  }
});

$('#delete-button').addEventListener('click', () => {
  const id = $('#subscription-form').elements.id.value;
  const subscription = subscriptions.find(s => s.id === id);
  if (!subscription) return;
  confirmAction('Delete subscription?', `Remove ${subscription.name} from your workspace? You can undo this immediately after deleting.`, 'Delete subscription', () => {
    subscriptions = subscriptions.filter(s => s.id !== id);
    persist();
    render();
    $('#subscription-dialog').close();
    toast(`${subscription.name} deleted.`, { label: 'Undo', run: () => { if (!subscriptions.some(s => s.id === id)) subscriptions.push(subscription); persist(); render(); } });
  });
});

function downloadBackup() {
  const data = recoveryData ?? createBackup(subscriptions);
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `subfolio-${recoveryData !== null ? 'recovery-' : ''}${todayISO()}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(recoveryData !== null ? 'Recovery data exported.' : 'Backup exported. Keep it somewhere safe.');
}

$('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('Choose a JSON backup smaller than 10 MB.');
    const imported = parseBackup(await file.text());
    confirmAction('Import this backup?', `This backup contains ${imported.length} subscriptions. Importing replaces your current ${subscriptions.length} subscriptions. Export your current list first if you want to keep a copy.`, 'Replace & import', () => {
      subscriptions = imported;
      recoveryData = null;
      storageBlocked = false;
      const saved = persist();
      resetFilters();
      render();
      toast(`${imported.length} subscriptions imported${saved ? '.' : ' for this session. Export to keep them.'}`);
    });
  } catch (error) { toast(error.message); }
});

function resetFilters() {
  state.status = 'all'; state.query = ''; state.category = 'all'; state.page = 1;
  $('#search').value = ''; $('#category-filter').value = 'all';
  renderRows();
}
const categoryOptions = CATEGORIES.map(category => `<option>${escapeHTML(category)}</option>`).join('');
$('#category-filter').insertAdjacentHTML('beforeend', categoryOptions);
$('#form-category').innerHTML = categoryOptions;
$('#today').textContent = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
$('#search').addEventListener('input', event => { state.query = event.target.value; state.page = 1; renderRows(); });
$('#category-filter').addEventListener('change', event => { state.category = event.target.value; state.page = 1; renderRows(); });
$('#sort').addEventListener('change', event => { state.sort = event.target.value; state.page = 1; renderRows(); });
$$('[data-status]').forEach(button => button.addEventListener('click', () => { state.status = button.dataset.status; state.page = 1; renderRows(); }));
$('#previous-page').addEventListener('click', () => { state.page--; renderRows(); });
$('#next-page').addEventListener('click', () => { state.page++; renderRows(); });
$('#view-options-button').addEventListener('click', () => { $('.sort-wrap').classList.toggle('visible'); if ($('.sort-wrap').classList.contains('visible')) $('#sort').focus(); });
$('#clear-filters').addEventListener('click', resetFilters);
$('#add-button').addEventListener('click', () => openEditor());
$('#export-button').addEventListener('click', downloadBackup);
$('#sidebar-export').addEventListener('click', downloadBackup);
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#mobile-import').addEventListener('click', () => $('#import-file').click());
$('#sheet-info-button').addEventListener('click', () => $('#info-dialog').showModal());
$('#about-button').addEventListener('click', () => $('#info-dialog').showModal());
document.addEventListener('click', event => {
  const edit = event.target.closest('[data-edit]');
  if (edit) openEditor(edit.dataset.edit);
  const close = event.target.closest('[data-close]');
  if (close) document.getElementById(close.dataset.close).close();
});
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
}));
document.addEventListener('keydown', event => {
  if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector('dialog[open]')) { event.preventDefault(); $('#search').focus(); }
});
window.addEventListener('hashchange', switchView);
// Keep other open tabs in sync rather than overwriting their more recent edits.
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  if ($('#subscription-dialog').open) $('#subscription-dialog').close();
  if ($('#confirm-dialog').open) $('#confirm-dialog').close();
  clearTimeout(toastTimer);
  $('#toast').hidden = true;
  try {
    subscriptions = event.newValue === null ? [] : parseBackup(event.newValue);
    recoveryData = null; storageBlocked = false; storageAvailable = true;
    storageWarning(''); render(); toast('Workspace updated from another tab.');
  } catch {
    recoveryData = event.newValue; storageBlocked = true;
    storageWarning('Saved data from another tab could not be read. Export the recovery data before importing a valid backup.');
    render();
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
switchView();

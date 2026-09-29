import { DEFAULT_CATEGORIES as INITIAL_DEFAULT_CATEGORIES } from './data.js';

export const DEFAULT_CATEGORIES = INITIAL_DEFAULT_CATEGORIES;
export const CATEGORIES = DEFAULT_CATEGORIES.map(c => c.name);

export const STORAGE_KEY = 'subfolio.subscriptions.v1';
export const CATEGORIES_KEY = 'subfolio.categories.v1';
export const money = value => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);

export function todayISO() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && +value.slice(0, 4) >= 1900;
}

function shiftedDate(anchor, months) {
  const year = +anchor.slice(0, 4);
  const month = +anchor.slice(5, 7) - 1 + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(+anchor.slice(8, 10), lastDay))).toISOString().slice(0, 10);
}

// Always calculate from the original anchor, so Jan 31 -> Feb 28 -> Mar 31.
export function nextRenewal(subscription, today = todayISO()) {
  if (!subscription.active) return null;
  const anchor = subscription.nextPayment || subscription.billingStart;
  if (!validDate(anchor)) return null;
  const interval = subscription.interval === 'yearly' ? 12 : 1;
  const monthDifference = (+today.slice(0, 4) - +anchor.slice(0, 4)) * 12 + +today.slice(5, 7) - +anchor.slice(5, 7);
  let periods = Math.max(0, Math.floor(monthDifference / interval));
  let next = shiftedDate(anchor, periods * interval);
  if (next < today) next = shiftedDate(anchor, ++periods * interval);
  if (subscription.endsAt && next >= subscription.endsAt) return null;
  return next;
}

export function daysUntil(date, today = todayISO()) {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

export function statusOf(subscription) {
  return !subscription.active ? 'inactive' : subscription.cancellation !== 'none' ? 'cancelling' : 'active';
}

export function monthlyEquivalent(subscription) {
  return (subscription.amount ?? 0) / (subscription.interval === 'yearly' ? 12 : 1);
}

export function summarize(subscriptions) {
  const active = subscriptions.filter(subscription => subscription.active);
  const cents = interval => active.filter(s => s.interval === interval && s.amount !== null).reduce((sum, s) => sum + Math.round(s.amount * 100), 0);
  const monthly = cents('monthly') / 100;
  const yearly = cents('yearly') / 100;
  const annualized = (cents('monthly') * 12 + cents('yearly')) / 100;
  return { monthly, yearly, monthlyEquivalent: annualized / 12, annualized, active: active.length, cancelling: active.filter(s => s.cancellation !== 'none').length, unknown: active.filter(s => s.amount === null).length };
}

export function upcoming(subscriptions, today = todayISO(), horizon = Infinity) {
  const payments = [];
  for (const subscription of subscriptions) {
    let date = nextRenewal(subscription, today);
    while (date && daysUntil(date, today) <= horizon) {
      payments.push({ subscription, date });
      if (!Number.isFinite(horizon)) break; // Unbounded view shows the next payment per plan.
      const tomorrow = new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
      date = nextRenewal(subscription, tomorrow);
    }
  }
  return payments.sort((a, b) => a.date.localeCompare(b.date) || a.subscription.name.localeCompare(b.subscription.name));
}

const textLimits = { name: 100, id: 100, last4: 4, account: 200, url: 2000, userId: 200, email: 254, notes: 5000, createdAt: 40 };
const paymentMethods = ['', 'PayPal', 'Visa', 'Mastercard', 'Bank transfer', 'Other', 'Unknown'];

export function validateCategories(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 100) {
    throw new Error('Workspace must have between 1 and 100 categories.');
  }
  const names = new Set();
  return input.map((cat, index) => {
    if (!cat || typeof cat !== 'object' || Array.isArray(cat)) {
      throw new Error(`Category ${index + 1} is invalid.`);
    }
    const name = String(cat.name ?? '').trim();
    if (!name || name.length > 50) {
      throw new Error(`Category ${index + 1} must have a name (1–50 characters).`);
    }
    const lower = name.toLowerCase();
    if (names.has(lower)) {
      throw new Error(`Duplicate category name "${name}".`);
    }
    names.add(lower);
    let color = String(cat.color ?? '').trim();
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
      throw new Error(`Category "${name}" has an invalid hex color.`);
    }
    if (color.length === 4) {
      color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return {
      id: cat.id ? String(cat.id).slice(0, 50) : `cat-${Date.now()}-${index}`,
      name,
      color: color.toLowerCase()
    };
  });
}

export function validateSubscriptions(input, allowedCategories = CATEGORIES) {
  if (!Array.isArray(input) || input.length > 5000) throw new Error('The backup must contain a list of up to 5,000 subscriptions.');
  const validCategoryNames = allowedCategories.map(c => typeof c === 'string' ? c : c.name);
  const ids = new Set();
  return input.map((item, index) => {
    const fail = message => { throw new Error(`Subscription ${index + 1}: ${message}`); };
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail('invalid entry.');
    const result = {};
    for (const [key, max] of Object.entries(textLimits)) {
      const value = item[key] ?? '';
      if (typeof value !== 'string' || value.length > max) fail(`${key} must be text with at most ${max} characters.`);
      result[key] = value.trim();
    }
    if (!result.name) fail('a name is required.');
    if (!result.id || ids.has(result.id)) fail('each entry needs a unique ID.');
    ids.add(result.id);
    if (item.amount !== null && (typeof item.amount !== 'number' || !Number.isFinite(item.amount) || item.amount < 0 || item.amount > 1000000)) fail('amount must be a number between 0 and 1,000,000, or null for an unknown amount.');
    if (item.amount !== null && Math.abs(item.amount * 100 - Math.round(item.amount * 100)) > 0.00001) fail('amount must have no more than two decimal places.');
    result.amount = item.amount === null ? null : Math.round(item.amount * 100) / 100;
    if (!['monthly', 'yearly'].includes(item.interval)) fail('billing interval must be monthly or yearly.');
    if (typeof item.active !== 'boolean') fail('active must be true or false.');
    if (!['none', 'planned', 'requested'].includes(item.cancellation)) fail('invalid cancellation status.');
    if (!validCategoryNames.includes(item.category)) fail(`invalid category "${item.category}".`);
    if (!paymentMethods.includes(item.paymentMethod)) fail('invalid payment method.');
    for (const field of ['interval', 'active', 'cancellation', 'category', 'paymentMethod']) result[field] = item[field];
    for (const field of ['nextPayment', 'billingStart', 'cancelledAt', 'endsAt']) {
      result[field] = item[field] ?? '';
      if (result[field] !== '' && !validDate(result[field])) fail(`${field} must be a valid YYYY-MM-DD date (1900 or later).`);
    }
    if (result.last4 && !/^\d{4}$/.test(result.last4)) fail('card last 4 must be exactly four digits.');
    if (result.url) {
      let url;
      try { url = new URL(result.url); } catch { fail('invalid subscription link.'); }
      if (!['http:', 'https:'].includes(url.protocol)) fail('subscription links must use http:// or https://.');
    }
    return result;
  });
}

export function parseBackup(text, fallbackCategories = DEFAULT_CATEGORIES) {
  let backup;
  try { backup = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Choose a Subfolio backup.'); }
  if (!backup || backup.version !== 1 || backup.currency !== 'EUR') throw new Error('Choose a version 1 Subfolio backup in EUR.');
  const categories = Array.isArray(backup.categories) ? validateCategories(backup.categories) : validateCategories(fallbackCategories);
  const subscriptions = validateSubscriptions(backup.subscriptions, categories);
  return { subscriptions, categories };
}

export function createBackup(subscriptions, categories = DEFAULT_CATEGORIES) {
  return JSON.stringify({
    app: 'Subfolio',
    version: 1,
    currency: 'EUR',
    exportedAt: new Date().toISOString(),
    categories: validateCategories(categories),
    subscriptions
  }, null, 2);
}

export function hexToRgb(hex) {
  const clean = String(hex ?? '').replace('#', '');
  const r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.substring(4, 6), 16) || 0;
  return { r, g, b };
}

export function hexToRgba(hex, alpha = 0.14) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

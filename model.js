import { CATEGORIES } from './data.js';

export const STORAGE_KEY = 'subfolio.subscriptions.v1';
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

export function validateSubscriptions(input) {
  if (!Array.isArray(input) || input.length > 5000) throw new Error('The backup must contain a list of up to 5,000 subscriptions.');
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
    if (!CATEGORIES.includes(item.category)) fail('invalid category.');
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

export function parseBackup(text) {
  let backup;
  try { backup = JSON.parse(text); } catch { throw new Error('This file is not valid JSON. Choose a Subfolio backup.'); }
  if (!backup || backup.version !== 1 || backup.currency !== 'EUR') throw new Error('Choose a version 1 Subfolio backup in EUR.');
  return validateSubscriptions(backup.subscriptions);
}

export function createBackup(subscriptions) {
  return JSON.stringify({ app: 'Subfolio', version: 1, currency: 'EUR', exportedAt: new Date().toISOString(), subscriptions }, null, 2);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULT_CATEGORIES, initialSubscriptions } from '../data.js';
import {
  nextRenewal,
  upcoming,
  summarize,
  statusOf,
  daysUntil,
  validDate,
  validateSubscriptions,
  validateCategories,
  parseBackup,
  createBackup,
  getInitials,
  hexToRgb,
  hexToRgba,
} from '../model.js';

const plan = overrides => ({ ...initialSubscriptions()[0], ...overrides });

test('example entries are valid and totals add up', () => {
  const subscriptions = validateSubscriptions(initialSubscriptions(), DEFAULT_CATEGORIES);
  const totals = summarize(subscriptions);
  assert.equal(subscriptions.length, 3);
  assert.equal(totals.monthly, 32.99);
  assert.equal(totals.yearly, 89.99);
  assert.equal(totals.active, 3);
  assert.equal(totals.cancelling, 1);
  assert.equal(totals.annualized, 485.87);
  assert.equal(Math.round(totals.monthlyEquivalent * 100) / 100, 40.49);
});

test('initial-data.json startup import file is valid and matches schema', () => {
  const fileContent = fs.readFileSync(new URL('../initial-data.json', import.meta.url), 'utf-8');
  const parsed = parseBackup(fileContent);
  assert.equal(parsed.subscriptions.length, 3);
  assert.equal(parsed.categories.length, 5);
  const totals = summarize(parsed.subscriptions);
  assert.equal(totals.monthly, 32.99);
  assert.equal(totals.yearly, 89.99);
});

test('category validation accepts valid categories and normalizes colors', () => {
  const valid = validateCategories([
    { name: 'Custom Cat', color: '#abc' },
    { name: 'Another', color: '#112233' },
  ]);
  assert.equal(valid.length, 2);
  assert.equal(valid[0].color, '#aabbcc');
  assert.equal(valid[1].color, '#112233');
});

test('category validation rejects duplicates and invalid hex colors', () => {
  assert.throws(() => validateCategories([{ name: 'Test', color: 'invalid' }]), /invalid hex color/);
  assert.throws(() => validateCategories([
    { name: 'Test', color: '#112233' },
    { name: 'test', color: '#445566' },
  ]), /Duplicate category/);
  assert.throws(() => validateCategories([]), /between 1 and 100/);
});

test('avatar helpers derive initials and rgba colors properly', () => {
  assert.equal(getInitials('Figma'), 'FI');
  assert.equal(getInitials('Proton Mail'), 'PM');
  assert.equal(getInitials('AWS'), 'AW');
  assert.equal(getInitials(''), '??');
  assert.deepEqual(hexToRgb('#112233'), { r: 17, g: 34, b: 51 });
  assert.equal(hexToRgba('#112233', 0.2), 'rgba(17, 34, 51, 0.2)');
});

test('month-end renewals retain their original billing day', () => {
  const subscription = plan({ nextPayment: '2026-01-31' });
  assert.equal(nextRenewal(subscription, '2026-02-01'), '2026-02-28');
  assert.equal(nextRenewal(subscription, '2026-03-01'), '2026-03-31');
  assert.equal(nextRenewal(subscription, '2026-04-01'), '2026-04-30');
  assert.equal(nextRenewal(subscription, '2028-02-01'), '2028-02-29');
});

test('leap-day annual renewals restore Feb 29 in leap years', () => {
  const subscription = plan({ interval: 'yearly', nextPayment: '2024-02-29' });
  assert.equal(nextRenewal(subscription, '2025-01-01'), '2025-02-28');
  assert.equal(nextRenewal(subscription, '2028-01-01'), '2028-02-29');
});

test('today is due today, future anchors do not bill early, and overdue anchors roll forward', () => {
  assert.equal(nextRenewal(plan({ nextPayment: '2026-10-01' }), '2026-10-01'), '2026-10-01');
  assert.equal(nextRenewal(plan({ nextPayment: '2027-04-01' }), '2026-10-01'), '2027-04-01');
  assert.equal(nextRenewal(plan({ nextPayment: '2024-12-31' }), '2026-10-01'), '2026-10-31');
});

test('cancellations stop payments on their end date but retain the independent active flag', () => {
  const subscription = plan({ cancellation: 'requested', nextPayment: '2026-10-01', endsAt: '2026-11-01' });
  assert.equal(nextRenewal(subscription, '2026-09-29'), '2026-10-01');
  assert.equal(nextRenewal(subscription, '2026-10-02'), null);
  assert.equal(statusOf(subscription), 'cancelling');
  assert.equal(summarize([subscription]).monthly, 15);
  assert.equal(nextRenewal({ ...subscription, active: false }), null);
  assert.equal(statusOf({ ...subscription, active: false }), 'inactive');
});

test('missing renewal dates can fall back to billing start', () => {
  assert.equal(nextRenewal(plan({ nextPayment: '', billingStart: '2026-01-15' }), '2026-09-29'), '2026-10-15');
  assert.equal(nextRenewal(plan({ nextPayment: '', billingStart: '' }), '2026-09-29'), null);
});

test('30-day forecast includes both monthly payments when a short month puts two in range', () => {
  const subscription = plan({ nextPayment: '2026-01-31' });
  assert.deepEqual(upcoming([subscription], '2026-01-31', 30).map(s => s.date), ['2026-01-31', '2026-02-28']);
  assert.equal(upcoming([subscription], '2026-01-31').length, 1);
});

test('forecast excludes inactive and ended plans and sorts by date', () => {
  const forecast = upcoming([
    plan({ name: 'Later', nextPayment: '2026-10-10' }),
    plan({ name: 'Inactive', active: false, nextPayment: '2026-10-01' }),
    plan({ name: 'Ended', nextPayment: '2026-10-01', endsAt: '2026-10-01' }),
    plan({ name: 'Sooner', nextPayment: '2026-10-02' }),
  ], '2026-09-29', 30);
  assert.deepEqual(forecast.map(item => item.subscription.name), ['Sooner', 'Later']);
});

test('date math is unaffected by daylight saving changes', () => {
  assert.equal(daysUntil('2026-03-30', '2026-03-28'), 2);
  assert.equal(daysUntil('2026-10-26', '2026-10-24'), 2);
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('2026-2-1'), false);
});

test('unknown and free prices stay distinct', () => {
  const subscriptions = [plan({ amount: null }), plan({ id: 'free', amount: 0 })];
  const totals = summarize(subscriptions);
  assert.equal(totals.unknown, 1);
  assert.equal(totals.monthly, 0);
  assert.equal(totals.active, 2);
  assert.equal(validateSubscriptions(subscriptions, DEFAULT_CATEGORIES)[0].amount, null);
});

test('JSON backups round-trip all entries and categories and support an empty workspace', () => {
  const backup = createBackup(initialSubscriptions(), DEFAULT_CATEGORIES);
  const parsed = parseBackup(backup);
  assert.deepEqual(parsed.subscriptions, initialSubscriptions());
  assert.deepEqual(parsed.categories, DEFAULT_CATEGORIES);
  assert.deepEqual(parseBackup(createBackup([])).subscriptions, []);
});

test('malformed backup data is rejected before replacing existing data', () => {
  assert.throws(() => parseBackup('{'), /valid JSON/);
  assert.throws(() => parseBackup('{"version":2}'), /version 1/);
  assert.throws(() => parseBackup('{"version":1,"currency":"USD","subscriptions":[]}'), /EUR/);
  assert.throws(() => validateSubscriptions([plan({ amount: -1 })]), /amount/);
  assert.throws(() => validateSubscriptions([plan({ amount: '10' })]), /amount/);
  assert.throws(() => validateSubscriptions([plan({ amount: 1.999 })]), /decimal/);
  assert.throws(() => validateSubscriptions([plan(), plan()]), /unique ID/);
  assert.throws(() => validateSubscriptions([plan({ nextPayment: '2026-02-30' })]), /valid YYYY-MM-DD/);
  assert.throws(() => validateSubscriptions([plan({ active: 'yes' })]), /true or false/);
  assert.throws(() => validateSubscriptions([plan({ url: 'javascript:alert(1)' })]), /http/);
  assert.throws(() => validateSubscriptions([plan({ name: '  ' })]), /name/);
  assert.throws(() => validateSubscriptions([plan({ category: 'NonExistentCategory' })]), /invalid category/);
});

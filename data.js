export const CATEGORIES = ['AI & productivity', 'Entertainment', 'Cloud & hosting', 'Software & tools', 'Travel & lifestyle'];

// Transcribed from sheet.jpeg. Active and cancellation are intentionally independent.
const rows = [
  ['Midjourney', 10, 'monthly', false, 'AI & productivity', 'Visa', '9951', '2026-10-28', 'requested', { billingStart: '2023-11-28' }],
  ['Skype', 3.63, 'monthly', false, 'Software & tools', 'PayPal', '', '2026-09-30', 'requested', { account: 'walterdvs', billingStart: '2023-12-31', cancelledAt: '2023-08-01', endsAt: '2023-09-01' }],
  ['Fortnite', 11.99, 'monthly', false, 'Entertainment', 'PayPal', '', '2026-10-02', 'requested', { account: 'mail@walterdevos.be', billingStart: '2024-01-02', cancelledAt: '2023-08-01', endsAt: '2023-08-03' }],
  ['ElevenLabs', 5, 'monthly', false, 'AI & productivity', 'Mastercard', '5503', '2026-10-19', 'requested', { billingStart: '2024-01-19', cancelledAt: '2025-02-02', endsAt: '2025-02-19' }],
  ['AWS', 10, 'monthly', true, 'Cloud & hosting', 'Mastercard', '2032', '2026-10-01', 'none', { billingStart: '2024-01-01' }],
  ['Dropbox', 11.99, 'monthly', false, 'Cloud & hosting', 'PayPal', '', '2026-10-16', 'requested', { billingStart: '2024-01-16', cancelledAt: '2023-08-06', endsAt: '2023-08-17' }],
  ['Spotify', 14.99, 'monthly', true, 'Entertainment', 'PayPal', '', '2026-10-09', 'none', { billingStart: '2024-11-09' }],
  ['Canva', 13.99, 'monthly', false, 'AI & productivity', 'PayPal', '', '2026-10-12', 'requested', { cancelledAt: '2023-08-14', endsAt: '2023-09-13', notes: 'Original billing cycle start reads 12/Jan/00; please verify the year.' }],
  ['Hetzner', 10, 'monthly', true, 'Cloud & hosting', 'PayPal', '', '2026-10-09', 'none', { billingStart: '2024-11-09' }],
  ['Loopcloud', 109, 'yearly', true, 'Entertainment', '', '', '2027-04-30', 'requested', { billingStart: '2024-04-30', endsAt: '2027-04-30', notes: 'Cancellation requested on 29/9 (year not specified in sheet).' }],
  ['Antares (plugins)', 174.99, 'yearly', false, 'Software & tools', 'PayPal', '', '2027-01-11', 'none', { account: 'mail@walterdevos.be', billingStart: '2024-01-11', url: 'https://www.antarestech.com/my-account', notes: 'niet vergeten!! Cancelled at PayPal 11/11/2024.' }],
  ['ACE', 149, 'yearly', true, 'Software & tools', 'Unknown', '', '2027-04-09', 'none', { account: 'google oradio', billingStart: '2024-04-09', notes: 'niet vergeten!!' }],
  ['Microsoft 365 fons', 20, 'yearly', true, 'AI & productivity', 'PayPal', '', '2027-09-03', 'none', { billingStart: '2024-09-03' }],
  ['SoundCloud', 85, 'yearly', false, 'Entertainment', 'PayPal', '', '2027-02-12', 'requested', { billingStart: '2024-02-12', cancelledAt: '2025-02-02', endsAt: '2025-12-02' }],
  ['Kamatera', 98, 'monthly', false, 'Cloud & hosting', 'Mastercard', '', '2026-10-17', 'none', { billingStart: '2025-01-17' }],
  ['IDrive', 98, 'yearly', true, 'Cloud & hosting', 'Mastercard', '', '2027-03-02', 'none', { account: 'mail@walterdevos.be', billingStart: '2025-03-02', notes: 'opzeggen begin 2027 !!!' }],
  ['eDreams', 69.99, 'yearly', true, 'Travel & lifestyle', 'Mastercard', '', '2027-05-04', 'none', { billingStart: '2024-05-04', notes: 'opzeggen in mei. Active in the sheet; not included in its annual total.' }],
  ['Universal Minecraft Tool', 15, 'monthly', false, 'Entertainment', 'Mastercard', '', '2026-10-27', 'requested', { billingStart: '2024-03-27', cancelledAt: '2025-07-30' }],
  ['Gemini', 21.99, 'monthly', true, 'AI & productivity', 'Visa', '', '2026-10-05', 'none', { billingStart: '2025-06-05' }],
  ['OpenAI', 20, 'monthly', true, 'AI & productivity', '', '', '2026-10-29', 'requested', { billingStart: '2025-06-29' }],
  ['OpenAI Businesses', 64, 'monthly', false, 'AI & productivity', 'PayPal', '', '2026-10-04', 'none', { billingStart: '2025-10-04' }],
  ['OpenSubtitles', 4, 'monthly', false, 'Entertainment', 'PayPal', '', '2026-10-29', 'none', { url: 'https://www.opensubtitles.com/nl/users/subscriptions', notes: 'FastSpring. Original billing cycle start: 10/29 (year not specified).' }],
  ['GeForce NOW', 9.99, 'monthly', false, 'Entertainment', '', '', '2026-10-15', 'none', { billingStart: '2025-11-15' }],
  ['Base', 15, 'monthly', true, 'Software & tools', '', '', '2026-10-01', 'none', { billingStart: '2025-11-01' }],
  ['Fabhouse', 9.99, 'monthly', true, 'Entertainment', 'PayPal', '', '2026-10-22', 'planned', { billingStart: '2025-11-22', url: 'https://www.epoch.com/purchase_lookup?view=index', userId: '2867989823', email: 'walter.devos@oradio.net', notes: 'Cancellation status in original sheet: almost.' }],
  ['TradingView', 10.99, 'monthly', true, 'Software & tools', 'PayPal', '', '2026-10-29', 'none', { billingStart: '2026-01-29' }],
  ['OpenCode Zen', null, 'monthly', false, 'AI & productivity', '', '', '2026-10-01', 'none', { billingStart: '2025-11-01', notes: 'No amount shown in the original sheet.' }],
  ['Easynews', 11.99, 'monthly', true, 'Entertainment', '', '', '2026-10-28', 'none', { billingStart: '2025-03-28' }],
  ['Uber', 6.99, 'monthly', false, 'Travel & lifestyle', 'PayPal', '', '', 'requested', { notes: 'Cancellation requested on 29/9 (year not specified in sheet).' }],
];

export function initialSubscriptions() {
  return rows.map(([name, amount, interval, active, category, paymentMethod, last4, nextPayment, cancellation, extra], index) => ({
    id: `sheet-${index + 1}`, name, amount, interval, active, category, paymentMethod, last4, nextPayment, cancellation,
    billingStart: '', cancelledAt: '', endsAt: '', account: '', url: '', userId: '', email: '', notes: '',
    createdAt: '2026-09-29T00:00:00.000Z', ...extra,
  }));
}

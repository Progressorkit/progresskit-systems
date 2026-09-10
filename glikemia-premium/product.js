'use strict';
const form = document.querySelector('#review-form');
const statusLine = document.querySelector('#review-status');
const submit = document.querySelector('#submit-review');
let token = '';
async function getJSON(path) {
  const response = await fetch(path, {cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('Usługa jest chwilowo niedostępna. Spróbuj ponownie później.');
  return response.json();
}
async function refreshCount() {
  try {
    const data = await getJSON('/api/glikemia/downloads');
    if (!Number.isSafeInteger(data.downloads) || data.downloads < 0) throw new Error();
    document.querySelectorAll('[data-download-count]').forEach(el => { el.textContent = `${new Intl.NumberFormat('pl-PL').format(data.downloads)} pobrań APK`; });
  } catch {
    document.querySelectorAll('[data-download-count]').forEach(el => { el.textContent = 'Licznik pobrań chwilowo niedostępny'; });
  }
}
async function loadReviews() {
  const list = document.querySelector('#review-list');
  try {
    const data = await getJSON('/api/glikemia/reviews');
    list.replaceChildren();
    if (!data.reviews.length) { const p = document.createElement('p'); p.textContent = 'Pierwsze opinie pojawią się tutaj.'; list.append(p); }
    for (const review of data.reviews) {
      const card = document.createElement('article'); card.className = 'card';
      const name = document.createElement('h3'); name.className = 'review-name'; name.textContent = review.nickname;
      const meta = document.createElement('p'); meta.textContent = `${'★'.repeat(review.rating)} (${review.rating}/5) · ${new Date(review.created_at * 1000).toLocaleDateString('pl-PL')}${review.version ? ` · wersja ${review.version}` : ''}`;
      const comment = document.createElement('p'); comment.className = 'review-comment'; comment.textContent = review.comment;
      card.append(name, meta, comment); list.append(card);
    }
  } catch { list.textContent = 'Nie udało się pobrać opinii. Odśwież stronę lub spróbuj później.'; }
}
async function prepareForm() {
  submit.disabled = true;
  try { token = (await getJSON('/api/glikemia/review-token')).token; submit.disabled = false; statusLine.textContent = ''; }
  catch (error) { statusLine.textContent = `${error.message} Odśwież stronę, aby załadować formularz.`; }
}
form.addEventListener('submit', async event => {
  event.preventDefault(); submit.disabled = true; statusLine.textContent = 'Wysyłanie…';
  const fields = Object.fromEntries(new FormData(form));
  try {
    const response = await fetch('/api/glikemia/reviews', {method: 'POST', credentials: 'omit', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...fields, rating: Number(fields.rating), token}), signal: AbortSignal.timeout(10000)});
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Nie udało się wysłać opinii.');
    form.reset(); await prepareForm(); statusLine.textContent = data.message;
  } catch (error) { await prepareForm(); statusLine.textContent = error.message || 'Nie udało się wysłać opinii.'; }
});
document.querySelectorAll('a[href="/download/glikemia-premium"]').forEach(link => link.addEventListener('click', () => setTimeout(refreshCount, 1500)));
window.addEventListener('pageshow', refreshCount);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCount(); });
loadReviews(); prepareForm();

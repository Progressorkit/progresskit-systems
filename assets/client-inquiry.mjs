/* Same-origin inquiry submission. A receipt is shown only after a durable
   server acknowledgement. Draft, token and retry payload stay in this tab. */
const form = document.querySelector('[data-project-inquiry]');
if (form) {
  const submit = form.querySelector('[data-submit-inquiry]');
  const retryConnection = form.querySelector('[data-refresh-inquiry]');
  const newInquiry = form.querySelector('[data-new-inquiry]');
  const status = form.querySelector('[data-inquiry-status]');
  const exportStatus = form.querySelector('[data-brief-status]');
  const printCopy = form.querySelector('[data-brief-print]');
  const fields = [...form.querySelectorAll('[data-inquiry-field]')];
  const answerKeys = ['problem', 'users', 'processes', 'integrations', 'budget', 'deadline'];
  const contactKeys = ['contact-name', 'email', 'client-type', 'phone'];
  const value = key => form.querySelector('#brief-' + key).value.trim();
  const field = key => form.querySelector('#brief-' + key);
  const labels = key => form.querySelector(`label[for="brief-${key}"]`).firstChild.textContent.trim();
  let token = '', tokenExpires = 0, readyAt = 0, waitTimer = 0;
  let attempt = null, sending = false, accepted = false, tokenLoading = false;
  const headers = {'X-PK-Form': 'project-inquiry'};
  form.noValidate = true;

  function message(text, state = 'idle') {
    status.textContent = text;
    status.dataset.state = state;
    form.dataset.submissionState = state;
  }
  function lockFields(locked) { fields.forEach(e => { e.disabled = locked; }); }
  function refreshButton() {
    submit.disabled = sending || accepted || (!attempt && (!token || Date.now() < readyAt));
    submit.textContent = sending ? 'Zapisywanie zgłoszenia…' : attempt ? 'Ponów potwierdzenie wysyłki' : 'Wyślij projekt';
  }
  async function request(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, {credentials: 'omit', cache: 'no-store',
        redirect: 'error', ...options, signal: controller.signal});
      let data = null;
      try { data = await response.json(); } catch { /* An incomplete receipt is never success. */ }
      return {response, data};
    } finally { clearTimeout(timeout); }
  }
  async function prepare() {
    if (tokenLoading || sending || accepted || attempt) return;
    tokenLoading = true; token = ''; clearTimeout(waitTimer);
    retryConnection.hidden = true; refreshButton();
    message('Przygotowywanie bezpiecznej wysyłki…');
    try {
      if (location.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) throw new Error('HTTPS required');
      const {response, data} = await request('/api/project-inquiries/token', {headers});
      if (!response.ok || !data || !/^[A-Za-z0-9_-]{43}$/.test(data.token)
          || !Number.isInteger(data.min_wait_seconds) || data.min_wait_seconds < 0 || data.min_wait_seconds > 30
          || !Number.isInteger(data.expires_in) || data.expires_in < 60 || data.expires_in > 3600) throw new Error('Token unavailable');
      token = data.token; tokenExpires = Date.now() + data.expires_in * 1000;
      readyAt = Date.now() + data.min_wait_seconds * 1000 + 100;
      waitTimer = setTimeout(() => {
        if (!attempt && !accepted && !sending) message('Formularz gotowy. Potwierdzenie pojawi się po zapisaniu zgłoszenia.');
        refreshButton();
      }, Math.max(0, readyAt - Date.now()));
    } catch {
      message('Wysyłka jest chwilowo niedostępna. Treść pozostaje w tej karcie; możesz pobrać TXT lub zapisać PDF i ponowić połączenie.', 'error');
      retryConnection.hidden = false;
    } finally { tokenLoading = false; refreshButton(); }
  }
  function dataForSubmission() {
    return {token, submission_key: crypto.randomUUID(), contact_name: value('contact-name'),
      email: value('email'), client_type: value('client-type'), phone: value('phone'),
      answers: Object.fromEntries(answerKeys.map(key => [key, value(key)])), website: form.elements.website.value};
  }
  function validate() {
    fields.forEach(e => e.setCustomValidity(''));
    for (const key of ['contact-name', 'email', 'phone']) {
      const input = field(key);
      if (/[<>\r\n\t]/.test(input.value)) input.setCustomValidity('Wpisz zwykły tekst w jednej linii.');
    }
    if (value('contact-name').length < 2) field('contact-name').setCustomValidity('Podaj imię i nazwisko lub nazwę firmy (co najmniej 2 znaki).');
    if (value('problem').length < 10) field('problem').setCustomValidity('Opisz problem w co najmniej 10 znakach.');
    for (const key of answerKeys) if (/[<>]/.test(field(key).value)) field(key).setCustomValidity('Wpisz zwykły tekst bez znaczników HTML.');
    if (!form.reportValidity()) { message('Sprawdź wymagane pola: dane kontaktowe, poprawny e-mail, typ klienta i opis projektu.', 'error'); return false; }
    return true;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || accepted) return;
    if (!attempt) {
      if (!validate()) return;
      if (!token || Date.now() >= tokenExpires) { await prepare(); return; }
      if (Date.now() < readyAt) { message('Odczekaj chwilę, zanim wyślesz formularz.'); return; }
      attempt = {body: JSON.stringify(dataForSubmission()), uncertain: false};
    }
    sending = true; lockFields(true); refreshButton(); form.setAttribute('aria-busy', 'true');
    message('Zapisywanie zgłoszenia. Poczekaj na potwierdzenie…', 'sending');
    try {
      const {response, data} = await request('/api/project-inquiries', {
        method: 'POST', headers: {...headers, 'Content-Type': 'application/json'}, body: attempt.body,
      });
      const receipt = data && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(data.id)
        && data.status === 'new' && typeof data.created_at === 'string' && Number.isFinite(Date.parse(data.created_at));
      if (response.status === 201 && receipt) {
        accepted = true; attempt = null; newInquiry.hidden = false;
        const date = new Intl.DateTimeFormat('pl-PL', {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(data.created_at));
        message(`Zgłoszenie przyjęte. Numer: ${data.id}. Data: ${date}.`, 'accepted');
        status.focus({preventScroll: true});
      } else if ([400, 403, 413, 415, 422, 429].includes(response.status)) {
        const code = data?.detail?.code;
        // A rejection before the backend's idempotency lookup (for example a
        // rate limit) cannot disprove a previous commit whose reply was lost.
        // Preserve its original key/payload until that receipt is resolved.
        const confirmedMissing = response.status === 400 && ['token_expired', 'form_too_fast'].includes(code);
        if (attempt.uncertain && !confirmedMissing) throw new Error('Original receipt still unconfirmed');
        attempt = null; lockFields(false);
        // These responses explicitly reject acceptance; the draft remains editable.
        const errors = {
          400: 'Sesja formularza wygasła lub wysyłka nastąpiła zbyt szybko. Odśwież możliwość wysłania i spróbuj ponownie.',
          403: 'Nie można wysłać formularza z tego adresu strony. Otwórz stronę ProgressKit przez HTTPS.',
          413: 'Formularz jest za duży. Skróć opis; treść pozostaje zachowana.',
          415: 'Nie udało się przekazać formularza. Spróbuj ponownie z tej strony.',
          422: 'Sprawdź nazwę, adres e-mail, typ klienta oraz opis (minimum 10 znaków). Użyj zwykłego tekstu, do 6000 znaków na odpowiedź.',
          429: 'Przekroczono limit prób. Zgłoszenie nie zostało przyjęte. Zachowaj treść i spróbuj ponownie później.',
        };
        message(errors[response.status], 'error');
        if (code === 'token_expired' || code === 'form_too_fast') { token = ''; retryConnection.hidden = false; }
      } else throw new Error('No confirmed receipt');
    } catch {
      // An interrupted response can follow a successful commit. Keep precisely
      // the same token/key/payload, freeze edits and ask for its original receipt.
      if (attempt) attempt.uncertain = true;
      message('Nie udało się potwierdzić zapisu. Treść jest zachowana. Ponów potwierdzenie tej samej wysyłki — zabezpieczenie przed duplikatem jest aktywne. Możesz też pobrać TXT lub zapisać PDF.', 'uncertain');
    } finally {
      sending = false; form.removeAttribute('aria-busy'); refreshButton();
    }
  });
  retryConnection.addEventListener('click', prepare);
  newInquiry.addEventListener('click', () => {
    form.reset(); accepted = false; attempt = null; lockFields(false);
    newInquiry.hidden = true; field('contact-name').focus(); prepare();
  });
  fields.forEach(e => e.addEventListener('input', () => e.setCustomValidity('')));

  function exportFields() {
    return [...contactKeys, ...answerKeys].map(key => {
      const input = field(key);
      const text = input.tagName === 'SELECT' ? (input.value ? input.selectedOptions[0].textContent : '') : input.value;
      return [labels(key), text];
    });
  }
  form.querySelector('[data-download-brief]').addEventListener('click', () => {
    const content = ['ProgressKit Systems: opis projektu', ...exportFields().map(([label, text]) => `${label}\n${text || '—'}`),
      accepted ? status.textContent : 'Eksport lokalny. Ten plik nie stanowi potwierdzenia wysłania zgłoszenia.', 'Kontakt: pawel@progresskit.pl'].join('\n\n');
    const url = URL.createObjectURL(new Blob([content], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'progresskit-brief.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    exportStatus.textContent = 'Przygotowano lokalny plik TXT. Pobranie nie wysyła zgłoszenia.';
  });
  function preparePrint() {
    printCopy.replaceChildren();
    for (const [label, text] of exportFields()) {
      const heading = document.createElement('h4'), paragraph = document.createElement('p');
      heading.textContent = label; paragraph.textContent = text || '—'; printCopy.append(heading, paragraph);
    }
    const receipt = document.createElement('p');
    receipt.textContent = accepted ? status.textContent : 'Eksport lokalny. Ten dokument nie potwierdza wysłania zgłoszenia.';
    printCopy.append(receipt);
  }
  window.addEventListener('beforeprint', preparePrint);
  form.querySelector('[data-print]').addEventListener('click', preparePrint, {capture: true});
  prepare();
}

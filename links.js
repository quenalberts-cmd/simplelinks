const form = document.querySelector('#link-form');
const kind = document.querySelector('#kind');
const labelInput = document.querySelector('#label');
const urlInput = document.querySelector('#url');
const urlField = document.querySelector('#url-field');
const status = document.querySelector('#status');
const list = document.querySelector('#links');
const prefix = 'link-';
const linkId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const t = window.TrelloPowerUp?.iframe();
let entries = [];
let pending = false;

function websiteAddress(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Enter an HTTP or HTTPS website address.');
  }
  return url.href;
}

function linkButton(title, href) {
  const link = document.createElement('a');
  link.className = 'action';
  link.textContent = title;
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function render() {
  list.replaceChildren();
  for (const entry of entries) {
    const row = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = entry.label;
    const actions = document.createElement('div');
    actions.className = 'actions';
    if (entry.kind === 'revit') {
      actions.append(
        linkButton('Open in Revit', 'simplelinks-revit://open/' + entry.id),
        linkButton('Choose file…', 'simplelinks-revit://choose/' + entry.id),
      );
    } else {
      actions.append(linkButton('Open website', entry.url));
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', 'Remove ' + entry.label);
    remove.disabled = pending;
    remove.addEventListener('click', () => mutate(async () => {
      await t.remove('card', 'private', prefix + entry.id);
      entries = entries.filter((item) => item.id !== entry.id);
      status.textContent = entries.length ? 'Link removed.' : 'No links on this card yet.';
    }));
    actions.append(remove);
    row.append(title, actions);
    list.append(row);
  }
}

async function mutate(action) {
  if (pending) return;
  pending = true;
  form.querySelector('button').disabled = true;
  render();
  try {
    await action();
  } catch (error) {
    status.textContent = /4096/.test(String(error))
      ? 'This card has reached Trello’s link storage limit.'
      : 'The change could not be saved. Try again.';
  } finally {
    pending = false;
    form.querySelector('button').disabled = false;
    render();
  }
}

function updateForm() {
  const website = kind.value === 'web';
  urlField.hidden = !website;
  urlInput.required = website;
}

kind.addEventListener('change', updateForm);
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const label = labelInput.value.trim();
  if (!label) {
    status.textContent = 'Enter a name for the link.';
    labelInput.focus();
    return;
  }
  const entry = { id: crypto.randomUUID(), kind: kind.value, label };
  if (entry.kind === 'web') {
    try {
      entry.url = websiteAddress(urlInput.value);
    } catch {
      status.textContent = 'Enter an HTTP or HTTPS website address.';
      urlInput.focus();
      return;
    }
  }
  mutate(async () => {
    await t.set('card', 'private', prefix + entry.id, entry);
    entries.unshift(entry);
    form.reset();
    updateForm();
    status.textContent = entry.kind === 'revit'
      ? 'Click Choose file beside your new link to select the .rvt on this laptop.'
      : 'Website added.';
  });
});

async function load() {
  try {
    if (!t || window.top === window.self) {
      status.textContent = 'Open SimpleLinks from a Trello card.';
      return;
    }
    const data = await t.get('card', 'private');
    entries = Object.entries(data || {}).flatMap(([key, entry]) => {
      if (!entry || !linkId.test(entry.id) || key !== prefix + entry.id ||
          typeof entry.label !== 'string') return [];
      if (entry.kind === 'revit') return [entry];
      if (entry.kind !== 'web') return [];
      try {
        return [{ ...entry, url: websiteAddress(entry.url) }];
      } catch {
        return [];
      }
    });
    form.hidden = false;
    status.textContent = entries.length ? '' : 'No links on this card yet.';
    render();
  } catch {
    status.textContent = 'Links could not be loaded. Close SimpleLinks and reopen it.';
  }
}

load();

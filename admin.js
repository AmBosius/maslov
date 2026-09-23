// =========================================================
// Админка продавца: товары и заявки.
//
// Страница сама ничего не защищает и не должна: права проверяет база
// (политики в supabase/schema.sql). Даже если кто-то откроет admin.html
// и подменит скрипт, без записи в таблице admins он ничего не изменит.
// =========================================================

const CONFIG = window.MASLOV_CONFIG || {};
const SESSION_KEY = 'maslov-admin-session';

const STATUSES = {
  in_stock: 'В наличии',
  on_order: 'Под заказ',
  out: 'Нет — скрыт',
};

const REQUEST_STATUSES = {
  new: 'Новая',
  in_work: 'В работе',
  done: 'Готово',
};

const $ = id => document.getElementById(id);

// Всё, что пришло из базы, выводим только через экранирование:
// заявки пишут анонимные посетители, и в комментарии может оказаться HTML
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

const formatPrice = value => Number(value).toLocaleString('ru-RU') + ' ₽';

// ===== Сессия =====
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function setSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

async function authRequest(grantType, body) {
  const res = await fetch(`${CONFIG.supabaseUrl}/auth/v1/token?grant_type=${grantType}`, {
    method: 'POST',
    headers: { apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || 'Ошибка входа');
  setSession(data);
  return data;
}

const signIn = (email, password) => authRequest('password', { email, password });

function refreshSession() {
  const session = getSession();
  if (!session?.refresh_token) return Promise.reject(new Error('Нет сессии'));
  return authRequest('refresh_token', { refresh_token: session.refresh_token });
}

// Запрос к REST API от имени вошедшего продавца.
// Токен живёт час — при 401 один раз обновляем его и повторяем запрос.
async function api(path, options = {}, isRetry = false) {
  const session = getSession();
  const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: CONFIG.supabaseKey,
      Authorization: `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
  });

  if (res.status === 401 && !isRetry) {
    await refreshSession();
    return api(path, options, true);
  }

  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  return text ? JSON.parse(text) : null;
}

// ===== Уведомления =====
let toastTimer;

function toast(message, isError = false) {
  const el = $('toast');
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 5000 : 1800);
}

// ===== Вход и выход =====
function showLogin(message = '', isError = false) {
  $('panelView').hidden = true;
  $('loginView').hidden = false;
  $('loginStatus').textContent = message;
  $('loginStatus').classList.toggle('error', isError);
}

async function showPanel() {
  // Вошёл — ещё не значит админ: спрашиваем у базы
  const isAdmin = await api('rpc/is_admin', { method: 'POST', body: '{}' });
  if (!isAdmin) {
    setSession(null);
    showLogin('У этой учётной записи нет прав продавца.', true);
    return;
  }
  $('loginView').hidden = true;
  $('panelView').hidden = false;
  await Promise.all([loadProducts(), loadRequests()]);
}

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  $('loginBtn').disabled = true;
  showLogin('Вхожу…');
  try {
    await signIn(form.get('email'), form.get('password'));
    await showPanel();
  } catch (err) {
    showLogin(err.message === 'Invalid login credentials' ? 'Неверная почта или пароль' : err.message, true);
  } finally {
    $('loginBtn').disabled = false;
  }
});

$('logoutBtn').addEventListener('click', () => {
  setSession(null);
  showLogin('Вы вышли.');
});

// ===== Вкладки =====
document.querySelectorAll('.tabs__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs__btn').forEach(b => b.classList.toggle('active', b === btn));
    $('tab-products').hidden = btn.dataset.tab !== 'products';
    $('tab-requests').hidden = btn.dataset.tab !== 'requests';
  });
});

// ===== Товары =====
let products = [];

async function loadProducts() {
  products = await api('products?select=*&order=sort_order,brand');
  renderProducts();
}

function productRowHtml(p) {
  const options = Object.entries(STATUSES)
    .map(([value, label]) => `<option value="${value}"${p.status === value ? ' selected' : ''}>${label}</option>`)
    .join('');

  return `
    <li class="row${p.status === 'out' ? ' row--out' : ''}" data-id="${esc(p.id)}">
      <div class="row__info">
        <p class="row__brand">${esc(p.brand)}</p>
        <p class="row__name">${esc(p.name)}</p>
        <p class="row__muted">${esc((p.approvals || []).join(' · '))}</p>
      </div>
      <p class="row__visc row__visc-cell">${esc(p.viscosity)}</p>
      <p class="row__muted row__vol-cell">${esc(String(p.volume).replace('.', ','))}&nbsp;л</p>
      <div class="row__price-cell">
        <input class="cell-input" type="number" min="0" step="10" data-field="price"
               value="${esc(p.price)}" aria-label="Цена, ₽">
      </div>
      <div class="row__status-cell">
        <select class="cell-select" data-field="status" data-status="${esc(p.status)}" aria-label="Статус">${options}</select>
      </div>
      <button class="row__delete" title="Удалить товар" aria-label="Удалить ${esc(p.brand)} ${esc(p.name)}">✕</button>
    </li>`;
}

function renderProducts() {
  $('productRows').innerHTML = products.length
    ? products.map(productRowHtml).join('')
    : '<li class="rows__empty">Товаров пока нет — добавьте первый.</li>';
}

// Цена и статус сохраняются сразу, по событию change (для цены — после ухода из поля)
$('productRows').addEventListener('change', async (e) => {
  const field = e.target.dataset.field;
  if (!field) return;
  const row = e.target.closest('.row');
  const id = row.dataset.id;
  const value = field === 'price' ? Math.max(0, Math.round(Number(e.target.value))) : e.target.value;

  try {
    const [updated] = await api(`products?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: value }),
    });
    const index = products.findIndex(p => p.id === id);
    products[index] = updated;
    row.outerHTML = productRowHtml(updated);
    toast(field === 'price' ? `Цена: ${formatPrice(updated.price)}` : `Статус: ${STATUSES[updated.status]}`);
  } catch (err) {
    toast('Не сохранилось: ' + err.message, true);
    renderProducts();   // вернуть в строке то, что на самом деле в базе
  }
});

$('productRows').addEventListener('click', async (e) => {
  const btn = e.target.closest('.row__delete');
  if (!btn) return;
  const id = btn.closest('.row').dataset.id;
  const product = products.find(p => p.id === id);
  if (!confirm(`Удалить «${product.brand} ${product.name}» насовсем?\nЕсли товара просто нет — лучше поставить статус «Нет», он скроется с сайта.`)) return;

  try {
    await api(`products?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    products = products.filter(p => p.id !== id);
    renderProducts();
    toast('Товар удалён');
  } catch (err) {
    toast('Не удалилось: ' + err.message, true);
  }
});

// Новый товар
$('addProductBtn').addEventListener('click', () => {
  $('newProductForm').hidden = false;
  $('newProductForm').elements.brand.focus();
});

$('cancelProductBtn').addEventListener('click', () => {
  $('newProductForm').reset();
  $('newProductForm').hidden = true;
});

$('newProductForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const maxSort = products.reduce((max, p) => Math.max(max, p.sort_order), 0);

  const product = {
    brand: form.get('brand').trim(),
    name: form.get('name').trim(),
    viscosity: form.get('viscosity').trim().toUpperCase(),
    volume: Number(form.get('volume')),
    price: Math.round(Number(form.get('price'))),
    approvals: form.get('approvals').split(',').map(a => a.trim()).filter(Boolean),
    sort_order: maxSort + 10,   // новый товар — в конец списка
  };

  try {
    const [created] = await api('products', { method: 'POST', body: JSON.stringify(product) });
    products.push(created);
    renderProducts();
    e.target.reset();
    e.target.hidden = true;
    toast('Товар добавлен — уже на сайте');
  } catch (err) {
    toast('Не добавился: ' + err.message, true);
  }
});

// ===== Заявки =====
let requests = [];
let requestFilter = 'open';

async function loadRequests() {
  requests = await api('requests?select=*&order=created_at.desc&limit=200');
  renderRequests();
}

function requestHtml(r) {
  const date = new Date(r.created_at).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const items = (r.items || []).map(i =>
    `<li><span>${esc(i.brand)} ${esc(i.name)} ${esc(i.viscosity)}, ${esc(i.volume)}&nbsp;л</span><span>${formatPrice(i.price)}</span></li>`
  ).join('');
  const options = Object.entries(REQUEST_STATUSES)
    .map(([value, label]) => `<option value="${value}"${r.status === value ? ' selected' : ''}>${label}</option>`)
    .join('');
  const phoneHref = String(r.phone).replace(/[^\d+]/g, '');

  return `
    <li class="req${r.status === 'new' ? ' req--new' : ''}" data-id="${esc(r.id)}">
      <div>
        <p class="req__number">${esc(r.number)}</p>
        <p class="row__muted">${date}</p>
      </div>
      <div>
        <a class="req__phone" href="tel:${esc(phoneHref)}">${esc(r.phone)}</a>
        <p>${esc(r.name) || '<span class="row__muted">Без имени</span>'}</p>
        ${r.car ? `<p class="row__muted">${esc(r.car)}</p>` : ''}
        ${r.comment ? `<p class="req__comment">${esc(r.comment)}</p>` : ''}
      </div>
      <div>
        ${items ? `<ul class="req__items">${items}</ul><p class="req__total">Итого ${formatPrice(r.total)}</p>` : '<p class="row__muted">Без позиций — просто перезвонить</p>'}
      </div>
      <div>
        <select class="cell-select" data-field="status" aria-label="Статус заявки">${options}</select>
      </div>
    </li>`;
}

function renderRequests() {
  const visible = requestFilter === 'all' ? requests : requests.filter(r => r.status !== 'done');
  $('requestRows').innerHTML = visible.length
    ? visible.map(requestHtml).join('')
    : '<li class="rows__empty">Заявок нет. Как только клиент оставит номер — он появится здесь.</li>';

  const fresh = requests.filter(r => r.status === 'new').length;
  $('newCount').hidden = fresh === 0;
  $('newCount').textContent = fresh;
}

$('requestRows').addEventListener('change', async (e) => {
  if (e.target.dataset.field !== 'status') return;
  const id = e.target.closest('.req').dataset.id;
  try {
    const [updated] = await api(`requests?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: e.target.value }),
    });
    requests[requests.findIndex(r => r.id === id)] = updated;
    renderRequests();
    toast(`Заявка ${updated.number}: ${REQUEST_STATUSES[updated.status].toLowerCase()}`);
  } catch (err) {
    toast('Не сохранилось: ' + err.message, true);
    renderRequests();
  }
});

$('requestFilter').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  document.querySelectorAll('#requestFilter .chip').forEach(c => c.classList.toggle('active', c === chip));
  requestFilter = chip.dataset.value;
  renderRequests();
});

$('reloadRequestsBtn').addEventListener('click', async () => {
  try {
    await loadRequests();
    toast('Список обновлён');
  } catch (err) {
    toast('Не обновилось: ' + err.message, true);
  }
});

// ===== Старт =====
if (!CONFIG.supabaseUrl || CONFIG.supabaseUrl.includes('ВСТАВЬТЕ')) {
  showLogin('База ещё не подключена: впишите адрес и ключ в config.js (см. SETUP.md).', true);
  $('loginBtn').disabled = true;
} else if (getSession()) {
  showPanel().catch(() => {
    setSession(null);
    showLogin('Сессия истекла, войдите снова.');
  });
} else {
  showLogin();
}

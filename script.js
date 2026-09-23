// ===== Шапка: фон появляется, когда страницу прокрутили ниже видео =====
const header = document.getElementById('header');

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.6);
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

// ===== Видео: при настройке «уменьшить движение» не проигрываем =====
const heroVideo = document.querySelector('.hero__video');

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  heroVideo.removeAttribute('autoplay');
  heroVideo.pause();
}

// ===== Мобильное меню =====
const burgerBtn = document.getElementById('burgerBtn');
const mainnavList = document.getElementById('mainnavList');

function setMenu(isOpen) {
  mainnavList.classList.toggle('open', isOpen);
  burgerBtn.classList.toggle('open', isOpen);
  burgerBtn.setAttribute('aria-expanded', String(isOpen));
}

burgerBtn.addEventListener('click', () => {
  setMenu(!mainnavList.classList.contains('open'));
});

mainnavList.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => setMenu(false));
});

// ===== Данные каталога =====
// Сначала база Supabase, при сбое — снимок data/products.json.
// Пустая витрина из-за сетевого сбоя хуже слегка устаревшей.
const CONFIG = window.MASLOV_CONFIG || {};
const hasBackend = Boolean(
  CONFIG.supabaseUrl && CONFIG.supabaseKey && !CONFIG.supabaseUrl.includes('ВСТАВЬТЕ')
);

let products = [];

// Запрос к REST API Supabase с публичным ключом
async function supabase(path, options = {}) {
  const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: CONFIG.supabaseKey,
      Authorization: `Bearer ${CONFIG.supabaseKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

async function loadProducts() {
  if (hasBackend) {
    try {
      // Скрытые товары база не отдаёт сама — это решает политика доступа
      return await supabase('products?select=*&order=sort_order,brand');
    } catch (err) {
      console.warn('База недоступна, показываю снимок каталога:', err);
    }
  }
  const res = await fetch('data/products.json?v=1');
  return res.json();
}

// ===== Общие помощники =====
const formatPrice = value => value.toLocaleString('ru-RU') + ' ₽';
const formatLitres = value => String(value).replace('.', ',') + ' л';

// Разметка строки товара в каталоге
function productRow(product) {
  const isAdded = cart.has(product.id);
  return `
    <li class="product">
      <div class="product__info">
        <p class="product__brand">${product.brand}</p>
        <p class="product__name">${product.name}</p>
        <p class="product__approvals">${product.approvals.join(' · ')}</p>
        ${product.status === 'on_order' ? '<p class="product__status">Под заказ — привезу за 2–3 дня</p>' : ''}
      </div>
      <p class="product__viscosity">${product.viscosity}</p>
      <p class="product__volume">${formatLitres(product.volume)}</p>
      <p class="product__price">${formatPrice(product.price)}</p>
      <button class="product__add${isAdded ? ' added' : ''}" data-id="${product.id}"
              aria-label="${isAdded ? 'Убрать из заявки' : 'Добавить в заявку'}: ${product.brand} ${product.name}">
        ${isAdded ? '✓' : '+'}
      </button>
    </li>`;
}

// ===== Заявка (корзина) =====
const cart = new Set();
const cartbar = document.getElementById('cartbar');
const cartCount = document.getElementById('cartCount');
const cartSum = document.getElementById('cartSum');

// Склонение: 1 позиция, 2 позиции, 5 позиций
function pluralPositions(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'позиция';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'позиции';
  return 'позиций';
}

function updateCart() {
  const items = products.filter(p => cart.has(p.id));
  const sum = items.reduce((total, p) => total + p.price, 0);

  cartbar.hidden = items.length === 0;
  cartCount.textContent = `${items.length} ${pluralPositions(items.length)}`;
  cartSum.textContent = formatPrice(sum);

  document.querySelectorAll('.product__add').forEach(btn => {
    const isAdded = cart.has(btn.dataset.id);
    btn.classList.toggle('added', isAdded);
    btn.textContent = isAdded ? '✓' : '+';
  });

  document.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
}

// Один обработчик на всю страницу ловит клики по любым кнопкам «в заявку»
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.product__add');
  if (!btn) return;
  const id = btn.dataset.id;
  if (cart.has(id)) {
    cart.delete(id);
  } else {
    cart.add(id);
  }
  updateCart();
});

// ===== Каталог с фильтрами =====
const catalogList = document.getElementById('catalogList');
const catalogCount = document.getElementById('catalogCount');
const catalogFilters = document.getElementById('catalogFilters');
const activeFilters = { viscosity: 'all', brand: 'all' };

function renderCatalog() {
  const items = products.filter(p =>
    (activeFilters.viscosity === 'all' || p.viscosity === activeFilters.viscosity) &&
    (activeFilters.brand === 'all' || p.brand === activeFilters.brand)
  );

  catalogList.innerHTML = items.length
    ? items.map(productRow).join('')
    : '<li class="products__none">Такого сочетания сейчас нет. Напишите — привезу под заказ за 2–3 дня.</li>';

  catalogCount.textContent = `Показано ${items.length} из ${products.length}`;
}

// Кнопки фильтров собираем из самих товаров
function renderFilters() {
  const unique = key => [...new Set(products.map(p => p[key]))];
  const groups = {
    viscosity: ['Любая вязкость', unique('viscosity').sort()],
    brand: ['Все бренды', unique('brand')],
  };

  catalogFilters.querySelectorAll('.filters__group').forEach(group => {
    const [allLabel, values] = groups[group.dataset.filter];
    group.innerHTML =
      `<button class="chip active" data-value="all">${allLabel}</button>` +
      values.map(v => `<button class="chip" data-value="${v}">${v}</button>`).join('');
  });
}

catalogFilters.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const group = chip.closest('.filters__group');
  group.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
  activeFilters[group.dataset.filter] = chip.dataset.value;
  renderCatalog();
});

loadProducts()
  .then(list => {
    products = list;
    renderFilters();
    renderCatalog();
  })
  .catch(err => {
    console.error(err);
    catalogList.innerHTML = '<li class="products__none">Каталог не загрузился. Позвоните — расскажу, что есть: +7 999 000-11-22.</li>';
  });

// ===== Форма заявки =====
const requestForm = document.getElementById('requestForm');
const requestPhone = document.getElementById('requestPhone');
const phoneError = document.getElementById('phoneError');
const requestItems = document.getElementById('requestItems');
const requestItemsList = document.getElementById('requestItemsList');
const requestDone = document.getElementById('requestDone');
const requestNumber = document.getElementById('requestNumber');
const requestSend = document.getElementById('requestSend');
const requestFail = document.getElementById('requestFail');

// Маска телефона: из любых введённых цифр собираем +7 (999) 000-11-22
function formatPhone(value) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('7') || digits.startsWith('8')) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  let result = '+7';
  if (digits.length > 0) result += ' (' + digits.slice(0, 3);
  if (digits.length >= 3) result += ')';
  if (digits.length > 3) result += ' ' + digits.slice(3, 6);
  if (digits.length > 6) result += '-' + digits.slice(6, 8);
  if (digits.length > 8) result += '-' + digits.slice(8, 10);
  return result;
}

const phoneDigits = value => value.replace(/\D/g, '').slice(1);

requestPhone.addEventListener('input', () => {
  requestPhone.value = formatPhone(requestPhone.value);
  if (phoneDigits(requestPhone.value).length === 10) {
    requestPhone.classList.remove('invalid');
    phoneError.hidden = true;
  }
});

requestPhone.addEventListener('focus', () => {
  if (!requestPhone.value) requestPhone.value = '+7 ';
});

requestPhone.addEventListener('blur', () => {
  if (phoneDigits(requestPhone.value).length === 0) requestPhone.value = '';
});

// Список позиций в форме обновляется вместе с заявкой
document.addEventListener('cart:change', (e) => {
  const items = e.detail;
  requestItems.hidden = items.length === 0;
  requestItemsList.innerHTML = items.map(p =>
    `<li><span>${p.brand} ${p.name} ${p.viscosity}, ${formatLitres(p.volume)}</span><span>${formatPrice(p.price)}</span></li>`
  ).join('');
});

requestForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (phoneDigits(requestPhone.value).length !== 10) {
    requestPhone.classList.add('invalid');
    phoneError.hidden = false;
    requestPhone.focus();
    return;
  }

  // Шлём только id товаров: позиции и сумму база пересчитает сама
  const payload = { ...Object.fromEntries(new FormData(requestForm)), items: [...cart] };

  requestSend.disabled = true;
  requestSend.textContent = 'Отправляю…';
  requestFail.hidden = true;

  try {
    let number = null;
    if (hasBackend) {
      number = await supabase('rpc/submit_request', {
        method: 'POST',
        body: JSON.stringify({ payload }),
      });
    } else {
      console.log('Демо-режим, база не подключена. Заявка:', payload);
    }

    requestNumber.textContent = number ? `Номер заявки: ${number}` : '';
    requestDone.hidden = false;
    requestForm.reset();
    cart.clear();
    updateCart();
  } catch (err) {
    console.error('Заявка не отправилась:', err);
    requestFail.hidden = false;
  } finally {
    requestSend.disabled = false;
    requestSend.textContent = 'Жду звонка';
  }
});

// ===== Плашка заявки прячется, когда форма уже на экране =====
const requestSection = document.getElementById('contacts');
new IntersectionObserver(([entry]) => {
  cartbar.classList.toggle('cartbar--away', entry.isIntersecting);
}, { threshold: 0.15 }).observe(requestSection);

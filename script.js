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

// ===== Данные: товары в наличии =====
// Цены демонстрационные. approvals — допуски производителей авто.
const PRODUCTS = [
  { id: 'motul-8100-xclean-530', brand: 'Motul', name: '8100 X-clean', viscosity: '5W-30', volume: 5, price: 7490, approvals: ['VW 504 00', 'VW 507 00', 'ACEA C3'] },
  { id: 'motul-8100-xcess-540', brand: 'Motul', name: '8100 X-cess', viscosity: '5W-40', volume: 5, price: 6990, approvals: ['VW 502 00', 'MB 229.5', 'RN0700', 'RN0710'] },
  { id: 'lm-toptec-4200-530', brand: 'Liqui Moly', name: 'Top Tec 4200', viscosity: '5W-30', volume: 5, price: 7890, approvals: ['VW 504 00', 'VW 507 00', 'MB 229.51'] },
  { id: 'lm-special-aa-020', brand: 'Liqui Moly', name: 'Special Tec AA', viscosity: '0W-20', volume: 4, price: 5690, approvals: ['API SP', 'ILSAC GF-6A'] },
  { id: 'lm-molygen-540', brand: 'Liqui Moly', name: 'Molygen New Generation', viscosity: '5W-40', volume: 4, price: 5290, approvals: ['API SN', 'ACEA A3/B4', 'VW 502 00'] },
  { id: 'mobil1-esp-530', brand: 'Mobil 1', name: 'ESP', viscosity: '5W-30', volume: 4, price: 5990, approvals: ['VW 504 00', 'VW 507 00', 'MB 229.52'] },
  { id: 'mobil1-020', brand: 'Mobil 1', name: 'Advanced Fuel Economy', viscosity: '0W-20', volume: 4, price: 5490, approvals: ['API SP', 'ILSAC GF-6A'] },
  { id: 'castrol-edge-530', brand: 'Castrol', name: 'EDGE LL', viscosity: '5W-30', volume: 4, price: 4890, approvals: ['VW 504 00', 'VW 507 00'] },
  { id: 'castrol-magnatec-540', brand: 'Castrol', name: 'Magnatec A3/B4', viscosity: '5W-40', volume: 4, price: 3790, approvals: ['API SN', 'ACEA A3/B4', 'VW 502 00', 'RN0700'] },
  { id: 'shell-ultra-540', brand: 'Shell', name: 'Helix Ultra', viscosity: '5W-40', volume: 4, price: 4290, approvals: ['API SP', 'VW 502 00', 'MB 229.5', 'RN0700', 'RN0710'] },
  { id: 'shell-hx8-530', brand: 'Shell', name: 'Helix HX8 ECT', viscosity: '5W-30', volume: 4, price: 3890, approvals: ['API SN', 'ACEA C3', 'VW 504 00', 'VW 507 00'] },
  { id: 'eneos-touring-530', brand: 'ENEOS', name: 'Premium Touring', viscosity: '5W-30', volume: 4, price: 3590, approvals: ['API SN', 'ILSAC GF-5'] },
  { id: 'eneos-xprime-020', brand: 'ENEOS', name: 'X Prime', viscosity: '0W-20', volume: 4, price: 4190, approvals: ['API SP', 'ILSAC GF-6A'] },
];

// ===== Данные: машины для подбора =====
// viscosities — что допускает производитель; approvals — нужен хотя бы один из допусков;
// capacity — объём заливки с фильтром, литры.
const CARS = {
  'Lada': {
    'Vesta': [
      { engine: '1.6 л, 106 л.с. (21129)', viscosities: ['5W-30', '5W-40'], approvals: ['API SN', 'API SP', 'ACEA A3/B4'], capacity: 4.4 },
      { engine: '1.8 л, 122 л.с. (21179)', viscosities: ['5W-30', '5W-40'], approvals: ['API SN', 'API SP', 'ACEA A3/B4'], capacity: 4.4 },
    ],
  },
  'Kia': {
    'Rio IV': [
      { engine: '1.4 л, 100 л.с. (G4LC)', viscosities: ['0W-20', '5W-30'], approvals: ['API SP', 'API SN', 'ILSAC GF-6A', 'ILSAC GF-5'], capacity: 3.6 },
      { engine: '1.6 л, 123 л.с. (G4FG)', viscosities: ['0W-20', '5W-30'], approvals: ['API SP', 'API SN', 'ILSAC GF-6A', 'ILSAC GF-5'], capacity: 3.6 },
    ],
  },
  'Hyundai': {
    'Solaris II': [
      { engine: '1.6 л, 123 л.с. (G4FG)', viscosities: ['0W-20', '5W-30'], approvals: ['API SP', 'API SN', 'ILSAC GF-6A', 'ILSAC GF-5'], capacity: 3.6 },
    ],
    'Creta': [
      { engine: '1.6 л, 121 л.с. (G4FG)', viscosities: ['0W-20', '5W-30'], approvals: ['API SP', 'API SN', 'ILSAC GF-6A', 'ILSAC GF-5'], capacity: 3.6 },
      { engine: '2.0 л, 149 л.с. (G4NA)', viscosities: ['0W-20', '5W-30'], approvals: ['API SP', 'API SN', 'ILSAC GF-6A', 'ILSAC GF-5'], capacity: 4.0 },
    ],
  },
  'Toyota': {
    'Camry XV70': [
      { engine: '2.0 л, 150 л.с. (6AR-FSE)', viscosities: ['0W-20'], approvals: ['API SP', 'ILSAC GF-6A'], capacity: 4.2 },
      { engine: '2.5 л, 200 л.с. (A25A-FKS)', viscosities: ['0W-20'], approvals: ['API SP', 'ILSAC GF-6A'], capacity: 4.5 },
    ],
  },
  'Volkswagen': {
    'Polo седан': [
      { engine: '1.6 MPI, 110 л.с. (CWVA)', viscosities: ['5W-30', '5W-40'], approvals: ['VW 502 00', 'VW 504 00'], capacity: 3.6 },
      { engine: '1.4 TSI, 125 л.с. (CZCA)', viscosities: ['5W-30', '5W-40'], approvals: ['VW 502 00', 'VW 504 00'], capacity: 4.0 },
    ],
  },
  'Skoda': {
    'Octavia A7': [
      { engine: '1.4 TSI, 150 л.с. (CZDA)', viscosities: ['5W-30', '5W-40'], approvals: ['VW 502 00', 'VW 504 00'], capacity: 4.0 },
      { engine: '1.8 TSI, 180 л.с. (CJSA)', viscosities: ['5W-30', '5W-40'], approvals: ['VW 502 00', 'VW 504 00'], capacity: 5.7 },
    ],
  },
  'Renault': {
    'Logan II': [
      { engine: '1.6 л, 82 л.с. (K7M)', viscosities: ['5W-40'], approvals: ['RN0700', 'RN0710'], capacity: 3.3 },
      { engine: '1.6 л, 102 л.с. (K4M)', viscosities: ['5W-40'], approvals: ['RN0700', 'RN0710'], capacity: 4.8 },
    ],
  },
};

// ===== Общие помощники =====
const formatPrice = value => value.toLocaleString('ru-RU') + ' ₽';
const formatLitres = value => String(value).replace('.', ',') + ' л';

// Какие канистры взять под объём заливки: сначала крупные, остаток — литровыми
function suggestCans(capacity) {
  if (capacity <= 4) return 'хватит канистры 4 л';
  if (capacity <= 5) return 'хватит канистры 5 л';
  const extra = Math.ceil(capacity - 5);
  return `канистра 5 л + ${extra} л доливки`;
}

// Разметка строки товара — общая для каталога и подбора
function productRow(product) {
  const isAdded = cart.has(product.id);
  return `
    <li class="product">
      <div class="product__info">
        <p class="product__brand">${product.brand}</p>
        <p class="product__name">${product.name}</p>
        <p class="product__approvals">${product.approvals.join(' · ')}</p>
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
  const items = PRODUCTS.filter(p => cart.has(p.id));
  const sum = items.reduce((total, p) => total + p.price, 0);

  cartbar.hidden = items.length === 0;
  cartCount.textContent = `${items.length} ${pluralPositions(items.length)}`;
  cartSum.textContent = formatPrice(sum);

  // Кнопки одного товара могут быть и в каталоге, и в подборе — обновляем все
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
  const items = PRODUCTS.filter(p =>
    (activeFilters.viscosity === 'all' || p.viscosity === activeFilters.viscosity) &&
    (activeFilters.brand === 'all' || p.brand === activeFilters.brand)
  );

  catalogList.innerHTML = items.length
    ? items.map(productRow).join('')
    : '<li class="products__none">Такого сочетания сейчас нет. Напишите — привезу под заказ за 2–3 дня.</li>';

  catalogCount.textContent = `Показано ${items.length} из ${PRODUCTS.length}`;
}

catalogFilters.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  const group = chip.closest('.filters__group');
  group.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === chip));
  activeFilters[group.dataset.filter] = chip.dataset.value;
  renderCatalog();
});

renderCatalog();

// ===== Подбор по автомобилю =====
const pickMake = document.getElementById('pickMake');
const pickModel = document.getElementById('pickModel');
const pickEngine = document.getElementById('pickEngine');
const pickerResult = document.getElementById('pickerResult');
const pickerEmpty = document.getElementById('pickerEmpty');
const pickerSpecs = document.getElementById('pickerSpecs');
const pickerProducts = document.getElementById('pickerProducts');

// Заполнить select списком вариантов
function fillSelect(select, placeholder, values) {
  select.innerHTML = `<option value="">${placeholder}</option>` +
    values.map((v, i) => `<option value="${i}">${v}</option>`).join('');
  select.disabled = values.length === 0;
}

fillSelect(pickMake, 'Выберите марку', Object.keys(CARS));
// У марок value — индекс; переводим обратно в название
const makeNames = Object.keys(CARS);

function resetResult() {
  pickerResult.hidden = true;
  pickerEmpty.hidden = false;
}

pickMake.addEventListener('change', () => {
  const make = makeNames[pickMake.value];
  fillSelect(pickModel, make ? 'Выберите модель' : 'Сначала марку', make ? Object.keys(CARS[make]) : []);
  fillSelect(pickEngine, 'Сначала модель', []);
  resetResult();
});

pickModel.addEventListener('change', () => {
  const make = makeNames[pickMake.value];
  const model = Object.keys(CARS[make])[pickModel.value];
  const engines = model ? CARS[make][model].map(e => e.engine) : [];
  fillSelect(pickEngine, model ? 'Выберите двигатель' : 'Сначала модель', engines);
  resetResult();
});

pickEngine.addEventListener('change', () => {
  const make = makeNames[pickMake.value];
  const model = Object.keys(CARS[make])[pickModel.value];
  const car = CARS[make][model][pickEngine.value];
  if (!car) {
    resetResult();
    return;
  }
  renderPick(car);
});

function renderPick(car) {
  // Подходит масло нужной вязкости, у которого есть хотя бы один из требуемых допусков
  const matches = PRODUCTS.filter(p =>
    car.viscosities.includes(p.viscosity) &&
    p.approvals.some(a => car.approvals.includes(a))
  );

  pickerSpecs.innerHTML = `
    <div><dt>Вязкость</dt><dd>${car.viscosities.join(' или ')}</dd></div>
    <div><dt>Допуск</dt><dd>${car.approvals.slice(0, 2).join(', ')}</dd></div>
    <div><dt>Объём заливки</dt><dd>${formatLitres(car.capacity)}<small>${suggestCans(car.capacity)}</small></dd></div>`;

  pickerProducts.innerHTML = matches.length
    ? matches.map(productRow).join('')
    : '<li class="products__none">Сейчас в наличии нет. Оставьте заявку — привезу за 2–3 дня.</li>';

  pickerEmpty.hidden = true;
  pickerResult.hidden = false;

  // Машину из подбора сразу подставляем в заявку, чтобы не вводить второй раз
  const make = makeNames[pickMake.value];
  const model = Object.keys(CARS[make])[pickModel.value];
  requestCar.value = `${make} ${model}, ${car.engine}`;
}

// ===== Форма заявки =====
const requestForm = document.getElementById('requestForm');
const requestPhone = document.getElementById('requestPhone');
const requestCar = document.getElementById('requestCar');
const phoneError = document.getElementById('phoneError');
const requestItems = document.getElementById('requestItems');
const requestItemsList = document.getElementById('requestItemsList');
const requestDone = document.getElementById('requestDone');

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

requestForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (phoneDigits(requestPhone.value).length !== 10) {
    requestPhone.classList.add('invalid');
    phoneError.hidden = false;
    requestPhone.focus();
    return;
  }

  // Демо: бэкенда нет, поэтому просто показываем, что ушло бы продавцу
  const data = Object.fromEntries(new FormData(requestForm));
  data.items = PRODUCTS.filter(p => cart.has(p.id)).map(p => `${p.brand} ${p.name} ${p.viscosity}`);
  console.log('Заявка:', data);

  requestDone.hidden = false;
  cart.clear();
  updateCart();
});

// ===== Плашка заявки прячется, когда форма уже на экране =====
const requestSection = document.getElementById('contacts');
new IntersectionObserver(([entry]) => {
  cartbar.classList.toggle('cartbar--away', entry.isIntersecting);
}, { threshold: 0.15 }).observe(requestSection);

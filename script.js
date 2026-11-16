// ================================================================
// КОНСТАНТЫ И СОСТОЯНИЕ
// ================================================================
const KEYS = {
  supplies: 'diabetes_supplies_v8',
  doctors:  'diabetes_doctors_v1',
  tests:    'diabetes_tests_v1',
  history:  'diabetes_history_v1',   // ← новое
};

let history = [];
let supplies = [];
let doctors  = [];
let tests    = [];

// ================================================================
// СТАРТОВЫЕ ДАННЫЕ
// ================================================================
function defaultSupplies() {
  const n = Date.now();
  return [
    { id: n + 1, name: 'Инсулин Апидра', count: 2,  img: 'img/apidra.png' },
    { id: n + 2, name: 'Гларгин',        count: 2,  img: 'img/glargin.png' },
    { id: n + 3, name: 'Канюли',         count: 10, img: 'img/cannula.png' },
    { id: n + 4, name: 'Резервуары',     count: 5,  img: 'img/reservoir.png' },
    { id: n + 5, name: 'Либра',          count: 1,  img: 'img/libre.png' },
    { id: n + 6, name: 'Сенсоры',        count: 3,  img: 'img/sensor.png' },
    { id: n + 7, name: 'Тест-полоски',   count: 50, img: 'img/strips.png' },
  ];
}

function defaultDoctors() {
  return [];
}

function defaultTests() {
  return [];
}

// ================================================================
// ЗАГРУЗКА / СОХРАНЕНИЕ
// ================================================================
function loadAll() {
  supplies = load(KEYS.supplies, defaultSupplies);
  doctors  = load(KEYS.doctors,  defaultDoctors);
  tests    = load(KEYS.tests,    defaultTests);
  history  = load(KEYS.history,  () => []);   // ← новое
}

function load(key, defFn) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    const def = defFn();
    localStorage.setItem(key, JSON.stringify(def));
    return def;
  } catch {
    return defFn();
  }
}

function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

// ================================================================
// УТИЛИТЫ
// ================================================================
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function valueClass(n) {
  if (n === 0) return 'value-zero';
  if (n <= 2)  return 'value-low';
  return 'value-ok';
}

// ================================================================
// ОТРИСОВКА: РАСХОДНИКИ
// ================================================================
function renderSupplies() {
  const grid = document.getElementById('grid-supplies');
  if (!supplies.length) {
    grid.innerHTML = '<div class="empty">Нет расходников</div>';
    return;
  }
  grid.innerHTML = supplies.map(item => {
    const img = item.img
      ? `<img class="card-img" src="${escapeHtml(item.img)}" alt="${escapeHtml(item.name)}"
             onerror="this.outerHTML='<div class=&quot;card-img-placeholder&quot;>📦</div>'">`
      : `<div class="card-img-placeholder">📦</div>`;

    return `
      <div class="card" data-id="${item.id}">
        ${img}
        <div class="card-body">
          <div class="card-name">${escapeHtml(item.name)}</div>
          <div class="counter">
            <button class="counter-btn" data-action="minus">−</button>
            <span class="counter-value ${valueClass(item.count)}">${item.count}</span>
            <button class="counter-btn" data-action="plus">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ================================================================
// ОТРИСОВКА: ДОКТОРА
// ================================================================
function renderDoctors() {
  const box = document.getElementById('list-doctors');
  if (!doctors.length) {
    box.innerHTML = '<div class="empty">Пока нет докторов.<br>Нажмите + чтобы добавить</div>';
    return;
  }
  box.innerHTML = doctors.map(d => `
    <div class="row" data-id="${d.id}">
      <div class="row-main">
        <div class="row-title">${escapeHtml(d.name || 'Без имени')}</div>
        <div class="row-sub">${escapeHtml(d.specialty || '')}${d.phone ? ' · ' + escapeHtml(d.phone) : ''}</div>
      </div>
      <span class="row-value">›</span>
    </div>
  `).join('');
}

// ================================================================
// ОТРИСОВКА: АНАЛИЗЫ
// ================================================================
function renderTests() {
  const box = document.getElementById('list-tests');
  if (!tests.length) {
    box.innerHTML = '<div class="empty">Пока нет анализов.<br>Нажмите + чтобы добавить</div>';
    return;
  }
  box.innerHTML = tests.map(t => `
    <div class="row" data-id="${t.id}">
      <div class="row-main">
        <div class="row-title">${escapeHtml(t.name || 'Анализ')}</div>
        <div class="row-sub">${escapeHtml(t.date || '')}</div>
      </div>
      <div class="row-value">
        ${escapeHtml(t.value || '')}${t.unit ? `<small>${escapeHtml(t.unit)}</small>` : ''}
      </div>
    </div>
  `).join('');
}

// ================================================================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ================================================================
function switchTab(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.page === page);
  });

  window.scrollTo(0, 0);
}

// ================================================================
// РАСХОДНИКИ: + / −
// ================================================================
// ---- Умная история (без буферов, чистая группировка по времени) ----
const MERGE_WINDOW_MS = 2000; // 2 секунды

function registerChange(item, delta) {
  const now = Date.now();
  const last = history[0]; // Самое свежее событие всегда первое

  if (
    last &&
    last.supplyId === item.id &&
    (now - last.ts) <= MERGE_WINDOW_MS
  ) {
    // Если событие по этому же предмету было меньше 2 сек назад — обновляем его
    last.delta += delta;
    last.ts = now;
  } else {
    // Иначе создаем новую запись
    history.unshift({
      id: now + Math.random(),
      supplyId: item.id,
      name: item.name,
      delta: delta,
      ts: now,
    });
  }

  // Ограничиваем историю 300 событиями
  if (history.length > 300) history.length = 300;
  saveList(KEYS.history, history);
}

function onSuppliesClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const card = btn.closest('.card');
  const item = supplies.find(s => s.id === Number(card.dataset.id));
  if (!item) return;

  if (btn.dataset.action === 'plus') {
    item.count++;
    registerChange(item, +1);
  }
  if (btn.dataset.action === 'minus') {
    if (item.count === 0) return;
    item.count--;
    registerChange(item, -1);
  }

  saveList(KEYS.supplies, supplies);
  renderSupplies();
}

function renderHistory() {
  const box = document.getElementById('historyList');
  if (!history.length) {
    box.innerHTML = '<div class="empty">Пока нет изменений</div>';
    return;
  }

  let html = '';
  let currentMonth = '';
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  history.forEach(h => {
    const d = new Date(h.ts);
    const monthYear = `${months[d.getMonth()]} ${d.getFullYear()}`;

    // Если месяц сменился — добавляем заголовок
    if (monthYear !== currentMonth) {
      currentMonth = monthYear;
      html += `<div class="history-month">${currentMonth}</div>`;
    }

    const sign = h.delta > 0 ? '+' : '';
    const cls  = h.delta > 0 ? 'plus' : 'minus';
    const time = formatDate(h.ts);
    
    html += `
      <div class="history-row">
        <div class="history-top">
          <div class="history-name">${escapeHtml(h.name)}</div>
          <div class="history-delta ${cls}">${sign}${h.delta}</div>
        </div>
        <div class="history-time">${time}</div>
      </div>
    `;
  });

  box.innerHTML = html;
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;

  if (sameDay) return `Сегодня, ${time}`;
  if (isYesterday) return `Вчера, ${time}`;

  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mo}.${d.getFullYear()}, ${time}`;
}

function openHistory() {
  renderHistory();
  document.getElementById('historyModal').classList.add('open');
}

function closeHistory() {
  document.getElementById('historyModal').classList.remove('open');
}

function clearHistory() {
  if (!history.length) return;
  if (!confirm('Очистить всю историю?')) return;
  history = [];
  saveList(KEYS.history, history);
  renderHistory();
}

// ================================================================
// МОДАЛКА: КОНФИГИ ДЛЯ ДОКТОРА / АНАЛИЗА
// ================================================================
const MODAL_CONFIG = {
  supply: {
    titleAdd: 'Новый расходник',
    titleEdit: 'Расходник',
    fields: [
      { key: 'name',  label: 'Название',       type: 'text',   placeholder: 'Инсулин Апидра' },
      { key: 'img',   label: 'Фото (URL)',     type: 'text',   placeholder: 'https://...' },
      { key: 'count', label: 'Количество',     type: 'number', placeholder: '0' },
    ],
  },
  doctor: {
    titleAdd: 'Новый доктор',
    titleEdit: 'Доктор',
    fields: [
      { key: 'name',      label: 'Имя',           type: 'text', placeholder: 'Иванова А.П.' },
      { key: 'specialty', label: 'Специальность', type: 'text', placeholder: 'Эндокринолог' },
      { key: 'phone',     label: 'Телефон',       type: 'tel',  placeholder: '+7 999 123-45-67' },
    ],
  },
  test: {
    titleAdd: 'Новый анализ',
    titleEdit: 'Анализ',
    fields: [
      { key: 'name',  label: 'Название',  type: 'text', placeholder: 'Гликированный гемоглобин' },
      { key: 'value', label: 'Значение',  type: 'text', placeholder: '6.5' },
      { key: 'unit',  label: 'Единицы',   type: 'text', placeholder: '%' },
      { key: 'date',  label: 'Дата',      type: 'date' },
    ],
  },
};

let modalState = { type: null, id: null };

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  modalState = { type: null, id: null };
}

// Хелперы: получить список и ключ по типу
function getList(type) {
  if (type === 'supply') return supplies;
  if (type === 'doctor') return doctors;
  return tests;
}
function setList(type, list) {
  if (type === 'supply') { supplies = list; saveList(KEYS.supplies, list); }
  else if (type === 'doctor') { doctors = list; saveList(KEYS.doctors, list); }
  else { tests = list; saveList(KEYS.tests, list); }
}
function rerender(type) {
  if (type === 'supply') renderSupplies();
  else if (type === 'doctor') renderDoctors();
  else renderTests();
}

function openModal(type, id = null) {
  const cfg  = MODAL_CONFIG[type];
  const list = getList(type);
  const data = id ? (list.find(x => x.id === id) || {}) : {};

  document.getElementById('modalTitle').textContent = id ? cfg.titleEdit : cfg.titleAdd;

  const fields = cfg.fields.map(f => `
    <label>
      ${f.label}
      <input type="${f.type}" data-key="${f.key}" placeholder="${f.placeholder || ''}"
             value="${escapeHtml(data[f.key] ?? '')}">
    </label>
  `).join('');

  const deleteBtn = id ? `<button class="btn-delete" id="modalDelete">Удалить</button>` : '';
  document.getElementById('modalFields').innerHTML = fields + deleteBtn;

  if (id) {
    document.getElementById('modalDelete').onclick = () => deleteItem(type, id);
  }

  modalState = { type, id };
  document.getElementById('modal').classList.add('open');

  setTimeout(() => {
    const first = document.querySelector('#modalFields input');
    if (first) first.focus();
  }, 100);
}

function saveModal() {
  const { type, id } = modalState;
  if (!type) return;

  const cfg  = MODAL_CONFIG[type];
  const list = getList(type);
  const data = {};

  cfg.fields.forEach(f => {
    const el = document.querySelector(`#modalFields input[data-key="${f.key}"]`);
    let val = el ? el.value.trim() : '';
    if (f.key === 'count') val = Math.max(0, parseInt(val) || 0);
    data[f.key] = val;
  });

  if (!data.name) {
    document.querySelector('#modalFields input').focus();
    return;
  }

  if (id) {
    const item = list.find(x => x.id === id);
    if (item) Object.assign(item, data);
  } else {
    list.push({ id: Date.now(), ...data });
  }

  setList(type, list);
  rerender(type);
  closeModal();
}

function deleteItem(type, id) {
  if (!confirm('Удалить запись?')) return;
  const list = getList(type).filter(x => x.id !== id);
  setList(type, list);
  rerender(type);
  closeModal();
}

// ================================================================
// ИНИЦИАЛИЗАЦИЯ
// ================================================================
function init() {
  loadAll();
  renderSupplies();
  renderDoctors();
  renderTests();

  // Вкладки
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.page));
  });

  // Расходники: клики по +/-
  document.getElementById('grid-supplies').addEventListener('click', onSuppliesClick);

  // Доктора: тап = редактировать
  document.getElementById('list-doctors').addEventListener('click', e => {
    const row = e.target.closest('.row');
    if (row) openModal('doctor', Number(row.dataset.id));
  });

  // Анализы: тап = редактировать
  document.getElementById('list-tests').addEventListener('click', e => {
    const row = e.target.closest('.row');
    if (row) openModal('test', Number(row.dataset.id));
  });

  // Кнопки "+" в шапках
  document.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.add));
  });

  // Модалка
  document.getElementById('modalCancel').onclick = closeModal;
  document.getElementById('modalSave').onclick = saveModal;
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target.id === 'modal') closeModal();
  });

  // Enter в полях модалки = сохранить
  document.getElementById('modalFields').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') saveModal();
  });

    // История
  document.getElementById('historyBtn').addEventListener('click', openHistory);
  document.getElementById('historyClose').addEventListener('click', closeHistory);
  document.getElementById('historyClear').addEventListener('click', clearHistory);
  document.getElementById('historyModal').addEventListener('click', e => {
    if (e.target.id === 'historyModal') closeHistory();
  });
}

document.addEventListener('DOMContentLoaded', init);
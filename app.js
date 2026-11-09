'use strict';

/* ============================================================
   AKM LEGENDS v3.1 — офлайн-дневник тренировок
   Свободный конструктор программ: любые дни, любые упражнения,
   без шаблонов и принудительных сплитов.
   Все данные хранятся локально: IndexedDB + localStorage.
   ============================================================ */

/* ---------- МЕДИЧЕСКИЕ ОГРАНИЧЕНИЯ — ВЫСШИЙ ПРИОРИТЕТ ----------
   Левая нога: киста таранной кости. Правила зашиты в код и
   не отключаются через интерфейс:
   - чёрный список блокирует упражнение при создании, редактировании
     и при любом импорте данных (удаление автоматическое);
   - на ногах разрешены только 4 движения (белый список ниже):
     конструктор предупреждает, если упражнение для ног вне списка. */
const MEDICAL_BLACKLIST = [
  'присед','squat','выпад','lunge','болгар','bulgarian','становая','мёртвая','мертвая',
  'deadlift','румынская','sumo','сумо','зашагиван','step-up','подъём на носок','подъем на носок',
  'икр','calf','прыжк','jump','бег','run','sprint','жим ногами под углом',
  'вертикальный жим ногами','45°','сгибание одной ноги стоя'
];
const LEG_OK_KEYS = ['разгибания ног','сгибания ног','жим ногами','гиперэкстензия'];
function isForbidden(name){
  const n = String(name).toLowerCase();
  return MEDICAL_BLACKLIST.some(w => n.includes(w));
}
function legWhitelistOk(name){
  const n = String(name).toLowerCase();
  return LEG_OK_KEYS.some(k => n.includes(k));
}

/* ---------- 12 акцентов: варианты для светлой и тёмной темы ---------- */
const ACCENTS = [
  { id:'indigo',   name:'Индиго',     light:{ a:'#6366F1', on:'#FFFFFF', soft:'#EEF0FE' }, dark:{ a:'#818CF8', on:'#14142B', soft:'#2B2D4F' } },
  { id:'ocean',    name:'Океан',      light:{ a:'#3B82F6', on:'#FFFFFF', soft:'#EAF1FE' }, dark:{ a:'#60A5FA', on:'#0B1A2E', soft:'#20375A' } },
  { id:'teal',     name:'Бирюза',     light:{ a:'#0D9488', on:'#FFFFFF', soft:'#E6F5F3' }, dark:{ a:'#2DD4BF', on:'#06251F', soft:'#15403A' } },
  { id:'emerald',  name:'Изумруд',    light:{ a:'#16A34A', on:'#FFFFFF', soft:'#E9F7EE' }, dark:{ a:'#4ADE80', on:'#0A2413', soft:'#1E402C' } },
  { id:'lime',     name:'Лайм',       light:{ a:'#65A30D', on:'#FFFFFF', soft:'#F2F8E6' }, dark:{ a:'#A3E635', on:'#1A2506', soft:'#334415' } },
  { id:'amber',    name:'Янтарь',     light:{ a:'#D97706', on:'#FFFFFF', soft:'#FCF3E3' }, dark:{ a:'#FBBF24', on:'#2A1D03', soft:'#453410' } },
  { id:'sunset',   name:'Закат',      light:{ a:'#EA580C', on:'#FFFFFF', soft:'#FDEEE3' }, dark:{ a:'#FB923C', on:'#2B1305', soft:'#472A12' } },
  { id:'carmine',  name:'Кармин',     light:{ a:'#DC2626', on:'#FFFFFF', soft:'#FDEBEB' }, dark:{ a:'#F87171', on:'#2E0B0B', soft:'#4A1A1A' } },
  { id:'crimson',  name:'Малиновый',  light:{ a:'#DB2777', on:'#FFFFFF', soft:'#FCE9F2' }, dark:{ a:'#F472B6', on:'#330E1F', soft:'#4C1B33' } },
  { id:'violet',   name:'Фиолетовый', light:{ a:'#9333EA', on:'#FFFFFF', soft:'#F5EBFD' }, dark:{ a:'#C084FC', on:'#26093A', soft:'#3E2160' } },
  { id:'cyan',     name:'Циан',       light:{ a:'#0891B2', on:'#FFFFFF', soft:'#E5F6FA' }, dark:{ a:'#22D3EE', on:'#062730', soft:'#154C5B' } },
  { id:'graphite', name:'Графит',     light:{ a:'#3F3F46', on:'#FFFFFF', soft:'#EEEEF0' }, dark:{ a:'#D4D4D8', on:'#18181B', soft:'#333338' } }
];

/* ---------- Группы мышц и ориентиры объёма ---------- */
const MUSCLES = {
  chest:'Грудь', back:'Спина', delts:'Плечи', biceps:'Бицепс',
  triceps:'Трицепс', quads:'Квадрицепс', hamstrings:'Бицепс бедра', abs:'Пресс'
};
const VOLUME_ZONES = {
  chest:[10,14], back:[10,14], delts:[6,12], biceps:[4,8],
  triceps:[4,8], quads:[2,6], hamstrings:[2,6], abs:[2,6]
};

/* ---------- Старый 4-дневный шаблон ----------
   Нужен только для: миграции в новую программу при первом запуске,
   подсказок по мышцам/типу для записей истории до обновления. */
const LEGACY_DAYS = [
  {
    id:1, name:'День 1', title:'Руки и плечи',
    exercises:[
      { id:'d1-bio-curl', name:'Подъём штанги на бицепс (биомеханический)', type:'myo', muscles:['biceps'], reps:[12,15], minis:4 },
      { id:'d1-hammer', name:'Молотковые сгибания', type:'myo', muscles:['biceps'], reps:[12,15], minis:4 },
      { id:'d1-rope-pushdown', name:'Разгибания на трицепс с канатом', type:'myo', muscles:['triceps'], reps:[12,15], minis:4 },
      { id:'d1-close-bench', name:'Жим узким хватом', alt:'или французский жим', type:'compound', muscles:['chest','triceps'], sets:3, reps:[6,10], rpe:8 },
      { id:'d1-lateral', name:'Махи гантелями в стороны', type:'myo', muscles:['delts'], reps:[12,15], minis:4 },
      { id:'d1-rear', name:'Разведения в наклоне (задняя дельта)', type:'myo', muscles:['delts'], reps:[12,15], minis:4 }
    ]
  },
  {
    id:2, name:'День 2', title:'Push + квадрицепс',
    exercises:[
      { id:'d2-bench', name:'Жим штанги лёжа', type:'compound', muscles:['chest'], sets:3, reps:[5,8], rpe:8 },
      { id:'d2-incline-db', name:'Жим гантелей на наклонной скамье', type:'compound', muscles:['chest'], sets:2, reps:[8,12] },
      { id:'d2-lateral', name:'Махи в стороны (гантели/блок)', type:'isolation', muscles:['delts'], sets:2, reps:[12,15] },
      { id:'d2-rope', name:'Разгибания на трицепс с канатом', type:'isolation', muscles:['triceps'], sets:2, reps:[10,15] },
      { id:'d2-leg-ext', name:'Разгибания ног в тренажёре', type:'isolation', muscles:['quads'], sets:2, reps:[12,15] },
      { id:'d2-leg-press', name:'Жим ногами в тренажёре (горизонтальный, стопы высоко, ограниченная амплитуда)', type:'compound', muscles:['quads'], sets:2, reps:[10,12] }
    ]
  },
  {
    id:3, name:'День 3', title:'Спина',
    exercises:[
      { id:'d3-pullup', name:'Подтягивания (или верхняя тяга в тренажёре)', type:'compound', muscles:['back'], sets:3, reps:[6,10] },
      { id:'d3-db-row', name:'Тяга гантели одной рукой', type:'compound', muscles:['back'], sets:3, reps:[8,12] },
      { id:'d3-row', name:'Тяга нижнего блока сидя', type:'compound', muscles:['back'], sets:2, reps:[10,12] },
      { id:'d3-rear', name:'Разведения в наклоне (задняя дельта)', type:'isolation', muscles:['delts'], sets:3, reps:[12,15] },
      { id:'d3-curl', name:'Подъём штанги на бицепс', type:'isolation', muscles:['biceps'], sets:2, reps:[10,12] }
    ]
  },
  {
    id:4, name:'День 4', title:'Всё тело + бицепс бедра',
    exercises:[
      { id:'d4-press', name:'Жим в тренажёре (или отжимания)', type:'compound', muscles:['chest'], sets:2, reps:[10,12], rpe:7 },
      { id:'d4-row', name:'Тяга блока сидя', type:'compound', muscles:['back'], sets:2, reps:[10,12], rpe:7 },
      { id:'d4-leg-curl', name:'Сгибания ног в тренажёре (лёжа/сидя)', type:'isolation', muscles:['hamstrings'], sets:3, reps:[10,15] },
      { id:'d4-hyper', name:'Гиперэкстензия без веса', type:'bodyweight', muscles:['hamstrings'], sets:2, reps:[12,12] },
      { id:'d4-abs', name:'Скручивания на пресс', type:'bodyweight', muscles:['abs'], sets:2, reps:[12,15] }
    ]
  }
];
const EX_BY_ID = {};
LEGACY_DAYS.forEach(d => d.exercises.forEach(ex => { EX_BY_ID[ex.id] = ex; }));
const LEGACY_WEEKDAY = { 1:1, 2:2, 3:5, 4:6 }; /* цикл 2+2 */

const WEEKDAY_RU = { 0:'воскресенье', 1:'понедельник', 2:'вторник', 3:'среда', 4:'четверг', 5:'пятница', 6:'суббота' };
const WD_SHORT = { 0:'вс', 1:'пн', 2:'вт', 3:'ср', 4:'чт', 5:'пт', 6:'сб' };
const WD_FULL = { 0:'Воскресенье', 1:'Понедельник', 2:'Вторник', 3:'Среда', 4:'Четверг', 5:'Пятница', 6:'Суббота' };

/* ---------- Утилиты ---------- */
const $ = sel => document.querySelector(sel);
function uid(prefix){
  return (prefix || 'x') + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}
function todayStr(d = new Date()){
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function mondayOf(date){
  const d = new Date(date);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  d.setHours(0,0,0,0);
  return d;
}
function fmtNum(n){ return n % 1 === 0 ? String(n) : n.toFixed(1).replace('.', ','); }
function fmtRange(r){ return !r ? '' : (r[0] === r[1] ? String(r[0]) : r[0] + '–' + r[1]); }
function fmtTime(s){ return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0'); }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function clampInt(v, min, max, fallback){
  const n = Math.round(+v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

/* ---------- IndexedDB ---------- */
/* Версия 3: промежуточные сборки создавали БД версий 1 и 2 —
   открытие с меньшим номером у них падало бы с VersionError
   (данные бы не сохранялись). 3 выше любой из них. */
const DB_NAME = 'akm-legends', DB_VERSION = 3;
const STORE_WORKOUTS = 'workouts', STORE_SETTINGS = 'settings', STORE_OUTBOX = 'outbox';
let db = null;

function openDB(){
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB_NAME, DB_VERSION);
    rq.onupgradeneeded = () => {
      const d = rq.result;
      if(!d.objectStoreNames.contains(STORE_WORKOUTS)) d.createObjectStore(STORE_WORKOUTS, { keyPath:'id' });
      if(!d.objectStoreNames.contains(STORE_SETTINGS)) d.createObjectStore(STORE_SETTINGS, { keyPath:'key' });
      if(!d.objectStoreNames.contains(STORE_OUTBOX)) d.createObjectStore(STORE_OUTBOX, { keyPath:'id' });
    };
    rq.onsuccess = () => { db = rq.result; res(db); };
    rq.onerror = () => rej(rq.error);
  });
}
function dbPut(store, val){
  return new Promise((res, rej) => {
    if(!db) return res();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(val);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
function dbGet(store, key){
  return new Promise((res, rej) => {
    if(!db) return res(null);
    const rq = db.transaction(store, 'readonly').objectStore(store).get(key);
    rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
  });
}
function dbGetAll(store){
  return new Promise((res, rej) => {
    if(!db) return res([]);
    const rq = db.transaction(store, 'readonly').objectStore(store).getAll();
    rq.onsuccess = () => res(rq.result || []); rq.onerror = () => rej(rq.error);
  });
}
function dbDelete(store, key){
  return new Promise((res, rej) => {
    if(!db) return res();
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}

/* ---------- Настройки (localStorage) и прогрессия ---------- */
const DEFAULTS = {
  theme:'light', accent:'indigo',
  restCompound:180, restIsolation:90, restMyo:20, restLong:240,
  bannerHidden:false, lastSync:0
};
let settings = { ...DEFAULTS };
let progressData = {};

function loadSettings(){
  try{ settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('akm.settings.v1') || '{}') }; }
  catch(e){ settings = { ...DEFAULTS }; }
}
function saveSettings(){ try{ localStorage.setItem('akm.settings.v1', JSON.stringify(settings)); }catch(e){} }
function loadProgress(){
  try{ progressData = JSON.parse(localStorage.getItem('akm.progress.v1') || '{}'); }
  catch(e){ progressData = {}; }
}
function saveProgress(){ try{ localStorage.setItem('akm.progress.v1', JSON.stringify(progressData)); }catch(e){} }

/* ============================================================
   ПРОГРАММА — свободный конструктор
   program = { v:2, days:[ { id, name, weekday|null, exercises:[…] } ] }
   Упражнение: { id, name, desc, kind:'compound'|'isolation',
                 myo:bool, minis, muscles:[], sets, reps:[min,max],
                 weight:''|число, rpe:''|число }
   Хранится в localStorage 'akm.program.v1'.
   ============================================================ */
const PROGRAM_KEY = 'akm.program.v1';
let program = null;

function normalizeReps(r){
  if(Array.isArray(r) && +r[0] > 0){
    let a = clampInt(r[0], 1, 100, 8);
    let b = Array.isArray(r) && r[1] !== undefined ? clampInt(r[1], 1, 100, a) : a;
    if(a > b){ const t = a; a = b; b = t; }
    return [a, b];
  }
  return [8, 12];
}

function exFromLegacy(ex){
  return {
    id: ex.id,
    name: ex.name,
    desc: ex.alt
      ? 'Замена: ' + String(ex.alt).replace(/^или\s+/, '') + '.'
      : (ex.type === 'myo'
        ? 'Активация ' + fmtRange(ex.reps) + ', затем ' + (ex.minis || 4) + ' мини-серий по 3–5 повторений.'
        : ''),
    kind: ex.type === 'compound' ? 'compound' : 'isolation',
    myo: ex.type === 'myo',
    minis: ex.minis || 4,
    muscles: (ex.muscles || []).slice(),
    sets: ex.sets || (ex.type === 'myo' ? 1 : 3),
    reps: ex.reps ? ex.reps.slice() : [8, 12],
    weight: '',
    rpe: ex.rpe || ''
  };
}

/* Программа по умолчанию = старый 4-дневный сплит, но уже
   полностью редактируемый: можно переименовать, убрать, дополнить. */
function defaultProgram(){
  return {
    v: 2,
    days: LEGACY_DAYS.map(d => ({
      id: 'p' + d.id,
      name: d.name + ' · ' + d.title,
      weekday: LEGACY_WEEKDAY[d.id] !== undefined ? LEGACY_WEEKDAY[d.id] : null,
      exercises: d.exercises.map(exFromLegacy)
    }))
  };
}

function sanitizeProgram(raw){
  const days = (raw && Array.isArray(raw.days) ? raw.days : [])
    .filter(d => d && typeof d === 'object')
    .map(d => {
      let wd = d.weekday;
      wd = (wd === null || wd === undefined || wd === '') ? null : clampInt(wd, 0, 6, null);
      return {
        id: String(d.id || uid('p')).slice(0, 64),
        name: String(d.name || 'Без названия').slice(0, 80),
        weekday: wd,
        exercises: (Array.isArray(d.exercises) ? d.exercises : [])
          .filter(ex => ex && typeof ex === 'object' && ex.name && !isForbidden(ex.name))
          .map(ex => ({
            id: String(ex.id || uid('e')).slice(0, 64),
            name: String(ex.name).slice(0, 120),
            desc: String(ex.desc || '').slice(0, 400),
            kind: ex.kind === 'compound' ? 'compound' : 'isolation',
            myo: !!ex.myo,
            minis: clampInt(ex.minis, 2, 8, 4),
            muscles: Array.isArray(ex.muscles) ? ex.muscles.filter(m => MUSCLES[m]) : [],
            sets: clampInt(ex.sets, 1, 10, 3),
            reps: normalizeReps(ex.reps),
            weight: (ex.weight === '' || ex.weight === null || ex.weight === undefined) ? '' : (+ex.weight || ''),
            rpe: +ex.rpe || ''
          }))
      };
    });
  return { v: 2, days, saved: true };
}

function loadProgram(){
  let raw = null;
  try{ raw = JSON.parse(localStorage.getItem(PROGRAM_KEY) || 'null'); }catch(e){}
  if(raw && Array.isArray(raw.days) && (raw.days.length || raw.saved === true)){
    program = sanitizeProgram(raw);
    return;
  }
  /* Первый запуск v3.1: переносим старый сплит в редактируемую программу */
  program = defaultProgram();
  try{ localStorage.setItem(PROGRAM_KEY, JSON.stringify(program)); }catch(e){}
}

function saveProgram(){
  try{ localStorage.setItem(PROGRAM_KEY, JSON.stringify({ ...program, v:2, saved:true })); }catch(e){}
  dbPut(STORE_OUTBOX, { id:'program', ts:Date.now() }).catch(() => {});
}
function programDay(id){
  return program.days.find(d => String(d.id) === String(id)) || null;
}

/* ---------- Состояние ---------- */
const state = {
  currentTab:'workout', selectedDayId:null, session:null, volumeOffset:0,
  folded:new Set(), foldedSessionId:null
};

/* ============================================================
   СЕССИЯ ТРЕНИРОВКИ
   Сессия — снимок программы на момент старта: история не ломается,
   даже если потом поменять программу. Каждый элемент несёт свои
   мышцы, диапазон повторений, описание и myo-состояние.
   ============================================================ */
function exToSession(ex){
  /* Рабочий вес предзаполняется рекомендацией по прогрессии:
     последний использованный + 2,5 кг, если она начислена */
  const planW = (ex.weight === '' || ex.weight === null || ex.weight === undefined) ? '' : ex.weight;
  const pre = recommendWeight(ex.id, planW);
  return {
    id: ex.id,
    name: ex.name,
    desc: ex.desc || '',
    kind: ex.kind || 'isolation',
    muscles: (ex.muscles || []).slice(),
    reps: (ex.reps || [8, 12]).slice(),
    rpe: ex.rpe || '',
    weight: planW,
    sets: Array.from({ length: ex.myo ? 1 : ex.sets },
      () => ({ weight: pre, reps:'', rir:'', rpe:'', done:false })),
    myo: ex.myo ? { minis: Array(ex.minis).fill(false) } : null
  };
}

function buildSessionFromDay(day, dateStr){
  return {
    id: dateStr + '_d' + day.id,
    date: dateStr,
    dayId: day.id,
    dayName: day.name,
    finished: false,
    comment: '',
    exercises: day.exercises.map(exToSession),
    updatedAt: Date.now()
  };
}

async function selectDay(dayId){
  const day = programDay(dayId);
  if(!day){ state.selectedDayId = null; state.session = null; renderDayChips(); renderSession(); return; }
  state.selectedDayId = day.id;
  const dateStr = todayStr();
  const id = dateStr + '_d' + day.id;
  let w = null;
  try{ w = await dbGet(STORE_WORKOUTS, id); }catch(e){}
  if(!w || !Array.isArray(w.exercises)) w = buildSessionFromDay(day, dateStr);
  state.session = w;
  renderDayChips();
  renderSession();
}

/* ---------- Рендер: выбор дня ---------- */
function buildDayChips(){
  const wrap = $('#dayChips');
  wrap.innerHTML = program.days.map(d => {
    const isToday = d.weekday !== null && d.weekday === new Date().getDay();
    const sub = isToday ? 'сегодня' : (d.weekday !== null ? WD_SHORT[d.weekday] : d.exercises.length + ' упр.');
    return '<button class="day-chip' + (String(d.id) === String(state.selectedDayId) ? ' is-active' : '') +
      '" data-day="' + escapeHtml(d.id) + '" type="button">' +
      '<b>' + escapeHtml(d.name) + '</b><span>' + sub + '</span></button>';
  }).join('') +
  '<button class="day-chip day-chip-add" data-addday type="button"><b>+</b><span>Новый день</span></button>';
}

function renderDayChips(){
  buildDayChips();
}

/* ---------- Рендер: сессия ---------- */
function restSecondsFor(ex){
  if(ex.myo) return settings.restMyo;
  if(ex.kind === 'compound') return settings.restCompound;
  return settings.restIsolation;
}

/* Выполнено ли упражнение целиком (для Myo — включая все мини-серии) */
function exerciseComplete(ex){
  return !!(ex.sets && ex.sets.length && ex.sets.every(s => s.done) &&
    (!ex.myo || (ex.myo.minis && ex.myo.minis.every(Boolean))));
}

/* Итоговая строка свёрнутой карточки: подходы · вес · RIR / мини */
function exSumText(ex){
  const bits = ['✓ ' + ex.sets.filter(x => x.done).length + '/' + ex.sets.length];
  const w0 = ex.sets.find(x => x.done && +x.weight > 0);
  if(w0) bits.push(escapeHtml(String(w0.weight)) + ' кг');
  if(ex.myo){
    bits.push('мини ' + ex.myo.minis.filter(Boolean).length + '/' + ex.myo.minis.length);
  } else {
    const rirs = ex.sets.filter(x => x.done && x.rir !== '' && x.rir != null).map(x => +x.rir);
    if(rirs.length) bits.push('RIR ' + Math.min.apply(null, rirs));
  }
  return bits.join(' · ');
}

function renderExCard(ex){
  const isMyo = !!ex.myo;
  const reps = ex.reps || [8, 12];
  const folded = state.folded.has(String(ex.id));
  const target = isMyo
    ? 'Myo · ' + fmtRange(reps) + ' + ' + ex.myo.minis.length + ' мини'
    : ex.sets.length + ' × ' + fmtRange(reps) +
      (ex.weight !== '' && ex.weight != null ? ' · ' + escapeHtml(String(ex.weight)) + ' кг' : '') +
      (ex.rpe ? ' · RPE ' + escapeHtml(String(ex.rpe)) : '');
  const prog = (progressData[ex.id] && progressData[ex.id].suggest)
    ? '<span class="badge-plus">+2,5 кг</span>' : '';
  const desc = ex.desc
    ? '<p class="ex-desc" data-desc="' + escapeHtml(ex.id) + '" role="button" tabindex="0">' + escapeHtml(ex.desc) + '</p>'
    : '';
  const rows = ex.sets.map((set, si) =>
    '<div class="set-row">' +
    '<span class="set-num">' + (si + 1) + '</span>' +
    '<input data-ex="' + escapeHtml(ex.id) + '" data-set="' + si + '" data-field="weight" type="number" inputmode="decimal" step="0.5" min="0" placeholder="кг" value="' + escapeHtml(String(set.weight == null ? '' : set.weight)) + '">' +
    '<input data-ex="' + escapeHtml(ex.id) + '" data-set="' + si + '" data-field="reps" type="number" inputmode="numeric" min="0" placeholder="повт" value="' + escapeHtml(String(set.reps == null ? '' : set.reps)) + '">' +
    '<input data-ex="' + escapeHtml(ex.id) + '" data-set="' + si + '" data-field="rir" type="number" inputmode="numeric" min="0" max="10" step="1" placeholder="RIR" value="' + escapeHtml(String(set.rir == null ? '' : set.rir)) + '">' +
    '<button class="set-done ' + (set.done ? 'is-done' : '') + '" data-ex="' + escapeHtml(ex.id) + '" data-set="' + si + '" aria-pressed="' + set.done + '" aria-label="Подход выполнен">✓</button>' +
    '</div>'
  ).join('');
  const minis = isMyo
    ? '<div class="myo-row"><span class="myo-label">Мини-серии по ' + settings.restMyo +
      ' с — отметь выполненные:</span>' +
      ex.myo.minis.map((m, mi) =>
        '<button class="mini-btn ' + (m ? 'is-done' : '') + '" data-ex="' + escapeHtml(ex.id) +
        '" data-mini="' + mi + '" aria-pressed="' + m + '">' + (mi + 1) + '</button>'
      ).join('') + '</div>'
    : '';
  return '<article class="card ex' + (folded ? ' is-folded' : '') + '" data-ex="' + escapeHtml(ex.id) + '">' +
    '<div class="ex-head">' +
      '<div class="ex-titles"><div class="ex-name">' + escapeHtml(ex.name) + prog + '</div>' + desc + '</div>' +
      '<div class="ex-head-r"><span class="ex-target">' + target + '</span>' +
      '<button class="ex-remove" data-rmex="' + escapeHtml(ex.id) + '" aria-label="Убрать упражнение из тренировки">×</button></div>' +
    '</div>' +
    '<div class="ex-body">' + rows + minis + '</div>' +
    '<p class="ex-sum">' + exSumText(ex) + '</p>' +
    '</article>';
}

function renderSession(){
  const area = $('#sessionArea'), s = state.session;
  const comment = $('#sessionComment'), finish = $('#finishBtn'), addBtn = $('#addExBtn');
  if(!s){
    addBtn.hidden = true; finish.hidden = true; comment.hidden = true;
    area.innerHTML = program.days.length
      ? '<div class="empty">Выбери день сверху — и вперёд.</div>'
      : '<div class="empty">Программа пуста.<br>Загляни во вкладку «Программа» и создай первый день.</div>';
    return;
  }
  addBtn.hidden = false; finish.hidden = false; comment.hidden = false;
  comment.value = s.comment || '';
  /* Выполненные упражнения сворачиваются; ручные разворачивания
     текущей сессии переживают перерендер (быстрое добавление и т.п.) */
  if(state.foldedSessionId !== s.id){
    state.folded = new Set(s.exercises
      .filter(exerciseComplete)
      .map(ex => String(ex.id)));
    state.foldedSessionId = s.id;
  }
  area.innerHTML = s.exercises.map(renderExCard).join('');
  updateFoldAllBtn();
  updateFinishBtn();
}

/* ---------- Сворачивание выполненных упражнений ---------- */
function setFolded(card, folded){
  if(!card) return;
  card.classList.toggle('is-folded', folded);
  if(folded) state.folded.add(String(card.dataset.ex));
  else state.folded.delete(String(card.dataset.ex));
  updateFoldAllBtn();
}
function unfoldAll(){
  document.querySelectorAll('#sessionArea .ex.is-folded').forEach(c => {
    c.classList.remove('is-folded');
    state.folded.delete(String(c.dataset.ex));
  });
  updateFoldAllBtn();
}
function updateFoldAllBtn(){
  const area = $('#sessionArea');
  if(!area) return;
  const any = !!area.querySelector('.ex.is-folded');
  let b = $('#unfoldAllBtn');
  if(any && !b){
    b = document.createElement('button');
    b.id = 'unfoldAllBtn'; b.type = 'button';
    b.className = 'btn btn-ghost btn-block';
    b.textContent = 'Развернуть свёрнутые упражнения';
    b.addEventListener('click', unfoldAll);
    area.appendChild(b);
  } else if(!any && b){ b.remove(); }
}
/* Обновить итог свёрнутой карточки без перерендера — фокус ввода не теряется */
function updateExSum(card){
  if(!card || !state.session) return;
  const ex = state.session.exercises.find(x => String(x.id) === String(card.dataset.ex));
  const el = card.querySelector('.ex-sum');
  if(ex && el) el.innerHTML = exSumText(ex);
}
function updateFinishBtn(){
  const b = $('#finishBtn'), s = state.session;
  b.disabled = !!(s && s.finished);
  b.textContent = (s && s.finished) ? 'Тренировка завершена ✓' : 'Завершить тренировку';
}

/* ---------- События сессии ---------- */
function onSetInput(e){
  const inp = e.target;
  if(!inp.matches('input[data-field]') || !state.session) return;
  const ex = state.session.exercises.find(x => x.id === inp.dataset.ex);
  if(!ex) return;
  const s = ex.sets[+inp.dataset.set];
  if(!s) return;
  s[inp.dataset.field] = inp.value;
  persistWorkout();
}

function onSessionClick(e){
  if(!state.session) return;

  const rmBtn = e.target.closest('[data-rmex]');
  if(rmBtn){
    const ex = state.session.exercises.find(x => x.id === rmBtn.dataset.rmex);
    if(!ex) return;
    if(!confirm('Убрать «' + ex.name + '» из сегодняшней тренировки?')) return;
    state.session.exercises = state.session.exercises.filter(x => x.id !== ex.id);
    persistWorkout();
    renderSession();
    return;
  }

  /* Свёрнутая карточка раскрывается одним нажатием в любом месте */
  const card = e.target.closest('.ex');
  if(card && card.classList.contains('is-folded')){ setFolded(card, false); return; }

  const descEl = e.target.closest('.ex-desc');
  if(descEl){ descEl.classList.toggle('open'); return; }

  const doneBtn = e.target.closest('.set-done');
  if(doneBtn){
    const ex = state.session.exercises.find(x => x.id === doneBtn.dataset.ex);
    const s = ex && ex.sets[+doneBtn.dataset.set];
    if(!s) return;
    s.done = !s.done;
    doneBtn.classList.toggle('is-done', s.done);
    doneBtn.setAttribute('aria-pressed', String(s.done));
    persistWorkout();
    updateExSum(card);
    if(s.done){
      ensureAudio(); /* готовим звук по жесту — иначе iOS держит контекст в suspended */
      if(navigator.vibrate) navigator.vibrate(15);
      if(exerciseComplete(ex)){
        /* Упражнение закрыто: длинный отдых и авто-сворачивание */
        startRest(settings.restLong, 'Упражнение выполнено');
        setFolded(card, true);
      } else {
        startRest(restSecondsFor(ex), 'Отдых');
      }
    }
    return;
  }

  const miniBtn = e.target.closest('.mini-btn');
  if(miniBtn){
    const ex = state.session.exercises.find(x => x.id === miniBtn.dataset.ex);
    if(!ex || !ex.myo) return;
    const i = +miniBtn.dataset.mini;
    ex.myo.minis[i] = !ex.myo.minis[i];
    miniBtn.classList.toggle('is-done', ex.myo.minis[i]);
    miniBtn.setAttribute('aria-pressed', String(ex.myo.minis[i]));
    persistWorkout();
    updateExSum(card);
    if(ex.myo.minis[i]){
      ensureAudio();
      if(navigator.vibrate) navigator.vibrate(15);
      if(exerciseComplete(ex)){
        startRest(settings.restLong, 'Упражнение выполнено');
        setFolded(card, true);
      } else {
        startRest(settings.restMyo, 'Мини-серия');
      }
    }
  }
}

async function persistWorkout(){
  const w = state.session;
  if(!w) return;
  w.updatedAt = Date.now();
  try{
    await dbPut(STORE_WORKOUTS, w);
    await dbPut(STORE_OUTBOX, { id: w.id, ts: w.updatedAt });
  }catch(e){}
}

/* ---------- Прогрессия: обоснованная, по факту и RIR ----------
   +2,5 кг начисляется только за два раза подряд закрытый объём:
   все подходы выполнены, повторы до верхней границы, минимум RIR 2.
   Отказ (RIR 0) или невыполненный объём — прогрессия сбрасывается,
   вес на следующую тренировку не растёт. Пропущенное упражнение
   (нет отмеченных подходов) и работа без веса прогрессию не трогают. */
const PROG_STEP = 2.5;

function rirOf(set){
  if(set.rir !== '' && set.rir != null && !isNaN(+set.rir)) return +set.rir;
  if(set.rpe && +set.rpe > 0) return 10 - +set.rpe; /* старые записи с RPE */
  return null;
}

/* Вес для следующей тренировки: последний рабочий + шаг, если начислен */
function recommendWeight(exId, planWeight){
  const p = progressData[exId];
  const base = (p && +p.weight > 0) ? +p.weight : (+planWeight || 0);
  if(p && p.suggest) return +(base + PROG_STEP).toFixed(2);
  return base || '';
}

function evaluateProgression(w){
  for(const ex of w.exercises){
    if(ex.myo) continue;
    const sets = ex.sets || [];
    const done = sets.filter(s => s.done);
    if(!done.length) continue;              /* пропущено — прогрессию не трогаем */
    const usedWeight = +done[0].weight || 0;
    if(!usedWeight) continue;               /* работа без веса не оценивается */
    const top = (ex.reps && ex.reps[1]) || 0;
    if(!top) continue;
    const prev = progressData[ex.id];
    let streak = (prev && prev.weight === usedWeight) ? (prev.streak || 0) : 0;
    let suggest = false;
    const rirs = done.map(rirOf);
    const minRir = rirs.some(r => r === null) ? null : Math.min.apply(null, rirs);
    const allDone = sets.length > 0 && sets.every(s => s.done);
    if(minRir === 0){ streak = 0; }         /* отказ — закрепляем вес */
    else if(!allDone){ streak = 0; }        /* объём не закрыт */
    else if(sets.every(s => +s.reps >= top) && minRir !== null && minRir >= 2){
      streak += 1;
      if(streak >= 2){ suggest = true; streak = 0; }
    }
    /* повторы в диапазоне без верхней границы или RIR 1 — вес держим,
       streak без изменений */
    progressData[ex.id] = { weight: usedWeight, streak: streak, suggest: suggest };
  }
  saveProgress();
}

async function finishWorkout(){
  const w = state.session;
  if(!w) return;
  /* Повторное нажатие не должно накручивать прогрессию */
  if(w.finished){ toast('Эта тренировка уже завершена'); return; }
  w.finished = true;
  evaluateProgression(w);
  await persistWorkout();
  updateFinishBtn();
  toast('Тренировка сохранена. Объём недели — во вкладке «Объём».');
  if(state.currentTab === 'history') renderHistory();
}

/* ---------- Таймер отдыха (Date.now() — без дрейфа) ---------- */
const timer = { endsAt:0, total:0, int:null, hideT:null };

function startRest(sec, label){
  if(!sec || sec <= 0) return;
  timer.endsAt = Date.now() + sec * 1000;
  timer.total = sec * 1000;
  $('#timerLabel').textContent = label || 'Отдых';
  $('#timerBar').hidden = false;
  $('#timerBar').classList.remove('is-done');
  clearInterval(timer.int); clearTimeout(timer.hideT);
  timer.int = setInterval(tickTimer, 200);
  tickTimer();
}
function tickTimer(){
  const remain = Math.max(0, timer.endsAt - Date.now());
  $('#timerTime').textContent = fmtTime(Math.ceil(remain / 1000));
  $('#timerFill').style.width = (timer.total ? remain / timer.total * 100 : 0) + '%';
  if(remain <= 0){
    clearInterval(timer.int); timer.int = null;
    $('#timerLabel').textContent = 'Пора к снаряду';
    $('#timerBar').classList.add('is-done');
    beep();
    if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
    timer.hideT = setTimeout(hideTimer, 8000);
  }
}
function hideTimer(){
  clearInterval(timer.int); clearTimeout(timer.hideT);
  timer.int = null;
  $('#timerBar').hidden = true;
}

/* Звуковой сигнал (WebAudio). Контекст создаётся и «прощёлкивается»
   по жесту пользователя (нажатие «подход выполнен») — иначе iOS/Safari
   держат его в suspended и сигнала в конце отдыха не будет. */
let audioCtx = null;
function ensureAudio(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    audioCtx = audioCtx || new AC();
    if(audioCtx.state === 'suspended') audioCtx.resume();
  }catch(e){}
}
function beep(){
  try{
    if(!audioCtx) return;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;
    [0, 0.22].forEach(dt => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.2, t + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.18);
      o.start(t + dt); o.stop(t + dt + 0.2);
    });
  }catch(e){}
}

/* ---------- Объём недели ---------- */
function sumVolume(workouts){
  const totals = {};
  Object.keys(MUSCLES).forEach(k => { totals[k] = 0; });
  let untagged = 0;
  for(const w of workouts){
    for(const ex of (w.exercises || [])){
      let ms = Array.isArray(ex.muscles) ? ex.muscles.filter(m => MUSCLES[m]) : [];
      if(!ms.length && EX_BY_ID[ex.id]) ms = EX_BY_ID[ex.id].muscles || [];
      const done = ex.myo
        ? ((ex.sets && ex.sets[0] && ex.sets[0].done) ? 1.5 : 0)
        : (ex.sets || []).filter(s => s.done).length;
      if(done <= 0) continue;
      if(!ms.length){ untagged += done; continue; }
      ms.forEach(m => { totals[m] = (totals[m] || 0) + done; });
    }
  }
  return { totals, untagged };
}

/* ---------- Запланированный недельный объём ----------
   Считается по текущей программе (все дни = один недельный цикл).
   Привязка к мышцам — по полю «muscles», которое пользователь задаёт
   сам в конструкторе (не по названию упражнения). Myo-Reps = 1.5
   подхода, как и в фактическом подсчёте. Упражнения без группы
   идут в плановый «untagged», чтобы разница факт/план сходилась. */
function plannedVolume(){
  const totals = {};
  Object.keys(MUSCLES).forEach(k => { totals[k] = 0; });
  let untagged = 0;
  for(const d of (program.days || [])){
    for(const ex of (d.exercises || [])){
      let ms = Array.isArray(ex.muscles) ? ex.muscles.filter(m => MUSCLES[m]) : [];
      if(!ms.length && EX_BY_ID[ex.id]) ms = EX_BY_ID[ex.id].muscles || [];
      const sets = ex.myo ? 1.5 : (+ex.sets || 0);
      if(sets <= 0) continue;
      if(!ms.length){ untagged += sets; continue; }
      ms.forEach(m => { totals[m] = (totals[m] || 0) + sets; });
    }
  }
  return { totals, untagged };
}

async function renderVolume(){
  const all = await dbGetAll(STORE_WORKOUTS);
  const monday = mondayOf(new Date());
  monday.setDate(monday.getDate() + state.volumeOffset * 7);
  const end = new Date(monday); end.setDate(end.getDate() + 7);
  const fd = d => d.toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
  $('#volLabel').textContent = fd(monday) + ' — ' + fd(new Date(end - 86400000));
  const inWeek = all.filter(w => {
    const d = new Date(w.date + 'T00:00');
    return d >= monday && d < end;
  });
  const { totals, untagged } = sumVolume(inWeek);
  const plan = plannedVolume();
  const total = Object.values(totals).reduce((s, v) => s + v, 0);
  const planTotal = Object.values(plan.totals).reduce((s, v) => s + v, 0);
  $('#volTotal').textContent = fmtNum(total);
  const planEl = $('#volPlanTotal');
  if(planEl) planEl.textContent = planTotal > 0
    ? 'план: ' + fmtNum(planTotal) + (plan.untagged > 0 ? ' + ' + fmtNum(plan.untagged) + ' без группы' : '')
    : 'план: —';
  /* Предупреждение: в программе есть упражнения без группы мышц */
  const planWarn = plan.untagged > 0
    ? '<div class="vol-untagged">В плане: ' + fmtNum(plan.untagged) + ' подход(ов) без группы — ' +
      'назначь мышцы в конструкторе, чтобы они попадали в зоны.</div>'
    : '';
  $('#volList').innerHTML = Object.entries(MUSCLES).map(([key, title]) => {
    const zone = VOLUME_ZONES[key];
    const v = totals[key] || 0;
    const p = plan.totals[key] || 0;
    const cls = v < zone[0] ? 'z-low' : (v > zone[1] ? 'z-high' : 'z-ok');
    const status = v < zone[0] ? 'недобор' : (v > zone[1] ? 'перебор' : 'в цели');
    const pct = Math.max(4, Math.min(100, v / zone[1] * 100));
    /* Риска планового объёма на полосе — сразу видно, куда должен дойти факт */
    const planPct = p > 0 ? Math.min(100, p / zone[1] * 100) : 0;
    const planMark = planPct
      ? '<span class="vol-plan-mark" style="left:' + planPct.toFixed(1) + '%"></span>'
      : '';
    /* Подпись к плану: если план сам выше зелёной зоны — предупреждение о перегрузе */
    let planNote = '';
    if(p > 0){
      if(p > zone[1]) planNote = '<span class="vol-plan-over">план ' + fmtNum(p) + ' — выше зоны, риск перегруза</span>';
      else planNote = 'план ' + fmtNum(p);
    }
    return '<div class="vol-row">' +
      '<div class="vol-top">' +
        '<span class="vol-name">' + title + '</span>' +
        '<div class="vol-cols">' +
          '<span class="vol-col"><span class="vol-col-label">Факт</span>' +
            '<span class="vol-col-val">' + fmtNum(v) + '</span></span>' +
          '<span class="vol-col"><span class="vol-col-label">План</span>' +
            '<span class="vol-col-val vol-col-plan' + (p > zone[1] ? ' is-over' : '') + '">' + fmtNum(p) + '</span></span>' +
          '<span class="vol-col"><span class="vol-col-label">Зона</span>' +
            '<span class="vol-col-val vol-col-zone">' + zone[0] + '–' + zone[1] + '</span></span>' +
        '</div></div>' +
      '<div class="vol-bar"><div class="vol-fill ' + cls + '" style="width:' + pct + '%">' + planMark + '</div></div>' +
      '<div class="vol-status">' + status + (planNote ? ' · ' + planNote : '') + '</div></div>';
  }).join('') +
  (untagged > 0
    ? '<div class="vol-untagged">Без группы (факт): ' + fmtNum(untagged) + ' подход(ов) — назначь группу мышц в конструкторе, чтобы они попадали в зоны.</div>'
    : '') +
  planWarn;
}

/* ---------- История ---------- */
function dayTitleOf(w){
  if(w.dayName) return w.dayName;
  const pd = programDay(w.dayId);
  if(pd) return pd.name;
  const ld = LEGACY_DAYS.find(d => d.id === w.dayId);
  return ld ? ld.name + ' — ' + ld.title : 'Тренировка';
}

function exerciseLine(ex){
  const minis = ((ex.myo && ex.myo.minis) || []);
  if(ex.myo){
    const s = (ex.sets && ex.sets[0]) || {};
    return '• ' + escapeHtml(ex.name) + ' — ' +
      (s.weight ? escapeHtml(String(s.weight)) + ' кг, ' : '') +
      (s.reps ? escapeHtml(String(s.reps)) + ' повторений, ' : '') + 'мини-серии ' +
      minis.filter(Boolean).length + '/' + minis.length;
  }
  const parts = (ex.sets || []).filter(s => s.done).map(s =>
    escapeHtml(String(s.weight || '?')) + '×' + escapeHtml(String(s.reps || '?')) +
    (s.rir !== '' && s.rir != null ? ' (RIR ' + escapeHtml(String(s.rir)) + ')' : ''));
  return '• ' + escapeHtml(ex.name) + ' — ' + (parts.join(', ') || 'без подходов');
}

async function renderHistory(){
  const all = await dbGetAll(STORE_WORKOUTS);
  all.sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || 0) - (a.updatedAt || 0));
  const list = $('#historyList');
  if(!all.length){
    list.innerHTML = '<div class="empty">' +
      '<svg class="empty-logo" viewBox="0 0 64 64" aria-hidden="true">' +
      '<rect x="10" y="30" width="11" height="22" rx="5.5"></rect>' +
      '<rect x="26.5" y="14" width="11" height="38" rx="5.5"></rect>' +
      '<rect x="43" y="22" width="11" height="30" rx="5.5"></rect></svg>' +
      'Пока пусто. Первая тренировка ждёт тебя во вкладке «Тренировка».</div>';
    return;
  }
  list.innerHTML = all.map(w => {
    const d = new Date(w.date + 'T00:00');
    const dateTxt = d.toLocaleDateString('ru-RU', { weekday:'short', day:'numeric', month:'long' });
    let done = 0, total = 0;
    (w.exercises || []).forEach(ex => {
      if(ex.myo){
        total += 1 + ((ex.myo && ex.myo.minis) || []).length;
        done += ((ex.sets[0] && ex.sets[0].done) ? 1 : 0) + ((ex.myo && ex.myo.minis) || []).filter(Boolean).length;
      } else {
        total += (ex.sets || []).length;
        done += (ex.sets || []).filter(s => s.done).length;
      }
    });
    const lines = (w.exercises || []).map(exerciseLine).join('<br>');
    return '<details class="card h-item">' +
      '<summary><span><span class="h-date">' + dateTxt + '</span>' +
      '<span class="h-day"> · ' + escapeHtml(dayTitleOf(w)) + '</span></span>' +
      '<span class="h-count">' + (w.finished ? '<span class="h-badge">✓ </span>' : '') +
      done + '/' + total + ' подходов</span></summary>' +
      '<div class="h-details">' + lines +
      (w.comment ? '<p class="h-comment">' + escapeHtml(w.comment) + '</p>' : '') + '</div>' +
      '<button class="h-del" data-del="' + escapeHtml(w.id) + '">Удалить запись</button>' +
      '</details>';
  }).join('');
}

async function onHistoryClick(e){
  const btn = e.target.closest('[data-del]');
  if(!btn) return;
  if(!confirm('Удалить эту тренировку из истории?')) return;
  await dbDelete(STORE_WORKOUTS, btn.dataset.del);
  renderHistory();
  toast('Запись удалена');
}

/* ---------- Экспорт / импорт (схема 2: программа включена) ---------- */
async function exportData(){
  const workouts = await dbGetAll(STORE_WORKOUTS);
  const payload = {
    app:'AKM LEGENDS', schema:2,
    exportedAt:new Date().toISOString(),
    settings:settings, progress:progressData, program:program, workouts:workouts
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'akm-legends-backup-' + todayStr() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Экспорт готов — файл в загрузках');
}

function countEx(p){
  return (p && Array.isArray(p.days))
    ? p.days.reduce((s, d) => s + ((d.exercises && d.exercises.length) || 0), 0) : 0;
}

async function importData(file){
  try{
    const data = JSON.parse(await file.text());
    if(!data || typeof data !== 'object') throw new Error('bad format');
    let added = 0, updated = 0, blocked = 0, progBlocked = 0;

    const list = Array.isArray(data) ? data : data.workouts;
    if(Array.isArray(list)){
      for(const w of list){
        if(!w || !w.id || !w.date || !Array.isArray(w.exercises)) continue;
        const before = w.exercises.length;
        w.exercises = w.exercises.filter(ex => ex && ex.name && !isForbidden(ex.name));
        blocked += before - w.exercises.length;
        const old = await dbGet(STORE_WORKOUTS, w.id);
        if(!old || (w.updatedAt || 0) > (old.updatedAt || 0)){
          await dbPut(STORE_WORKOUTS, w);
          await dbPut(STORE_OUTBOX, { id: w.id, ts: w.updatedAt || Date.now() });
          if(old){ updated++; } else { added++; }
        }
      }
    }

    if(!Array.isArray(data) && data.program && typeof data.program === 'object'){
      const before = countEx(data.program);
      program = sanitizeProgram(data.program);
      progBlocked = before - countEx(program);
      saveProgram();
      renderProgram();
      renderDayChips();
      updateScheduleHint();
      if(state.selectedDayId && !programDay(state.selectedDayId)){
        state.selectedDayId = null; state.session = null; renderSession();
      } else if(state.selectedDayId){
        renderDayChips();
      }
    }

    if(!Array.isArray(data)){
      if(data.settings){
        settings = { ...DEFAULTS, ...settings, ...data.settings };
        saveSettings(); applyTheme();
        $('#restCompound').value = settings.restCompound;
        $('#restIsolation').value = settings.restIsolation;
        $('#restMyo').value = settings.restMyo;
        $('#restLong').value = settings.restLong || 240;
      }
      if(data.progress && typeof data.progress === 'object'){ progressData = { ...progressData, ...data.progress }; saveProgress(); }
    }

    const notes = ['новых тренировок: ' + added, 'обновлено: ' + updated];
    if(blocked) notes.push('запрещённых упражнений удалено: ' + blocked);
    if(progBlocked) notes.push('запрещённых упражнений из программы удалено: ' + progBlocked);
    toast('Импорт завершён — ' + notes.join(', '));
    if(state.currentTab === 'history') renderHistory();
    if(state.currentTab === 'volume') renderVolume();
  }catch(e){
    toast('Не удалось импортировать файл');
  }
}

/* ---------- Облачная синхронизация (ЗАГЛУШКА) ----------
   Данные никуда не уходят. Точка подключения реального бэкенда
   отмечена TODO ниже (Supabase / Firebase). Очередь outbox
   обрабатывается по принципу last-write-wins по updatedAt. */
async function syncDataWithCloud(manual){
  if(!navigator.onLine){ setSync('offline'); return; }
  setSync('sync');
  try{
    const queue = await dbGetAll(STORE_OUTBOX);
    /* TODO(Supabase): await supabase.from('workouts').upsert(rows) по updatedAt.
       TODO(Firebase): setDoc/updateDoc с полем updatedAt (last-write-wins). */
    await new Promise(r => setTimeout(r, 600));
    for(const item of queue){ await dbDelete(STORE_OUTBOX, item.id); }
    settings.lastSync = Date.now();
    saveSettings();
    setSync('ok');
    if(manual) toast('Синхронизировано (демо-режим)');
  }catch(e){
    setSync('err');
  }
}

function setSync(status){
  const chip = $('#syncChip'), txt = $('#syncText');
  chip.classList.remove('is-ok', 'is-err', 'is-sync');
  if(status === 'ok'){ chip.classList.add('is-ok'); txt.textContent = 'Синхронизировано'; }
  else if(status === 'offline'){ txt.textContent = 'Офлайн — данные на устройстве'; }
  else if(status === 'err'){ chip.classList.add('is-err'); txt.textContent = 'Ошибка синхронизации'; }
  else if(status === 'sync'){ chip.classList.add('is-sync'); txt.textContent = 'Синхронизация…'; }
  $('#lastSyncLabel').textContent = settings.lastSync
    ? 'Последняя синхронизация: ' + new Date(settings.lastSync).toLocaleString('ru-RU')
    : 'Ещё не синхронизировалось';
}

/* ---------- Тост ---------- */
let toastT = null;
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, 3200);
}

/* ---------- Табы ---------- */
function switchTab(name){
  state.currentTab = name;
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('is-active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p =>
    { p.hidden = (p.id !== 'tab-' + name); });
  if(name === 'program') renderProgram();
  if(name === 'volume') renderVolume();
  if(name === 'history') renderHistory();
  window.scrollTo(0, 0);
}

/* ---------- Тема и акцент ---------- */
function applyTheme(){
  document.documentElement.setAttribute('data-theme', settings.theme);
  const meta = $('#metaTheme');
  if(meta) meta.setAttribute('content', settings.theme === 'dark' ? '#121214' : '#F6F6F4');
  $('#themeToggle').checked = settings.theme === 'dark';
  applyAccent();
}
function applyAccent(){
  const acc = ACCENTS.find(a => a.id === settings.accent) || ACCENTS[0];
  const v = settings.theme === 'dark' ? acc.dark : acc.light;
  const r = document.documentElement.style;
  r.setProperty('--accent', v.a);
  r.setProperty('--on-accent', v.on);
  r.setProperty('--accent-soft', v.soft);
  document.querySelectorAll('.accent-dot').forEach(d =>
    d.classList.toggle('is-active', d.dataset.accent === acc.id));
  const label = $('#accentName');
  if(label) label.textContent = acc.name;
}
function renderAccentGrid(){
  const grid = $('#accentGrid');
  grid.innerHTML = ACCENTS.map(a =>
    '<button class="accent-dot" data-accent="' + a.id + '" type="button" ' +
    'style="background:' + a.light.a + '" aria-label="Акцент: ' + a.name + '" ' +
    'title="' + a.name + '"></button>'
  ).join('');
  applyAccent(); /* выставляем кольцо активного акцента сразу, а не после первого клика */
  grid.addEventListener('click', e => {
    const b = e.target.closest('.accent-dot');
    if(!b) return;
    settings.accent = b.dataset.accent;
    saveSettings();
    applyAccent();
  });
}

/* ---------- Фото создателей: ./akm1.png ./akm2.png ./akm3.png ----------
   Нет файла — показываем букву-инициал, ничего не ломается. */
function bindAvatars(){
  document.querySelectorAll('img[data-photo]').forEach(img => {
    const fb = img.parentElement.querySelector('.avatar-fallback');
    const show = ok => { img.hidden = !ok; if(fb) fb.hidden = ok; };
    img.addEventListener('load', () => show(true));
    img.addEventListener('error', () => show(false));
    img.src = './' + img.dataset.photo;
  });
}

/* ---------- Поделиться ---------- */
async function shareApp(){
  const data = { title:'AKM LEGENDS', text:'Офлайн-дневник тренировок AKM LEGENDS', url: location.href };
  if(navigator.share){
    try{ await navigator.share(data); }catch(e){}
  } else if(navigator.clipboard){
    try{ await navigator.clipboard.writeText(location.href); toast('Ссылка скопирована'); }
    catch(e){ toast('Скопируй ссылку из адресной строки'); }
  } else {
    toast('Скопируй ссылку из адресной строки');
  }
}

/* ---------- Подсказка расписания ---------- */
function updateScheduleHint(){
  const jsDay = new Date().getDay();
  const today = program.days.filter(d => d.weekday === jsDay).map(d => d.name);
  const base = WEEKDAY_RU[jsDay].charAt(0).toUpperCase() + WEEKDAY_RU[jsDay].slice(1) + '.';
  $('#scheduleHint').textContent = today.length
    ? base + ' Сегодня по программе: ' + today.join(', ') + '. Можно открыть и любой другой день.'
    : base + ' Закрепи дни за днями недели в конструкторе — или тренируйся в любом порядке.';
}

/* ============================================================
   КОНСТРУКТОР ПРОГРАММЫ
   ============================================================ */
function progExMeta(ex){
  const parts = [];
  if(ex.myo) parts.push('Myo · активация ' + fmtRange(ex.reps) + ' + ' + ex.minis + ' мини');
  else parts.push(ex.sets + '×' + fmtRange(ex.reps));
  if(ex.weight !== '') parts.push(ex.weight + ' кг');
  parts.push(ex.kind === 'compound' ? 'базовое' : 'изоляция');
  if(ex.muscles.length) parts.push(ex.muscles.map(m => MUSCLES[m]).join(', '));
  else parts.push('без группы');
  return parts.join(' · ');
}

function progExRow(day, ex, ei){
  const up = '<button class="ex-btn" data-upex="' + escapeHtml(day.id) + '|' + escapeHtml(ex.id) + '"' +
    (ei === 0 ? ' disabled' : '') + ' aria-label="Выше">↑</button>';
  const down = '<button class="ex-btn" data-downex="' + escapeHtml(day.id) + '|' + escapeHtml(ex.id) + '"' +
    (ei === day.exercises.length - 1 ? ' disabled' : '') + ' aria-label="Ниже">↓</button>';
  return '<div class="prog-ex">' +
    '<div class="prog-ex-main">' +
      '<span class="prog-ex-name">' + escapeHtml(ex.name) + '</span>' +
      (ex.desc ? '<span class="prog-ex-desc">' + escapeHtml(ex.desc) + '</span>' : '') +
      '<span class="prog-ex-meta">' + progExMeta(ex) + '</span>' +
    '</div>' +
    '<div class="prog-ex-btns">' +
      '<button class="ex-btn" data-editex="' + escapeHtml(day.id) + '|' + escapeHtml(ex.id) + '" aria-label="Редактировать">✎</button>' +
      up + down +
      '<button class="ex-btn ex-btn-danger" data-delex="' + escapeHtml(day.id) + '|' + escapeHtml(ex.id) + '" aria-label="Удалить">×</button>' +
    '</div></div>';
}

function renderProgram(){
  const list = $('#programList');
  if(!program.days.length){
    list.innerHTML = '<div class="empty">Программа пуста. Нажми «+ Новый тренировочный день» —<br>и собери что угодно: от PPL до круговой.</div>';
    return;
  }
  list.innerHTML = program.days.map(d => {
    const sets = d.exercises.reduce((s, e) => s + (e.myo ? 1 : e.sets), 0);
    return '<article class="card day-card" data-daycard="' + escapeHtml(d.id) + '">' +
      '<div class="day-card-head">' +
        '<input class="day-name-input" data-dayname="' + escapeHtml(d.id) + '" value="' + escapeHtml(d.name) + '" maxlength="60" aria-label="Название дня">' +
        '<select class="day-wd" data-daywd="' + escapeHtml(d.id) + '" aria-label="День недели">' + wdOptions(d.weekday) + '</select>' +
      '</div>' +
      '<p class="day-meta">' + d.exercises.length + ' упр. · ' + sets + ' подходов' +
        (d.weekday !== null ? ' · ' + WD_FULL[d.weekday].toLowerCase() : '') + '</p>' +
      '<div class="prog-ex-list">' +
        (d.exercises.length
          ? d.exercises.map((ex, ei) => progExRow(d, ex, ei)).join('')
          : '<p class="hint">Пока нет упражнений. Добавь первое — название, подходы, повторения, вес.</p>') +
      '</div>' +
      '<div class="day-actions">' +
        '<button class="btn btn-ghost btn-sm" data-addex="' + escapeHtml(d.id) + '" type="button">+ Упражнение</button>' +
        '<button class="btn btn-ghost btn-sm" data-dupday="' + escapeHtml(d.id) + '" type="button">Дублировать</button>' +
        '<button class="btn btn-ghost btn-sm btn-danger" data-delday="' + escapeHtml(d.id) + '" type="button">Удалить день</button>' +
      '</div></article>';
  }).join('');
}

function wdOptions(v){
  let o = '<option value=""' + (v === null ? ' selected' : '') + '>— без дня недели</option>';
  for(let i = 1; i <= 7; i++){
    const d = i % 7;
    o += '<option value="' + d + '"' + (v === d ? ' selected' : '') + '>' + WD_FULL[d] + '</option>';
  }
  return o;
}

function addDay(){
  const d = { id: uid('p'), name: 'День ' + (program.days.length + 1), weekday: null, exercises: [] };
  program.days.push(d);
  saveProgram();
  renderProgram();
  renderDayChips();
  updateScheduleHint();
  const inp = document.querySelector('.day-name-input[data-dayname="' + d.id + '"]');
  if(inp){
    inp.scrollIntoView({ block:'center', behavior:'smooth' });
    setTimeout(() => { try{ inp.focus(); inp.select(); }catch(e){} }, 250);
  }
}

function dupDay(id){
  const d = programDay(id);
  if(!d) return;
  const copy = {
    id: uid('p'),
    name: (d.name + ' (копия)').slice(0, 80),
    weekday: d.weekday,
    exercises: d.exercises.map(ex => ({ ...ex, id: uid('e'), muscles: (ex.muscles || []).slice(), reps: (ex.reps || [8,12]).slice() }))
  };
  program.days.splice(program.days.indexOf(d) + 1, 0, copy);
  saveProgram();
  renderProgram();
  renderDayChips();
  updateScheduleHint();
  toast('День продублирован');
}

function delDay(id){
  const d = programDay(id);
  if(!d) return;
  if(!confirm('Удалить день «' + d.name + '»? Прошедшие тренировки останутся в истории.')) return;
  program.days = program.days.filter(x => String(x.id) !== String(id));
  if(String(state.selectedDayId) === String(id)){
    state.selectedDayId = null;
    state.session = null;
    renderSession();
  }
  saveProgram();
  renderProgram();
  renderDayChips();
  updateScheduleHint();
  toast('День удалён');
}

function moveEx(key, dir){
  const sep = key.indexOf('|');
  const dayId = key.slice(0, sep), exId = key.slice(sep + 1);
  const d = programDay(dayId);
  if(!d) return;
  const i = d.exercises.findIndex(x => String(x.id) === String(exId));
  const j = i + dir;
  if(i < 0 || j < 0 || j >= d.exercises.length) return;
  const [x] = d.exercises.splice(i, 1);
  d.exercises.splice(j, 0, x);
  saveProgram();
  renderProgram();
}

function delEx(key){
  const sep = key.indexOf('|');
  const dayId = key.slice(0, sep), exId = key.slice(sep + 1);
  const d = programDay(dayId);
  if(!d) return;
  const ex = d.exercises.find(x => String(x.id) === String(exId));
  if(!ex) return;
  if(!confirm('Удалить упражнение «' + ex.name + '» из дня?')) return;
  d.exercises = d.exercises.filter(x => String(x.id) !== String(exId));
  saveProgram();
  renderProgram();
  renderDayChips();
}

function onProgramListClick(e){
  const t = e.target;
  const edit = t.closest('[data-editex]');
  if(edit){ const k = edit.dataset.editex; openExModal({ mode:'edit', dayId:k.slice(0, k.indexOf('|')), exId:k.slice(k.indexOf('|') + 1) }); return; }
  const add = t.closest('[data-addex]');
  if(add){ openExModal({ mode:'create', dayId:add.dataset.addex }); return; }
  const dup = t.closest('[data-dupday]');
  if(dup){ dupDay(dup.dataset.dupday); return; }
  const delD = t.closest('[data-delday]');
  if(delD){ delDay(delD.dataset.delday); return; }
  const up = t.closest('[data-upex]');
  if(up){ moveEx(up.dataset.upex, -1); return; }
  const down = t.closest('[data-downex]');
  if(down){ moveEx(down.dataset.downex, 1); return; }
  const delE = t.closest('[data-delex]');
  if(delE){ delEx(delE.dataset.delex); return; }
}

function onProgramListChange(e){
  const t = e.target;
  const nameInp = t.closest('.day-name-input');
  if(nameInp){
    const d = programDay(nameInp.dataset.dayname);
    if(d){
      d.name = nameInp.value.trim().slice(0, 80) || 'Без названия';
      nameInp.value = d.name;
      saveProgram();
      renderDayChips();
      updateScheduleHint();
    }
    return;
  }
  const wdSel = t.closest('.day-wd');
  if(wdSel){
    const d = programDay(wdSel.dataset.daywd);
    if(d){
      d.weekday = wdSel.value === '' ? null : +wdSel.value;
      saveProgram();
      renderProgram();
      renderDayChips();
      updateScheduleHint();
    }
  }
}

/* ============================================================
   МОДАЛКА УПРАЖНЕНИЯ (конструктор + быстрое добавление в тренировке)
   ============================================================ */
const modal = { mode:null, dayId:null, exId:null, sets:3, minis:4, muscles:new Set() };

function renderModalMuscles(){
  $('#fMuscles').innerHTML = Object.entries(MUSCLES).map(([k, v]) =>
    '<button class="m-chip' + (modal.muscles.has(k) ? ' is-on' : '') + '" data-m="' + k + '" type="button">' + v + '</button>'
  ).join('');
}

function syncModalUi(){
  const myo = $('#fMyo').checked;
  $('#fSetsVal').textContent = modal.sets;
  $('#fMinisVal').textContent = modal.minis;
  $('#fSetsStep').parentElement.hidden = myo;
  $('#fMinisWrap').hidden = !myo;
  $('#fReps').placeholder = myo ? '12–15' : '8–12';
}

function updateModalWarn(){
  const name = $('#fName').value.trim();
  const leg = [...modal.muscles].some(m => m === 'quads' || m === 'hamstrings');
  const warn = leg && name && !legWhitelistOk(name);
  const w = $('#fWarn');
  w.hidden = !warn;
  if(warn) w.textContent = 'Ноги: по медицинским ограничениям разрешены только разгибания ног, ' +
    'сгибания ног, горизонтальный жим ногами и гиперэкстензия без веса. Проверь упражнение.';
}

function openExModal(opts){
  modal.mode = opts.mode;
  modal.dayId = opts.dayId || null;
  modal.exId = opts.exId || null;
  modal.muscles = new Set();
  $('#fErr').hidden = true;
  $('#fWarn').hidden = true;
  $('#fMyo').checked = false;
  $('#fKind').value = 'isolation';
  $('#fWeight').value = '';
  $('#fReps').value = '';
  $('#fName').value = '';
  $('#fDesc').value = '';
  $('#fAddWrap').hidden = true;

  if(modal.mode === 'edit'){
    const d = programDay(modal.dayId);
    const ex = d && d.exercises.find(x => String(x.id) === String(modal.exId));
    if(!ex) return;
    $('#exModalTitle').textContent = 'Редактировать упражнение';
    $('#fName').value = ex.name;
    $('#fDesc').value = ex.desc || '';
    modal.sets = ex.sets;
    modal.minis = ex.minis;
    modal.muscles = new Set(ex.muscles || []);
    $('#fReps').value = fmtRange(ex.reps);
    $('#fWeight').value = ex.weight === '' ? '' : ex.weight;
    $('#fKind').value = ex.kind;
    $('#fMyo').checked = ex.myo;
    $('#fDelete').hidden = false;
  } else {
    $('#exModalTitle').textContent = 'Новое упражнение';
    modal.sets = 3;
    modal.minis = 4;
    $('#fDelete').hidden = true;
    if(modal.mode === 'session'){
      $('#fAddWrap').hidden = false;
      $('#fAddToProgram').checked = !!programDay(modal.dayId);
    }
  }
  renderModalMuscles();
  syncModalUi();
  updateModalWarn();
  $('#exModal').hidden = false;
  document.body.classList.add('no-scroll');
  setTimeout(() => { try{ $('#fName').focus(); }catch(e){} }, 220);
}

function closeExModal(){
  $('#exModal').hidden = true;
  document.body.classList.remove('no-scroll');
}

function parseRepsText(str){
  const s = String(str || '').trim().replace(/\s+/g, '').replace(/,/g, '.').replace(/[–—−~]+/g, '-');
  if(!s) return null;
  const m = s.match(/^(\d{1,3})(?:-(\d{1,3}))?$/);
  if(!m) return null;
  let a = +m[1], b = m[2] ? +m[2] : a;
  if(a < 1 || a > 100 || b < 1 || b > 100) return null;
  if(b < a){ const t = a; a = b; b = t; }
  return [a, b];
}

function modalError(msg){
  const e = $('#fErr');
  e.textContent = msg;
  e.hidden = false;
}

function saveExModal(){
  const name = $('#fName').value.trim();
  if(!name){ modalError('Введи название упражнения.'); return; }
  if(isForbidden(name)){
    modalError('⛔ Запрещено медицинскими ограничениями (киста таранной кости): приседы, выпады, ' +
      'становые тяги, прыжки, бег, подъёмы на носок и т.п. Добавить нельзя.');
    return;
  }
  const reps = parseRepsText($('#fReps').value);
  if(!reps){ modalError('Повторения: введи число или диапазон, например 8–12.'); return; }
  const myo = $('#fMyo').checked;
  const ex = {
    id: modal.exId || uid('e'),
    name: name.slice(0, 120),
    desc: $('#fDesc').value.trim().slice(0, 400),
    kind: $('#fKind').value === 'compound' ? 'compound' : 'isolation',
    myo: myo,
    minis: modal.minis,
    muscles: [...modal.muscles],
    sets: myo ? 1 : modal.sets,
    reps: reps,
    weight: $('#fWeight').value === '' ? '' : (+$('#fWeight').value || ''),
    rpe: ''
  };

  if(modal.mode === 'session'){
    /* Быстрое добавление прямо в тренировке */
    state.session.exercises.push(exToSession(ex));
    persistWorkout();
    renderSession();
    if($('#fAddToProgram').checked && programDay(modal.dayId)){
      programDay(modal.dayId).exercises.push(ex);
      saveProgram();
      renderProgram();
      renderDayChips();
    }
    closeExModal();
    toast('Упражнение добавлено в тренировку');
    return;
  }

  const d = programDay(modal.dayId);
  if(!d){ closeExModal(); return; }
  if(modal.mode === 'create'){
    d.exercises.push(ex);
    toast('Упражнение добавлено');
  } else {
    const i = d.exercises.findIndex(x => String(x.id) === String(modal.exId));
    if(i >= 0) d.exercises[i] = ex;
    toast('Изменения сохранены');
  }
  saveProgram();
  renderProgram();
  renderDayChips();
  closeExModal();
}

function deleteFromModal(){
  if(modal.mode !== 'edit' || !modal.dayId || !modal.exId) return;
  closeExModal();
  delEx(modal.dayId + '|' + modal.exId);
}

function onModalClick(e){
  const t = e.target;
  if(t.closest('[data-close]')){ closeExModal(); return; }
  const step = t.closest('[data-step]');
  if(step){
    const [what, dirS] = step.dataset.step.split('|');
    const dir = +dirS;
    if(what === 'sets') modal.sets = clampInt(modal.sets + dir, 1, 10, modal.sets);
    if(what === 'minis') modal.minis = clampInt(modal.minis + dir, 2, 8, modal.minis);
    syncModalUi();
    return;
  }
  const chip = t.closest('.m-chip');
  if(chip){
    const m = chip.dataset.m;
    if(modal.muscles.has(m)) modal.muscles.delete(m);
    else modal.muscles.add(m);
    chip.classList.toggle('is-on', modal.muscles.has(m));
    updateModalWarn();
  }
}

/* ============================================================
   СОБЫТИЯ И СТАРТ
   ============================================================ */
let deferredPrompt = null;

function bindEvents(){
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.addEventListener('click', () => switchTab(b.dataset.tab)));

  /* Тренировка */
  $('#sessionArea').addEventListener('input', onSetInput);
  $('#sessionArea').addEventListener('click', onSessionClick);
  $('#addExBtn').addEventListener('click', () => {
    if(!state.session) return;
    openExModal({ mode:'session', dayId: state.selectedDayId });
  });
  $('#finishBtn').addEventListener('click', finishWorkout);
  $('#sessionComment').addEventListener('change', e => {
    if(state.session){ state.session.comment = e.target.value; persistWorkout(); }
  });

  $('#bannerClose').addEventListener('click', () => {
    $('#recoveryNote').hidden = true;
    settings.bannerHidden = true; saveSettings();
  });

  /* Лента дней */
  $('#dayChips').addEventListener('click', e => {
    const add = e.target.closest('[data-addday]');
    if(add){ switchTab('program'); return; }
    const chip = e.target.closest('.day-chip[data-day]');
    if(chip) selectDay(chip.dataset.day);
  });

  /* Конструктор */
  $('#programList').addEventListener('click', onProgramListClick);
  $('#programList').addEventListener('change', onProgramListChange);
  $('#addDayBtn').addEventListener('click', addDay);

  /* Модалка упражнения */
  $('#exModal').addEventListener('click', onModalClick);
  $('#fMyo').addEventListener('change', syncModalUi);
  $('#fSave').addEventListener('click', saveExModal);
  $('#fDelete').addEventListener('click', deleteFromModal);
  $('#fName').addEventListener('input', () => { $('#fErr').hidden = true; updateModalWarn(); });
  $('#fReps').addEventListener('input', () => { $('#fErr').hidden = true; });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && !$('#exModal').hidden) closeExModal();
    if((e.key === 'Enter' || e.key === ' ') &&
       e.target.classList && e.target.classList.contains('ex-desc')){
      e.preventDefault(); e.target.classList.toggle('open');
    }
  });

  /* Объём */
  $('#volPrev').addEventListener('click', () => { state.volumeOffset--; renderVolume(); });
  $('#volNext').addEventListener('click', () => {
    if(state.volumeOffset < 0){ state.volumeOffset++; renderVolume(); }
  });

  /* История */
  $('#historyList').addEventListener('click', onHistoryClick);

  /* Таймер */
  $('#timerAdd').addEventListener('click', () => {
    if(timer.endsAt <= Date.now()){
      /* таймер уже сработал: +30 с перезапускает отсчёт заново */
      clearTimeout(timer.hideT);
      timer.endsAt = Date.now() + 30000;
      timer.total = 30000;
      $('#timerBar').classList.remove('is-done');
      $('#timerLabel').textContent = 'Отдых';
      if(!timer.int) timer.int = setInterval(tickTimer, 200);
    } else {
      timer.endsAt += 30000; timer.total += 30000;
    }
    tickTimer();
  });
  $('#timerSkip').addEventListener('click', hideTimer);

  /* Настройки */
  $('#themeToggle').addEventListener('change', e => {
    settings.theme = e.target.checked ? 'dark' : 'light';
    saveSettings(); applyTheme();
  });

  $('#restCompound').value = settings.restCompound;
  $('#restIsolation').value = settings.restIsolation;
  $('#restMyo').value = settings.restMyo;
  $('#restLong').value = settings.restLong;
  $('#restCompound').addEventListener('change', e => { settings.restCompound = +e.target.value || 180; saveSettings(); });
  $('#restIsolation').addEventListener('change', e => { settings.restIsolation = +e.target.value || 90; saveSettings(); });
  $('#restMyo').addEventListener('change', e => { settings.restMyo = +e.target.value || 20; saveSettings(); });
  $('#restLong').addEventListener('change', e => { settings.restLong = +e.target.value || 240; saveSettings(); });

  $('#exportBtn').addEventListener('click', exportData);
  $('#importBtn').addEventListener('click', () => $('#importInput').click());
  $('#importInput').addEventListener('change', e => {
    if(e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });
  $('#syncBtn').addEventListener('click', () => syncDataWithCloud(true));
  $('#syncChip').addEventListener('click', () => syncDataWithCloud(true));
  $('#shareBtn').addEventListener('click', shareApp);

  window.addEventListener('online', () => syncDataWithCloud(false));
  window.addEventListener('offline', () => setSync('offline'));

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    $('#installBtn').hidden = false;
  });
  $('#installBtn').addEventListener('click', async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const c = await deferredPrompt.userChoice;
    if(c.outcome === 'accepted') toast('Установлено');
    deferredPrompt = null;
    $('#installBtn').hidden = true;
  });
}

async function init(){
  loadSettings();
  loadProgress();
  loadProgram();
  applyTheme();
  renderAccentGrid();
  bindEvents();
  bindAvatars();
  if(settings.bannerHidden) $('#recoveryNote').hidden = true;

  buildDayChips();
  renderProgram();
  updateScheduleHint();

  try{ await openDB(); }
  catch(e){ toast('Приватный режим: данные не сохранятся после закрытия'); }

  /* Открываем сегодняшний день: закреплённый за днём недели или первый */
  if(program.days.length){
    const jsDay = new Date().getDay();
    const today = program.days.find(d => d.weekday === jsDay);
    await selectDay((today || program.days[0]).id);
  } else {
    renderSession();
  }

  syncDataWithCloud(false);
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);

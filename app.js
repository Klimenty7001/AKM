'use strict';

/* Точка отсчёта для загрузочного экрана: держим его минимум 900 мс,
   чтобы анимация логотипа была видна даже при мгновенной загрузке */
const SPLASH_T0 = Date.now();

/* ============================================================
   AKM LEGENDS v3.7 — офлайн-дневник тренировок
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

/* ---------- Группы мышц и ориентиры объёма ----------
   «Кора» — разгибатели спины + бицепс бедра как стабилизаторы;
   цели каждой зоны можно менять во вкладке «Объём» (тап по строке). */
const MUSCLES = {
  chest:'Грудь', back:'Спина', delts:'Плечи', biceps:'Бицепс',
  triceps:'Трицепс', quads:'Квадрицепс', hamstrings:'Бицепс бедра',
  glutes:'Ягодицы', core:'Мышцы кора', abs:'Пресс'
};
const VOLUME_ZONES = {
  chest:[10,14], back:[10,14], delts:[6,12], biceps:[4,8],
  triceps:[4,8], quads:[2,6], hamstrings:[2,6], glutes:[2,6],
  core:[2,6], abs:[2,6]
};
function zoneOf(key){
  const custom = settings.volZones && settings.volZones[key];
  return (custom && custom[0] < custom[1]) ? custom : VOLUME_ZONES[key];
}

/* ---------- Гибридная база упражнений ----------
   Жёсткие id + теги-синонимы: поиск при создании упражнения
   привязывает выбор к единому id, и статистика у друга после
   импорта совпадает с твоей. Редкие упражнения получают
   локальный uuid, а при экспорте едут внутри JSON целиком. */
const BASE_EX = [
  /* Грудь */
  { id:'bench_press_bb',    name:'Жим штанги лёжа', tags:['жим лёжа','жым','bench'], muscles:['chest'], kind:'compound' },
  { id:'bench_press_db',    name:'Жим гантелей лёжа', tags:['гантели лёжа','db bench'], muscles:['chest'], kind:'compound' },
  { id:'bench_press_incline',name:'Жим гантелей на наклонной скамье', tags:['наклонный жим','инклайн','incline'], muscles:['chest'], kind:'compound' },
  { id:'butterfly_machine', name:'Сведение в тренажёре «бабочка»', tags:['бабочка','пэк-дэк','пекдек','pec deck','разведение в тренажёре'], muscles:['chest'], kind:'isolation' },
  { id:'cable_crossover',   name:'Сведение в кроссовере', tags:['кроссовер','crossover','сведение рук'], muscles:['chest'], kind:'isolation' },
  { id:'dips_chest',        name:'Отжимания на брусьях', tags:['брусья','dips','отжимания на брусьях'], muscles:['chest','triceps'], kind:'compound' },
  { id:'pushups',           name:'Отжимания от пола', tags:['отжимания','push-up','pushup'], muscles:['chest','triceps'], kind:'bodyweight' },
  /* Спина */
  { id:'pullups',           name:'Подтягивания', tags:['подтягивание','турник','pull-up','pullup'], muscles:['back'], kind:'bodyweight' },
  { id:'lat_pulldown',      name:'Верхняя тяга в тренажёре', tags:['верхний блок','тяга сверху','lat pulldown'], muscles:['back'], kind:'compound' },
  { id:'db_row',            name:'Тяга гантели одной рукой', tags:['тяга гантели','тяга в наклоне одной рукой'], muscles:['back'], kind:'compound' },
  { id:'barbell_row',       name:'Тяга штанги в наклоне', tags:['тяга штанги','наклонный ряд'], muscles:['back'], kind:'compound' },
  { id:'seated_cable_row',  name:'Тяга нижнего блока сидя', tags:['нижний блок','seated row','тяга сидя'], muscles:['back'], kind:'compound' },
  { id:'chest_supported_row',name:'Тяга с упором грудью в тренажёре', tags:['тяга лежа на скамье','рычажная тяга'], muscles:['back'], kind:'compound' },
  /* Плечи */
  { id:'ohp_bb',            name:'Жим штанги стоя', tags:['армейский жим','жим над головой','ohp'], muscles:['delts'], kind:'compound' },
  { id:'lateral_raise',     name:'Махи гантелями в стороны', tags:['махи','разведения в стороны','lateral raise'], muscles:['delts'], kind:'isolation' },
  { id:'cable_lateral',     name:'Махи на блоке в сторону', tags:['махи в кроссовере','блок в сторону'], muscles:['delts'], kind:'isolation' },
  { id:'rear_delt_fly',     name:'Разведения в наклоне (задняя дельта)', tags:['задняя дельта','задние пучки','rear delt'], muscles:['delts'], kind:'isolation' },
  { id:'face_pull',         name:'Тяга каната к лицу', tags:['фейспул','face pull'], muscles:['delts','back'], kind:'isolation' },
  /* Руки */
  { id:'barbell_curl',      name:'Подъём штанги на бицепс', tags:['подъем штанги','сгибание со штангой','barbell curl'], muscles:['biceps'], kind:'isolation' },
  { id:'biomech_curl',      name:'Подъём штанги на бицепс (биомеханический)', tags:['биомех'], muscles:['biceps'], kind:'isolation' },
  { id:'hammer_curl',       name:'Молотковые сгибания', tags:['молотки','молот','hammer'], muscles:['biceps'], kind:'isolation' },
  { id:'incline_db_curl',   name:'Сгибания на наклонной скамье', tags:['сгибания инклайн','incline curl'], muscles:['biceps'], kind:'isolation' },
  { id:'rope_pushdown',     name:'Разгибания на трицепс с канатом', tags:['канат на трицепс','пушка','pushdown'], muscles:['triceps'], kind:'isolation' },
  { id:'close_grip_bench',  name:'Жим узким хватом', tags:['узкий жим','close grip'], muscles:['triceps','chest'], kind:'compound' },
  { id:'skullcrusher',      name:'Французский жим', tags:['француз','skullcrusher','разгибания лежа'], muscles:['triceps'], kind:'isolation' },
  /* Ноги (медицинский белый список) */
  { id:'leg_extension',     name:'Разгибания ног в тренажёре', tags:['разгибания','leg extension'], muscles:['quads'], kind:'isolation' },
  { id:'leg_curl',          name:'Сгибания ног в тренажёре', tags:['сгибания ног','leg curl'], muscles:['hamstrings'], kind:'isolation' },
  { id:'leg_press_horizontal',name:'Горизонтальный жим ногами', tags:['жим ногами','leg press','платформа'], muscles:['quads'], kind:'compound' },
  { id:'hyperextension',    name:'Гиперэкстензия без веса', tags:['гиперэкстензия','разгибатели спины','back extension'], muscles:['core'], kind:'bodyweight' },
  /* Ягодицы и кора */
  { id:'hip_thrust_light',  name:'Ягодичный мост (умеренный вес)', tags:['мост','хип траст','hip thrust'], muscles:['glutes'], kind:'isolation' },
  { id:'glute_kickback',    name:'Отведение ноги назад в кроссовере', tags:['отведение назад','kickback'], muscles:['glutes'], kind:'isolation' },
  { id:'plank',             name:'Планка', tags:['планка','plank'], muscles:['abs','core'], kind:'bodyweight' },
  { id:'crunches',          name:'Скручивания на пресс', tags:['пресс','скручивания','crunch'], muscles:['abs'], kind:'bodyweight' },
  { id:'leg_raise',         name:'Подъёмы ног в висе', tags:['подъемы ног','подъемы в висе'], muscles:['abs'], kind:'bodyweight' },
  { id:'back_extension_slow',name:'Разгибания спины в тренажёре', tags:['разгибатели спины','поясница'], muscles:['core'], kind:'isolation' }
];
function normExName(s){
  return String(s || '').toLowerCase().replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
}
function findBaseEx(name){
  const n = normExName(name);
  if(!n) return null;
  /* точное совпадение названия или тега */
  for(const b of BASE_EX){
    if(normExName(b.name) === n) return b;
    if(b.tags.some(t => normExName(t) === n)) return b;
  }
  /* подстрока в названии или теге (в обе стороны) */
  for(const b of BASE_EX){
    const bn = normExName(b.name);
    if(bn.includes(n) || n.includes(bn)) return b;
    for(const t of b.tags){
      const tn = normExName(t);
      if(tn.includes(n) || n.includes(tn)) return b;
    }
  }
  return null;
}

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
  bannerHidden:false, lastSync:0,
  myoAuto:true,
  sound:{ volume:80, end:'classic', myoStart:'chirp', myoEnd:'gong', custom:null },
  profile:{ age:19, height:170, weight:80 },
  weightLog:[], volZones:{}
};
let settings = { ...DEFAULTS };
let progressData = {};

function loadSettings(){
  let raw = {};
  try{ raw = JSON.parse(localStorage.getItem('akm.settings.v1') || '{}') || {}; }catch(e){ raw = {}; }
  settings = { ...DEFAULTS, ...raw,
    myoAuto: raw.myoAuto === undefined ? true : !!raw.myoAuto,
    sound: { ...DEFAULTS.sound, ...(raw.sound && typeof raw.sound === 'object' ? raw.sound : {}),
      volume: clampInt((raw.sound && raw.sound.volume) !== undefined ? raw.sound.volume : 80, 0, 100, 80) },
    profile:{ ...DEFAULTS.profile, ...(raw.profile || {}) },
    weightLog: Array.isArray(raw.weightLog) ? raw.weightLog : [],
    volZones: (raw.volZones && typeof raw.volZones === 'object') ? raw.volZones : {}
  };
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

/* Программа по умолчанию — ПУСТАЯ: новый пользователь сразу собирает
   свою тренировку, ничего не приходится удалять. Старый 4-дневный
   сплит больше не подставляется; LEGACY_DAYS остался в коде только
   как справочник мышц и имён для записей истории (EX_BY_ID выше). */
function defaultProgram(){
  return { v: 2, name: 'Моя программа', days: [] };
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
            baseId: ex.baseId ? String(ex.baseId).slice(0, 64) : '',
            name: String(ex.name).slice(0, 120),
            desc: String(ex.desc || '').slice(0, 400),
            kind: ex.kind === 'compound' ? 'compound' : (ex.kind === 'bodyweight' ? 'bodyweight' : 'isolation'),
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
  return { v: 2, name: String(raw && raw.name ? raw.name : '').slice(0, 60),
    important: String((raw && raw.important) || '').slice(0, 2000), days, saved: true };
}

function loadProgram(){
  let raw = null;
  try{ raw = JSON.parse(localStorage.getItem(PROGRAM_KEY) || 'null'); }catch(e){}
  if(raw && Array.isArray(raw.days) && (raw.days.length || raw.saved === true)){
    program = sanitizeProgram(raw);
    if(!program.name) program.name = 'Моя программа';
    if(!program.important) program.important = '';
    return;
  }
  /* Первый запуск: чистая программа без шаблона. saved:true сразу,
     чтобы пустая программа (уже с именем и заметками) не пересоздавалась */
  program = defaultProgram();
  program.saved = true;
  try{ localStorage.setItem(PROGRAM_KEY, JSON.stringify(program)); }catch(e){}
}

function saveProgram(){
  try{ localStorage.setItem(PROGRAM_KEY, JSON.stringify({ ...program, v:2, saved:true })); }catch(e){}
  dbPut(STORE_OUTBOX, { id:'program', ts:Date.now() }).catch(() => {});
}
function programDay(id){
  return program.days.find(d => String(d.id) === String(id)) || null;
}

/* ============================================================
   АРХИВ: АКТИВНАЯ ПРОГРАММА / СОХРАНЁННЫЕ ПРОГРАММЫ / ИСТОРИЯ
   1) Активная программа — то, по чему тренируемся сейчас
      (вкладка «Программа», localStorage 'akm.program.v1').
   2) Сохранённые программы — именованные снимки, количество
      не ограничено (localStorage 'akm.savedPrograms.v1').
   3) История тренировок — IndexedDB, к программам не привязана:
      переключение снимков её никогда не меняет.
   ============================================================ */
const SAVED_KEY = 'akm.savedPrograms.v1';
let savedPrograms = [];

function loadSavedPrograms(){
  let raw = null;
  try{ raw = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); }catch(e){}
  if(!Array.isArray(raw)) raw = [];
  savedPrograms = raw
    .filter(p => p && p.id && typeof p.name === 'string' && p.program)
    .map(p => ({ id:String(p.id), name:String(p.name).slice(0, 60), ts:+p.ts || 0,
                 program:sanitizeProgram(p.program) }));
  saveSavedPrograms();
}
function saveSavedPrograms(){
  try{ localStorage.setItem(SAVED_KEY, JSON.stringify(savedPrograms)); }catch(e){}
  dbPut(STORE_OUTBOX, { id:'savedPrograms', ts:Date.now() }).catch(() => {});
}
function savedById(id){
  return savedPrograms.find(p => String(p.id) === String(id)) || null;
}
function programJson(){
  return JSON.stringify(program.days);
}

/* ---------- Рендер архива ---------- */
function renderArchive(){
  renderActiveCard();
  renderSavedList();
  renderHistory();
}
function renderActiveCard(){
  const el = $('#archActive');
  if(!el) return;
  el.innerHTML = '<div class="arch-active">' +
    '<div><strong class="arch-name">' + escapeHtml(program.name || 'Без названия') + '</strong>' +
    '<span class="arch-meta">' + program.days.length + ' дн. · ' + countEx(program) + ' упр.</span></div>' +
    '<span class="h-badge">активна</span></div>';
}
function renderSavedList(){
  const el = $('#savedList');
  if(!el) return;
  if(!savedPrograms.length){
    el.innerHTML = '<p class="hint arch-empty">Пока ничего не сохранено. Нажми кнопку ниже — снимок текущей программы появится здесь.</p>';
    return;
  }
  el.innerHTML = savedPrograms.slice().sort((a, b) => b.ts - a.ts).map(p =>
    '<div class="saved-item" data-sid="' + escapeHtml(p.id) + '">' +
      '<div class="saved-main"><strong>' + escapeHtml(p.name) + '</strong>' +
      '<span class="arch-meta">' + new Date(p.ts).toLocaleDateString('ru-RU') + ' · ' +
      ((p.program.days || []).length) + ' дн. · ' + countEx(p.program) + ' упр.</span></div>' +
      '<div class="saved-btns">' +
        '<button class="btn btn-primary btn-sm" data-openprog="' + escapeHtml(p.id) + '" type="button">Открыть</button>' +
        '<button class="ex-btn" data-renameprog="' + escapeHtml(p.id) + '" aria-label="Переименовать" title="Переименовать">✎</button>' +
        '<button class="ex-btn" data-updateprog="' + escapeHtml(p.id) + '" aria-label="Заменить содержимое текущей программой" title="Заменить содержимое текущей программой">↻</button>' +
        '<button class="ex-btn ex-btn-danger" data-delprog="' + escapeHtml(p.id) + '" aria-label="Удалить" title="Удалить">×</button>' +
      '</div></div>'
  ).join('');
}

/* ---------- Сохранение под именем (модалка) ---------- */
const nameCtx = { mode:null, id:null };
function openNameModal(title, value, mode, id){
  $('#nameModalTitle').textContent = title;
  $('#progNameInput').value = value || '';
  $('#nameErr').hidden = true;
  nameCtx.mode = mode;
  nameCtx.id = id || null;
  $('#nameModal').hidden = false;
  document.body.classList.add('no-scroll');
  setTimeout(() => { try{ const i = $('#progNameInput'); i.focus(); i.select(); }catch(e){} }, 220);
}
function closeNameModal(){
  $('#nameModal').hidden = true;
  document.body.classList.remove('no-scroll');
}
function confirmNameModal(){
  const name = $('#progNameInput').value.trim().slice(0, 60);
  if(!name){ const e = $('#nameErr'); e.textContent = 'Введи название программы.'; e.hidden = false; return; }
  if(nameCtx.mode === 'save-new'){
    savedPrograms.push({ id: uid('sp'), name: name, ts: Date.now(),
      program: sanitizeProgram({ ...program, name: name }) });
    saveSavedPrograms();
    closeNameModal();
    renderSavedList();
    toast('Программа «' + name + '» сохранена');
  } else if(nameCtx.mode === 'rename'){
    const p = savedById(nameCtx.id);
    if(p){ p.name = name; saveSavedPrograms(); renderSavedList(); }
    closeNameModal();
    if(p) toast('Переименовано в «' + name + '»');
  }
}

/* ---------- Переключение активной программы ---------- */
let pendingSwitchId = null;
function requestSwitch(id){
  const target = savedById(id);
  if(!target) return;
  /* Целевой снимок уже полностью совпадает с текущей программой —
     терять нечего, переключаем без предупреждения. */
  if(JSON.stringify(target.program.days) === programJson()){
    applyProgram(target);
    return;
  }
  pendingSwitchId = id;
  let text = 'Текущая программа <strong>«' + escapeHtml(program.name || 'Без названия') +
    '»</strong> не сохранена. При переключении на <strong>«' +
    escapeHtml(target.name) + '»</strong> несохранённые изменения будут потеряны.';
  if(state.session) text += '<br>Сейчас идёт незавершённая тренировка — она тоже будет сброшена.';
  $('#switchText').innerHTML = text;
  $('#switchModal').hidden = false;
  document.body.classList.add('no-scroll');
}
function closeSwitchModal(){
  pendingSwitchId = null;
  $('#switchModal').hidden = true;
  document.body.classList.remove('no-scroll');
}
function doSwitch(saveFirst){
  const target = savedById(pendingSwitchId);
  if(!target){ closeSwitchModal(); return; }
  if(saveFirst){
    const autoName = ((program.name || 'Программа') + ' · ' +
      new Date().toLocaleDateString('ru-RU')).slice(0, 60);
    savedPrograms.push({ id: uid('sp'), name: autoName, ts: Date.now(),
      program: sanitizeProgram(program) });
    saveSavedPrograms();
  }
  closeSwitchModal();
  applyProgram(target);
}
function applyProgram(saved){
  program = sanitizeProgram(saved.program);
  program.name = saved.name;
  saveProgram();
  state.selectedDayId = null;
  state.session = null;
  buildDayChips();
  renderProgram();
  renderDayChips();
  updateScheduleHint();
  renderSession();
  renderArchive();
  switchTab('program');
  toast('Открыта программа «' + saved.name + '»');
}

/* ---------- Клики по списку сохранённых ---------- */
function onSavedClick(e){
  const t = e.target;
  const open = t.closest('[data-openprog]');
  if(open){ requestSwitch(open.dataset.openprog); return; }
  const ren = t.closest('[data-renameprog]');
  if(ren){
    const p = savedById(ren.dataset.renameprog);
    if(p) openNameModal('Переименовать программу', p.name, 'rename', p.id);
    return;
  }
  const upd = t.closest('[data-updateprog]');
  if(upd){
    const p = savedById(upd.dataset.updateprog);
    if(p && confirm('Заменить содержимое «' + p.name + '» текущей программой «' +
        (program.name || 'Без названия') + '»?')){
      p.program = sanitizeProgram(program);
      p.ts = Date.now();
      saveSavedPrograms();
      renderSavedList();
      toast('Снимок «' + p.name + '» обновлён');
    }
    return;
  }
  const del = t.closest('[data-delprog]');
  if(del){
    const p = savedById(del.dataset.delprog);
    if(p && confirm('Удалить сохранённую программу «' + p.name + '»?\nАктивная программа и история тренировок не изменятся.')){
      savedPrograms = savedPrograms.filter(x => x.id !== p.id);
      saveSavedPrograms();
      renderSavedList();
      toast('Программа «' + p.name + '» удалена');
    }
  }
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
    baseId: ex.baseId || '',
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
    ? '<div class="myo-row"><span class="myo-label">' +
      (settings.myoAuto
        ? 'Автоматически: мини-серии по ' + settings.restMyo + ' с идут сами — кнопки для правки:'
        : 'Мини-серии по ' + settings.restMyo + ' с — отметь выполненные:') +
      '</span>' +
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
  /* Приглушение синхронизируется с реальным состоянием сессии при
     КАЖДОМ рендере: иначе класс оставался бы на постоянном #sessionArea
     при переключении дня или после перезапуска — новый день выглядел
     «завершённым», хотя это была старая тренировка. */
  area.classList.toggle('is-finished', !!(s && s.finished));
  if(!s){
    addBtn.hidden = true; finish.hidden = true; comment.hidden = true;
    area.innerHTML = program.days.length
      ? '<div class="empty">Выбери день сверху — и вперёд.</div>'
      : '<div class="empty">Здесь пока пусто.<br>Создай первый день во вкладке «Программа» —<br>и собери тренировку под себя.</div>';
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

/* ---------- События сессии ---------- */
/* Пружинка на отметке подхода/мини-серии: класс just-done живёт ровно
   до конца анимации, плюс страховка по таймеру — при системном
   prefers-reduced-motion animationend не наступит никогда. */
function popDone(btn){
  btn.classList.add('just-done');
  const kill = () => btn.classList.remove('just-done');
  btn.addEventListener('animationend', kill, { once:true });
  setTimeout(kill, 700);
}

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
    if(s.done){
      /* пружинка на факте отметки, а не на каждой перерисовке */
      popDone(doneBtn);
    }
    persistWorkout();
    updateExSum(card);
    if(s.done){
      ensureAudio(); /* готовим звук по жесту — иначе iOS держит контекст в suspended */
      if(navigator.vibrate) navigator.vibrate(15);
      if(exerciseComplete(ex)){
        /* Упражнение закрыто: длинный отдых и авто-сворачивание */
        startRest(settings.restLong, 'Упражнение выполнено');
        setFolded(card, true);
      } else if(ex.myo && settings.myoAuto){
        /* Активация Myo отмечена — дальше цепочка мини-серий пойдёт сама */
        startRest(settings.restMyo, 'Мини-серия 1 из ' + ex.myo.minis.length,
          { mode:'myo', exId: String(ex.id) });
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
    if(ex.myo.minis[i]){
      popDone(miniBtn);
    }
    persistWorkout();
    updateExSum(card);
    if(ex.myo.minis[i]){
      ensureAudio();
      if(navigator.vibrate) navigator.vibrate(15);
      if(exerciseComplete(ex)){
        startRest(settings.restLong, 'Упражнение выполнено');
        setFolded(card, true);
      } else if(settings.myoAuto){
        /* ручная правка в авто-режиме продолжает цепочку от этой мини-серии */
        startRest(settings.restMyo, 'Мини-серия ' + (i + 2) + ' из ' + ex.myo.minis.length,
          { mode:'myo', exId: String(ex.id) });
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

/* Завершение тренировки — только вручную, удержанием кнопки 2 секунды
   (attachHold + toggleFinish ниже). Автозавершения при закрытии всех
   упражнений нет и не должно быть: пользователь может убрать или
   сократить упражнение уже после «закрытия». */

/* ---------- Таймер отдыха (Date.now() — без дрейфа) ----------
   meta ≠ null → это звено автоматической цепочки Myo-Reps:
   после сигнала приложение само отметит мини-серию и запустит
   следующий отсчёт — телефон трогать не нужно. */
const timer = { endsAt:0, total:0, int:null, hideT:null, meta:null };

function startRest(sec, label, meta){
  if(!sec || sec <= 0) return;
  timer.endsAt = Date.now() + sec * 1000;
  timer.total = sec * 1000;
  timer.meta = meta || null;
  $('#timerLabel').textContent = label || 'Отдых';
  $('#timerBar').hidden = false;
  $('#timerBar').classList.remove('is-done');
  clearInterval(timer.int); clearTimeout(timer.hideT);
  timer.int = setInterval(tickTimer, 200);
  tickTimer();
}
function timerEndFallback(){
  /* обычный конец отдыха: сигнал «пора к снаряду» */
  timer.meta = null;
  $('#timerLabel').textContent = 'Пора к снаряду';
  $('#timerBar').classList.add('is-done');
  playSlot('end');
  if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
  timer.hideT = setTimeout(hideTimer, 8000);
}
function tickTimer(){
  const remain = Math.max(0, timer.endsAt - Date.now());
  $('#timerTime').textContent = fmtTime(Math.ceil(remain / 1000));
  $('#timerFill').style.width = (timer.total ? remain / timer.total * 100 : 0) + '%';
  if(remain <= 0){
    clearInterval(timer.int); timer.int = null;
    if(timer.meta && timer.meta.mode === 'myo' && settings.myoAuto){
      advanceMyoChain(timer.meta);
      return;
    }
    timerEndFallback();
  }
}

/* ---------- Автоматическая цепочка Myo-Reps ----------
   Активация отмечена → отдых → звук старта → мини-серия (приложение
   отмечает её само) → снова отдых… Последнее звено звучит другим
   сигналом («упражнение закрыто») и включает длинный отдых.
   Ручные правки не ломают цепочку: на каждом шаге берём первую
   неотмеченную мини-серию. */
function advanceMyoChain(meta){
  const w = state.session;
  const ex = w && w.exercises.find(x => String(x.id) === String(meta.exId));
  if(!ex || !ex.myo || !ex.myo.minis.length){ timerEndFallback(); return; }
  const i = ex.myo.minis.findIndex(m => !m);
  if(i < 0){ timerEndFallback(); return; }
  ex.myo.minis[i] = true;
  persistWorkout();
  renderSession();
  ensureAudio();
  const last = i === ex.myo.minis.length - 1;
  if(last){
    playSlot('myoEnd');
    if(navigator.vibrate) navigator.vibrate([200, 100, 200]);
    const card = document.querySelector('#sessionArea .ex[data-ex="' + CSS.escape(String(ex.id)) + '"]');
    if(card && exerciseComplete(ex)) setFolded(card, true);
    startRest(settings.restLong, 'Упражнение выполнено');
  } else {
    playSlot('myoStart');
    if(navigator.vibrate) navigator.vibrate(100);
    startRest(settings.restMyo, 'Мини-серия ' + (i + 2) + ' из ' + ex.myo.minis.length,
      { mode:'myo', exId: String(ex.id) });
  }
}
function hideTimer(){
  clearInterval(timer.int); clearTimeout(timer.hideT);
  timer.int = null;
  $('#timerBar').hidden = true;
}

/* ============================================================
   ЗВУКИ И СИГНАЛЫ (WebAudio, всё синтезируется локально)
   Три слота: «конец отдыха», «старт мини-серии Myo»,
   «Myo-упражнение закрыто» — у каждого свой выбор из 10
   звуков + один импортированный пользователем (до 2 сек).
   Контекст создаётся и «прощёлкивается» по жесту пользователя
   (нажатие «подход выполнен») — иначе iOS/Safari держат его
   в suspended и сигнала в конце отдыха не будет.
   ============================================================ */
let audioCtx = null;
function ensureAudio(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    audioCtx = audioCtx || new AC();
    if(audioCtx.state === 'suspended') audioCtx.resume();
  }catch(e){}
}

/* Десять встроенных сигналов: seq — ноты { f: частота, f2: свип (опц.),
   dt: задержка от старта, dur: длительность, type: форма волны } */
const SOUND_DEFS = [
  { id:'classic', name:'Классика', seq:[
    { f:880, dt:0,    dur:.18, type:'sine' },
    { f:880, dt:.22,  dur:.18, type:'sine' } ] },
  { id:'triple', name:'Тройной', seq:[
    { f:990, dt:0,   dur:.11, type:'sine' },
    { f:990, dt:.15, dur:.11, type:'sine' },
    { f:990, dt:.3,  dur:.16, type:'sine' } ] },
  { id:'ping', name:'Высокий пинг', seq:[
    { f:1320, dt:0, dur:.55, type:'sine' } ] },
  { id:'gong', name:'Низкий гонг', seq:[
    { f:196, dt:0, dur:1, type:'triangle' },
    { f:392, dt:0, dur:.7, type:'sine', g:.35 } ] },
  { id:'chirp', name:'Чирик (вверх)', seq:[
    { f:520, f2:1450, dt:0, dur:.2, type:'sine' } ] },
  { id:'drop', name:'Спад (вниз)', seq:[
    { f:1150, f2:340, dt:0, dur:.3, type:'sine' } ] },
  { id:'trill', name:'Трель', seq:[
    { f:760, dt:0,   dur:.05, type:'square', g:.5 },
    { f:1020, dt:.07, dur:.05, type:'square', g:.5 },
    { f:760, dt:.14, dur:.05, type:'square', g:.5 },
    { f:1020, dt:.21, dur:.05, type:'square', g:.5 },
    { f:760, dt:.28, dur:.05, type:'square', g:.5 },
    { f:1020, dt:.35, dur:.08, type:'square', g:.5 } ] },
  { id:'xylo', name:'Ксилофон', seq:[
    { f:660, dt:0,  dur:.22, type:'triangle' },
    { f:990, dt:.14, dur:.3, type:'triangle' } ] },
  { id:'siren', name:'Сирена', seq:[
    { f:620, f2:1250, dt:0,  dur:.3, type:'sawtooth', g:.4 },
    { f:1250, f2:620, dt:.32, dur:.3, type:'sawtooth', g:.4 } ] },
  { id:'clock', name:'Тик-так', seq:[
    { f:1050, dt:0,  dur:.045, type:'square', g:.6 },
    { f:1050, dt:.3, dur:.045, type:'square', g:.6 } ] }
];
function soundById(id){
  return SOUND_DEFS.find(s => s.id === id) || SOUND_DEFS[0];
}
function soundVolume(){
  const v = clampInt(settings.sound && settings.sound.volume, 0, 100, 80);
  return Math.max(0, Math.min(1, v / 100));
}

/* Один тон с огибающей громкости и опциональным свипом частоты */
function playTone(t0, note, vol){
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = note.type || 'sine';
  o.frequency.setValueAtTime(note.f, t0 + note.dt);
  if(note.f2) o.frequency.exponentialRampToValueAtTime(note.f2, t0 + note.dt + note.dur);
  const peak = vol * (note.g !== undefined ? note.g : 1) * 0.28;
  g.gain.setValueAtTime(0.0001, t0 + note.dt);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + note.dt + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + note.dt + note.dur);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t0 + note.dt); o.stop(t0 + note.dt + note.dur + 0.05);
}

let customSoundBuf = null;
function playCustomBuffer(vol){
  /* декодированный буфер кэшируется: данные и так уже в памяти настроек */
  const data = settings.sound.custom && settings.sound.custom.data;
  if(!data) return Promise.resolve(false);
  if(customSoundBuf){
    const src = audioCtx.createBufferSource();
    const g = audioCtx.createGain();
    g.gain.value = vol;
    src.buffer = customSoundBuf; src.connect(g); g.connect(audioCtx.destination);
    src.start(); return Promise.resolve(true);
  }
  return fetch(data).then(r => r.arrayBuffer())
    .then(ab => new Promise((res, rej) => {
      const p = audioCtx.decodeAudioData(ab, res, rej);
      if(p && p.then) p.then(res, rej);
    }))
    .then(buf => {
      customSoundBuf = buf;
      const src = audioCtx.createBufferSource();
      const g = audioCtx.createGain();
      g.gain.value = vol;
      src.buffer = buf; src.connect(g); g.connect(audioCtx.destination);
      src.start(); return true;
    })
    .catch(() => false);
}

/* Проиграть конкретный звук по id (для прослушивания в настройках) */
function playSoundId(id){
  ensureAudio();
  if(!audioCtx) return;
  try{
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const vol = soundVolume();
    if(vol <= 0) return;
    if(id === 'custom'){ playCustomBuffer(vol); return; }
    soundById(id).seq.forEach(note => playTone(audioCtx.currentTime, note, vol));
  }catch(e){}
}

/* Слот: end — конец любого отдыха; myoStart — пора делать мини-серию;
   myoEnd — упражнение Myo закрыто, начинается длинный отдых */
function playSlot(slot){
  if(!settings.sound) settings.sound = { ...DEFAULTS.sound };
  playSoundId(settings.sound[slot] || 'classic');
}

/* Импорт своего звука: только до 2 секунд, хранится в настройках
   как dataURL и переживает перезагрузку (офлайн, без интернета) */
const CUSTOM_SOUND_MAX = 2.05; /* маленький допуск на округление кодеков */
async function importCustomSound(file){
  ensureAudio();
  if(!audioCtx){ toast('Браузер не поддерживает WebAudio — импорт недоступен'); return; }
  let ab, decoded;
  try{
    ab = await file.arrayBuffer();
    decoded = await new Promise((res, rej) => {
      const p = audioCtx.decodeAudioData(ab.slice(0), res, rej);
      if(p && p.then) p.then(res, rej);
    });
  }catch(e){
    toast('Не удалось прочитать аудио — попробуй mp3, m4a, wav или ogg');
    return;
  }
  if(decoded.duration > CUSTOM_SOUND_MAX){
    toast('Аудио длиннее 2 секунд (' + decoded.duration.toFixed(1) + ' с) — выбери короче');
    return;
  }
  const data = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result); fr.onerror = rej;
    fr.readAsDataURL(file);
  });
  customSoundBuf = decoded;
  settings.sound.custom = { data: data, name: String(file.name || 'sound').slice(0, 60) };
  saveSettings();
  fillSoundSelects();
  updateSoundCustomHint();
  toast('Свой звук добавлен — выбери его в списке и послушай ▶');
}
function removeCustomSound(){
  settings.sound.custom = null;
  customSoundBuf = null;
  if(settings.sound.end === 'custom') settings.sound.end = 'classic';
  if(settings.sound.myoStart === 'custom') settings.sound.myoStart = 'chirp';
  if(settings.sound.myoEnd === 'custom') settings.sound.myoEnd = 'gong';
  saveSettings();
  fillSoundSelects();
  updateSoundCustomHint();
  toast('Свой звук удалён');
}
function updateSoundCustomHint(){
  const el = $('#soundCustomHint');
  if(!el) return;
  el.textContent = settings.sound.custom
    ? 'Загружен: «' + settings.sound.custom.name + '» (до 2 с).'
    : 'Свой звук пока не загружен.';
  const del = $('#soundCustomDel');
  if(del) del.hidden = !settings.sound.custom;
}

/* ---------- Селекты выбора звука в настройках ---------- */
const SOUND_SLOTS = [
  { id:'end',      sel:'#soundEnd',      prev:'#soundEndPrev' },
  { id:'myoStart', sel:'#soundMyoStart', prev:'#soundMyoStartPrev' },
  { id:'myoEnd',   sel:'#soundMyoEnd',   prev:'#soundMyoEndPrev' }
];
function fillSoundSelects(){
  const customOpt = settings.sound.custom
    ? '<option value="custom">Свой звук (' + escapeHtml(settings.sound.custom.name) + ')</option>'
    : '';
  SOUND_SLOTS.forEach(s => {
    const sel = $(s.sel);
    if(!sel) return;
    const prev = settings.sound[s.id] || 'classic';
    sel.innerHTML = SOUND_DEFS.map(d =>
      '<option value="' + d.id + '"' + (d.id === prev ? ' selected' : '') + '>' + d.name + '</option>'
    ).join('') + customOpt;
    if(prev === 'custom' && settings.sound.custom) sel.value = 'custom';
  });
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
    const zone = zoneOf(key);
    const custom = !!(settings.volZones && settings.volZones[key]);
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
    return '<div class="vol-row vol-row-btn" data-zone="' + key + '" role="button" tabindex="0"' +
      (custom ? ' data-custom="1"' : '') + '>' +
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
  '<p class="hint vol-hint-tap">Тап по строке — своя цель по объёму: недобор/перебор пересчитаются сразу.' +
  (Object.keys(settings.volZones || {}).length ? ' Свои цели отмечены подчёркиванием.</p>' : '</p>') +
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
      (w.finished ? '<button class="h-del h-unfin" data-unfin="' + escapeHtml(w.id) + '">Вернуть тренировку (снять завершение)</button>' : '') +
      '</details>';
  }).join('');
}

async function onHistoryClick(e){
  const un = e.target.closest('[data-unfin]');
  if(un){
    const w = await dbGet(STORE_WORKOUTS, un.dataset.unfin);
    if(w && w.finished && confirm('Снять завершение с тренировки ' + w.date + '? Она снова откроется в текущей тренировке, если это последний день.')){
      w.finished = false;
      w.updatedAt = Date.now();
      await dbPut(STORE_WORKOUTS, w);
      renderHistory();
      toast('Тренировка снова открыта');
    }
    return;
  }
  const btn = e.target.closest('[data-del]');
  if(!btn) return;
  if(!confirm('Удалить эту тренировку из истории?')) return;
  await dbDelete(STORE_WORKOUTS, btn.dataset.del);
  renderHistory();
  toast('Запись удалена');
}

/* ---------- Экспорт / импорт (схема 3: программа и сохранённые снимки) ---------- */
async function exportData(){
  const workouts = await dbGetAll(STORE_WORKOUTS);
  const payload = {
    app:'AKM LEGENDS', schema:3,
    exportedAt:new Date().toISOString(),
    settings:settings, progress:progressData, program:program,
    savedPrograms:savedPrograms, workouts:workouts
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
    let added = 0, updated = 0, blocked = 0, progBlocked = 0, spAdded = 0;

    const list = Array.isArray(data) ? data
      : (Array.isArray(data.workouts) ? data.workouts : (data.workout ? [data.workout] : undefined));
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
      const progName = program.name;
      program = sanitizeProgram(data.program);
      if(!program.name) program.name = progName || 'Моя программа';
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

    /* Сохранённые программы: медицинский фильтр применяется к каждому снимку */
    if(!Array.isArray(data) && Array.isArray(data.savedPrograms)){
      for(const sp of data.savedPrograms){
        if(!sp || !sp.id || !sp.program) continue;
        const clean = {
          id:String(sp.id), name:String(sp.name || 'Без названия').slice(0, 60),
          ts:+sp.ts || Date.now(), program:sanitizeProgram(sp.program)
        };
        const i = savedPrograms.findIndex(x => x.id === clean.id);
        if(i >= 0) savedPrograms[i] = clean; else { savedPrograms.push(clean); spAdded++; }
      }
      saveSavedPrograms();
      if(spAdded) notes.push('сохранённых программ: ' + spAdded);
    }

    if(!Array.isArray(data)){
      if(data.settings){
        settings = { ...DEFAULTS, ...settings, ...data.settings,
          profile:{ ...settings.profile, ...((data.settings && data.settings.profile) || {}) },
          weightLog: Array.isArray(data.settings && data.settings.weightLog) ? data.settings.weightLog : settings.weightLog,
          volZones: (data.settings && data.settings.volZones && typeof data.settings.volZones === 'object')
            ? { ...settings.volZones, ...data.settings.volZones } : settings.volZones
        };
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
    if(spAdded) notes.push('сохранённых программ: ' + spAdded);
    /* Понятный счётчик импорта */
    let msg;
    if(added === 1 && updated === 0) msg = 'Тренировка успешно импортирована!';
    else if(added > 1) msg = 'Импортировано тренировок: ' + added;
    else if(added === 0 && updated === 0 && (Array.isArray(data) || data.workout || data.workouts))
      msg = 'Такая тренировка уже в истории — изменений нет';
    else msg = 'Импорт завершён — ' + notes.join(', ');
    toast(msg);
    if(state.currentTab === 'history'){ renderArchive(); }
    if(state.currentTab === 'volume') renderVolume();
    if(state.currentTab === 'settings'){ await collectHistoryExercises(); renderProfile(); }
  }catch(e){
    console.warn('import error:', e);
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
  if(name === 'history') renderArchive();
  if(name === 'settings'){
    collectHistoryExercises().then(renderProfile);
  }
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
  const sub = $('#programSub');
  if(sub) sub.textContent = 'Активная: ' + (program.name || 'Без названия') +
    ' · меняется в любой момент';
  syncImportantInfo();
  const clearBtn = $('#clearProgBtn');
  if(clearBtn) clearBtn.hidden = !program.days.length;
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

/* Полная очистка программы одним нажатием — для тех, кому достался
   старый шаблон или кто хочет начать заново. История не трогается. */
function clearProgram(){
  if(!program.days.length) return;
  if(!confirm('Удалить все дни программы «' + (program.name || 'Без названия') +
    '»? Прошедшие тренировки останутся в истории.')) return;
  program.days = [];
  state.selectedDayId = null;
  state.session = null;
  saveProgram();
  renderProgram();
  renderDayChips();
  updateScheduleHint();
  renderSession();
  toast('Программа очищена — собери свою с нуля');
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
const modal = { mode:null, dayId:null, exId:null, sets:3, minis:4, muscles:new Set(), baseId:null };

/* ---------- Живой поиск по базе упражнений (названия + теги-синонимы) ---------- */
function renderExSuggest(){
  const box = $('#fSuggest');
  if(!box) return;
  const q = normExName($('#fName').value);
  if(q.length < 2){ box.hidden = true; box.innerHTML = ''; return; }
  const hits = BASE_EX.filter(b => {
    const bn = normExName(b.name);
    return bn.includes(q) || b.tags.some(t => normExName(t).includes(q));
  }).slice(0, 6);
  if(!hits.length){ box.hidden = true; box.innerHTML = ''; return; }
  box.innerHTML = hits.map(b =>
    '<button class="f-sug" data-sug="' + escapeHtml(b.id) + '" type="button">' +
    '<span>' + escapeHtml(b.name) + '</span>' +
    '<span class="f-sug-meta">' + b.muscles.map(m => MUSCLES[m]).filter(Boolean).join(', ') + '</span></button>'
  ).join('');
  box.hidden = false;
}
function pickSuggest(id){
  const b = BASE_EX.find(x => x.id === id);
  if(!b) return;
  modal.baseId = b.id;
  $('#fName').value = b.name;
  modal.muscles = new Set(b.muscles);
  if(b.kind === 'compound') $('#fKind').value = 'compound';
  else if(b.kind === 'bodyweight'){ $('#fKind').value = 'isolation'; }
  renderModalMuscles();
  updateModalWarn();
  $('#fSuggest').hidden = true;
  $('#fSuggest').innerHTML = '';
  $('#fErr').hidden = true;
}

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
  modal.baseId = null;
  $('#fErr').hidden = true;
  $('#fWarn').hidden = true;
  $('#fMyo').checked = false;
  $('#fKind').value = 'isolation';
  $('#fWeight').value = '';
  $('#fReps').value = '';
  $('#fName').value = '';
  $('#fDesc').value = '';
  $('#fAddWrap').hidden = true;
  if($('#fSuggest')){ $('#fSuggest').hidden = true; $('#fSuggest').innerHTML = ''; }

  if(modal.mode === 'edit'){
    const d = programDay(modal.dayId);
    const ex = d && d.exercises.find(x => String(x.id) === String(modal.exId));
    if(!ex) return;
    $('#exModalTitle').textContent = 'Редактировать упражнение';
    $('#fName').value = ex.name;
    $('#fDesc').value = ex.desc || '';
    modal.baseId = ex.baseId || findBaseEx(ex.name)?.id || null;
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
  const matched = modal.baseId || findBaseEx(name);
  const ex = {
    id: modal.exId || uid('e'),
    baseId: matched ? (typeof matched === 'string' ? matched : matched.id) : '',
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
    return;
  }
  const sug = t.closest('.f-sug');
  if(sug){ pickSuggest(sug.dataset.sug); }
}

/* ============================================================
   ВАЖНАЯ ИНФОРМАЦИЯ — привязана к активной программе
   ============================================================ */
let impT = null;
function onImportantInput(){
  clearTimeout(impT);
  impT = setTimeout(() => {
    const v = $('#importantInfo').value.slice(0, 2000);
    if(program.important === v) return;
    program.important = v;
    saveProgram();
  }, 600);
}
function syncImportantInfo(){
  const ta = $('#importantInfo');
  if(ta && document.activeElement !== ta) ta.value = program.important || '';
}

/* ============================================================
   ЦЕЛИ ОБЪЁМА — кликабельные зоны с модалкой
   ============================================================ */
let zoneCtx = null;
function onVolumeClick(e){
  const row = e.target.closest('[data-zone]');
  if(row) openZoneModal(row.dataset.zone);
}
function openZoneModal(key){
  if(!MUSCLES[key]) return;
  zoneCtx = key;
  const z = zoneOf(key);
  const custom = !!(settings.volZones && settings.volZones[key]);
  $('#zoneMuscle').innerHTML = '<strong>' + MUSCLES[key] + '</strong> — текущая цель: ' +
    z[0] + '–' + z[1] + ' подходов в неделю' + (custom ? ' <em>(своя цель)</em>' : ' <em>(ориентир этапа)</em>') + '.';
  $('#zoneMin').value = z[0];
  $('#zoneMax').value = z[1];
  $('#zoneErr').hidden = true;
  $('#zoneReset').hidden = !custom;
  $('#zoneModal').hidden = false;
  document.body.classList.add('no-scroll');
}
function closeZoneModal(){
  zoneCtx = null;
  $('#zoneModal').hidden = true;
  document.body.classList.remove('no-scroll');
}
function saveZone(){
  const a = clampInt($('#zoneMin').value, 0, 50, -1);
  const b = clampInt($('#zoneMax').value, 1, 60, -1);
  const err = $('#zoneErr');
  if(a < 0 || b < 0 || a >= b){
    err.textContent = 'Нижняя граница должна быть меньше верхней (например 10 и 14).';
    err.hidden = false;
    return;
  }
  settings.volZones[zoneCtx] = [a, b];
  saveSettings();
  closeZoneModal();
  renderVolume();
  toast('Цель для «' + MUSCLES[zoneCtx] + '»: ' + a + '–' + b);
}
function resetZone(){
  if(zoneCtx){ delete settings.volZones[zoneCtx]; saveSettings(); }
  closeZoneModal();
  renderVolume();
  toast('Вернули ориентир этапа');
}

/* ============================================================
   ПРОФИЛЬ: редактируемые данные, вес тела, графики
   ============================================================ */
function bodyWeightOn(dateStr){
  const logs = (settings.weightLog || []).filter(l => l.d <= dateStr).sort((a, b) => a.d.localeCompare(b.d));
  if(logs.length) return +logs[logs.length - 1].w || +settings.profile.weight;
  return +settings.profile.weight || 80;
}
function renderProfile(){
  const p = settings.profile;
  $('#pfAge').value = p.age;
  $('#pfHeight').value = p.height;
  $('#pfWeight').value = p.weight;
  renderWeightLog();
  fillChartExSel();
  renderChartRel();
  renderChartEx();
}
function renderWeightLog(){
  const el = $('#wlogList');
  const logs = (settings.weightLog || []).slice().sort((a, b) => b.d.localeCompare(a.d));
  if(!logs.length){
    el.innerHTML = '<p class="hint">Записей пока нет — добавь первое взвешивание.</p>';
    return;
  }
  el.innerHTML = logs.map((l, i) =>
    '<div class="wlog-row"><span>' + new Date(l.d + 'T00:00').toLocaleDateString('ru-RU', { day:'numeric', month:'short', year:'2-digit' }) +
    '</span><strong>' + fmtNum(+l.w) + ' кг</strong>' +
    '<button class="ex-btn ex-btn-danger" data-wdel="' + i + '" aria-label="Удалить запись">×</button></div>'
  ).join('');
}
function addWeightLog(){
  const d = $('#wlogDate').value || todayStr();
  const w = +$('#wlogWeight').value;
  const err = !(w >= 30 && w <= 250);
  if(err){ toast('Вес: число от 30 до 250 кг'); return; }
  settings.weightLog = (settings.weightLog || []).filter(l => l.d !== d);
  settings.weightLog.push({ d: d, w: w });
  saveSettings();
  $('#wlogWeight').value = '';
  /* свежее взвешивание обновляет и «текущий вес» профиля */
  const logs = settings.weightLog.slice().sort((a, b) => a.d.localeCompare(b.d));
  settings.profile.weight = +logs[logs.length - 1].w || settings.profile.weight;
  saveSettings();
  renderProfile();
  toast('Вес записан: ' + fmtNum(w) + ' кг');
}
function onWeightListClick(e){
  const b = e.target.closest('[data-wdel]');
  if(!b) return;
  const logs = settings.weightLog.slice().sort((a, b) => b.d.localeCompare(a.d));
  logs.splice(+b.dataset.wdel, 1);
  settings.weightLog = logs;
  saveSettings();
  renderProfile();
}

/* ---------- SVG-графики (локально, без библиотек) ---------- */
function svgChart(points, fmtY){
  const W = 320, H = 130, padL = 34, padB = 22, padT = 10, padR = 10;
  if(!points || points.length < 2){
    return '<p class="hint">Нужно минимум две точки.</p>';
  }
  const ys = points.map(p => p.y);
  let ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
  if(ymax - ymin < 1e-9){ ymin -= 1; ymax += 1; }
  const span = ymax - ymin;
  ymin -= span * 0.1; ymax += span * 0.1;
  const X = i => padL + (W - padL - padR) * (i / (points.length - 1));
  const Y = v => padT + (H - padT - padB) * (1 - (v - ymin) / (ymax - ymin));
  const poly = points.map((p, i) => X(i).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ');
  const dots = points.map((p, i) =>
    '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="3" class="ch-dot"/>' +
    '<title>' + escapeHtml(p.x) + ': ' + (fmtY ? fmtY(p.y) : fmtNum(p.y)) + '</title>').join('');
  const grid = [ymin + (ymax - ymin) * 0.15, ymin + (ymax - ymin) * 0.5, ymin + (ymax - ymin) * 0.85].map(v =>
    '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" class="ch-grid"/>' +
    '<text x="' + (padL - 4) + '" y="' + (Y(v) + 3).toFixed(1) + '" class="ch-label">' + (fmtY ? fmtY(v) : fmtNum(v)) + '</text>').join('');
  const labels = points.length <= 8
    ? points.map((p, i) => '<text x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" class="ch-label" text-anchor="middle">' + escapeHtml(p.x.slice(5)) + '</text>').join('')
    : '<text x="' + padL + '" y="' + (H - 6) + '" class="ch-label">' + escapeHtml(points[0].x.slice(5)) + '</text>' +
      '<text x="' + (W - padR) + '" y="' + (H - 6) + '" class="ch-label" text-anchor="end">' + escapeHtml(points[points.length - 1].x.slice(5)) + '</text>';
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart" role="img">' + grid +
    '<polyline points="' + poly + '" class="ch-line"/>' + dots + labels + '</svg>';
}
function maxWeightOfDay(w){
  let m = 0;
  (w.exercises || []).forEach(ex => (ex.sets || []).forEach(s => {
    const v = +s.weight;
    if(v > m) m = v;
  }));
  return m;
}
async function renderChartRel(){
  const el = $('#chartRel');
  const all = (await dbGetAll(STORE_WORKOUTS)).filter(w => w.finished);
  all.sort((a, b) => a.date.localeCompare(b.date));
  const points = all.map(w => {
    const mw = maxWeightOfDay(w);
    const bw = bodyWeightOn(w.date);
    return { x: w.date, y: mw > 0 && bw > 0 ? mw / bw : 0 };
  }).filter(p => p.y > 0);
  el.innerHTML = points.length
    ? svgChart(points, v => (Math.round(v * 100) / 100).toFixed(2)) +
      '<p class="hint">Последняя точка: ' + fmtNum(Math.round(points[points.length - 1].y * 100) / 100) +
      ' — максимальный рабочий вес дня, делённый на вес тела в тот же день.</p>'
    : '<p class="hint">Заверши хотя бы одну тренировку с весами — появится график.</p>';
}
function fillChartExSel(){
  const sel = $('#chartExSel');
  const names = {};
  BASE_EX.forEach(b => { names[b.id] = b.name; });
  const opts = [];
  Object.keys(names).forEach(id => opts.push({ id: id, name: names[id] }));
  const seen = new Set(opts.map(o => o.id));
  (state.chartExtras || []).forEach(e => {
    if(!seen.has(e.id)){ seen.add(e.id); opts.push(e); }
  });
  const prev = sel.value;
  sel.innerHTML = '<option value="">— выбери упражнение —</option>' +
    opts.map(o => '<option value="' + escapeHtml(o.id) + '">' + escapeHtml(o.name) + '</option>').join('');
  if(prev && opts.some(o => o.id === prev)) sel.value = prev;
}
async function collectHistoryExercises(){
  const all = await dbGetAll(STORE_WORKOUTS);
  const byId = {};
  all.forEach(w => (w.exercises || []).forEach(ex => {
    if(ex && ex.id && ex.name) byId[ex.id] = { id: ex.id, name: ex.name };
  }));
  state.chartExtras = Object.keys(byId)
    .filter(id => !BASE_EX.some(b => b.id === id))
    .map(id => byId[id]);
}
async function renderChartEx(){
  const el = $('#chartEx');
  const id = $('#chartExSel').value;
  if(!id){ el.innerHTML = '<p class="hint">Выбери упражнение — покажу изменение рабочего веса.</p>'; return; }
  const all = (await dbGetAll(STORE_WORKOUTS)).filter(w =>
    (w.exercises || []).some(ex => String(ex.id) === String(id) || String(ex.baseId || '') === String(id)));
  all.sort((a, b) => a.date.localeCompare(b.date));
  const points = all.map(w => {
    let m = 0;
    w.exercises.forEach(ex => {
      if(String(ex.id) !== String(id) && String(ex.baseId || '') !== String(id)) return;
      (ex.sets || []).forEach(s => { const v = +s.weight; if(v > m) m = v; });
    });
    return { x: w.date, y: m };
  }).filter(p => p.y > 0);
  const name = ($('#chartExSel').selectedOptions[0] || {}).textContent || '';
  el.innerHTML = points.length
    ? '<p class="hint ch-name">' + escapeHtml(name) + '</p>' + svgChart(points, v => fmtNum(v)) +
      '<p class="hint">Максимальный рабочий вес по датам. ' + fmtNum(points[points.length - 1].y) +
      ' кг — последний результат.</p>'
    : '<p class="hint">По этому упражнению пока нет подходов с весом.</p>';
}

/* ============================================================
   УДЕРЖАНИЕ 2 СЕК — «Завершить» / «Вернуть»
   ============================================================ */
function attachHold(btn, ms, onDone){
  let t0 = 0, raf = 0, active = false;
  const fill = btn.querySelector('.hold-fill');
  function step(){
    if(!active) return;
    const p = Math.min(1, (Date.now() - t0) / ms);
    fill.style.width = (p * 100).toFixed(1) + '%';
    if(p >= 1){ cancelHold(); onDone(); return; }
    raf = requestAnimationFrame(step);
  }
  function start(e){
    if(active || btn.disabled) return;
    e.preventDefault();
    active = true; t0 = Date.now();
    btn.classList.add('is-holding');
    raf = requestAnimationFrame(step);
  }
  function cancelHold(){
    active = false;
    cancelAnimationFrame(raf);
    fill.style.width = '0%';
    btn.classList.remove('is-holding');
  }
  btn.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancelHold));
  btn.addEventListener('click', e => e.preventDefault());
  btn.addEventListener('contextmenu', e => e.preventDefault());
}
function updateFinishBtn(){
  const b = $('#finishBtn'), s = state.session;
  if(!b) return;
  b.hidden = !s;
  const label = b.querySelector('.hold-label');
  const sub = b.querySelector('.finish-sub');
  if(!s){ return; }
  if(s.finished){
    label.textContent = 'Вернуть тренировку';
    sub.textContent = 'удержи 2 секунды';
    b.classList.add('is-armed');
  } else {
    label.textContent = 'Завершить тренировку';
    sub.textContent = 'удержи 2 секунды';
    b.classList.remove('is-armed');
  }
}
function toggleFinish(){
  const w = state.session;
  if(!w) return;
  const b = $('#finishBtn');
  if(w.finished){
    w.finished = false;
    persistWorkout();
    toast('Тренировка снова открыта — можно дописать подходы');
  } else {
    w.finished = true;
    evaluateProgression(w);
    persistWorkout();
    toast('Тренировка завершена. Объём недели — во вкладке «Объём».');
    /* Короткая вспышка успеха — подтверждение удержания */
    b.classList.add('is-success');
    setTimeout(() => b.classList.remove('is-success'), 850);
  }
  $('#sessionArea').classList.toggle('is-finished', !!w.finished);
  updateFinishBtn();
}

/* ============================================================
   ШЕРИНГ ТРЕНИРОВКИ — только спортивные данные, без профиля
   ============================================================ */
async function shareWorkout(){
  const all = await dbGetAll(STORE_WORKOUTS);
  if(!all.length){ toast('Пока нет тренировок для отправки'); return; }
  all.sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt || 0) - (a.updatedAt || 0));
  const w = all[0];
  /* profile_id занулён: друг получает только упражнения и подходы */
  const payload = {
    app:'AKM LEGENDS', type:'workout-share', schema:1,
    profile_id:null,
    exportedAt:new Date().toISOString(),
    workout:w
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'akm-workout-' + w.date + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Файл тренировки готов — профиль в него не входит');
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
  $('#finishBtn'); /* удержание 2 с навешивается в init (attachHold) */
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
  $('#clearProgBtn').addEventListener('click', clearProgram);

  /* Модалка упражнения */
  $('#exModal').addEventListener('click', onModalClick);
  $('#fMyo').addEventListener('change', syncModalUi);
  $('#fSave').addEventListener('click', saveExModal);
  $('#fDelete').addEventListener('click', deleteFromModal);
  $('#fName').addEventListener('input', () => { $('#fErr').hidden = true; updateModalWarn(); renderExSuggest(); });
  $('#fReps').addEventListener('input', () => { $('#fErr').hidden = true; });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      if(!$('#exModal').hidden) closeExModal();
      if(!$('#nameModal').hidden) closeNameModal();
      if(!$('#switchModal').hidden) closeSwitchModal();
      if(!$('#zoneModal').hidden) closeZoneModal();
    }
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

  /* Архив: сохранённые программы */
  $('#saveProgBtn').addEventListener('click', () =>
    openNameModal('Сохранить программу как…', program.name || '', 'save-new'));
  $('#savedList').addEventListener('click', onSavedClick);
  $('#progNameSave').addEventListener('click', confirmNameModal);
  $('#progNameInput').addEventListener('keydown', e => { if(e.key === 'Enter') confirmNameModal(); });
  $('#nameModal').addEventListener('click', e => { if(e.target.closest('[data-close]')) closeNameModal(); });
  $('#swSave').addEventListener('click', () => doSwitch(true));
  $('#swPlain').addEventListener('click', () => doSwitch(false));
  $('#swCancel').addEventListener('click', closeSwitchModal);
  $('#switchModal').addEventListener('click', e => { if(e.target.closest('[data-close]')) closeSwitchModal(); });

  /* Таймер */
  $('#timerAdd').addEventListener('click', () => {
    if(timer.endsAt <= Date.now()){
      /* таймер уже сработал: +30 с перезапускает отсчёт заново
         (цепочка Myo не возобновляется — только обычный отдых) */
      clearTimeout(timer.hideT);
      timer.meta = null;
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

  /* Звуки и сигналы */
  $('#soundVol').value = settings.sound.volume;
  $('#soundVolVal').textContent = settings.sound.volume + '%';
  $('#soundVol').addEventListener('input', e => {
    settings.sound.volume = clampInt(e.target.value, 0, 100, 80);
    $('#soundVolVal').textContent = settings.sound.volume + '%';
    saveSettings();
  });
  fillSoundSelects();
  updateSoundCustomHint();
  SOUND_SLOTS.forEach(s => {
    $(s.sel).addEventListener('change', e => {
      settings.sound[s.id] = e.target.value;
      saveSettings();
      playSoundId(e.target.value); /* выбрал — сразу услышал */
    });
    $(s.prev).addEventListener('click', () => playSoundId($(s.sel).value));
  });
  $('#myoAutoToggle').checked = settings.myoAuto;
  $('#myoAutoToggle').addEventListener('change', e => {
    settings.myoAuto = !!e.target.checked;
    saveSettings();
    if(state.session) renderSession(); /* обновить подпись мини-серий */
  });
  $('#soundImportBtn').addEventListener('click', () => $('#soundImportInput').click());
  $('#soundImportInput').addEventListener('change', e => {
    if(e.target.files[0]) importCustomSound(e.target.files[0]);
    e.target.value = '';
  });
  $('#soundCustomDel').addEventListener('click', removeCustomSound);

  /* Объём: кликабельные цели */
  $('#volList').addEventListener('click', onVolumeClick);
  $('#zoneSave').addEventListener('click', saveZone);
  $('#zoneReset').addEventListener('click', resetZone);
  $('#zoneModal').addEventListener('click', e => { if(e.target.closest('[data-close]')) closeZoneModal(); });

  /* Важная информация программы */
  $('#importantInfo').addEventListener('input', onImportantInput);

  /* Профиль */
  $('#pfAge').addEventListener('change', e => { settings.profile.age = clampInt(e.target.value, 10, 90, 19); saveSettings(); });
  $('#pfHeight').addEventListener('change', e => { settings.profile.height = clampInt(e.target.value, 120, 230, 170); saveSettings(); });
  $('#pfWeight').addEventListener('change', e => {
    const w = +e.target.value;
    if(w >= 30 && w <= 250){ settings.profile.weight = w; saveSettings(); renderChartRel(); }
    else { e.target.value = settings.profile.weight; toast('Вес тела: от 30 до 250 кг'); }
  });
  $('#wlogAdd').addEventListener('click', addWeightLog);
  $('#wlogList').addEventListener('click', onWeightListClick);
  $('#chartExSel').addEventListener('change', renderChartEx);

  /* Шеринг тренировки без профиля */
  $('#shareWkBtn').addEventListener('click', shareWorkout);
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
  loadSavedPrograms();
  applyTheme();
  renderAccentGrid();
  bindEvents();
  bindAvatars();
  attachHold($('#finishBtn'), 2000, toggleFinish);
  collectHistoryExercises();
  syncImportantInfo();
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

  /* Загрузочный экран скрыт: минимум 900 мс видимости, затем плавное исчезновение */
  setTimeout(hideSplash, Math.max(0, 900 - (Date.now() - SPLASH_T0)));
}

function hideSplash(){
  const el = $('#splash');
  if(!el) return;
  el.classList.add('is-done');
  setTimeout(() => { if(el.parentNode) el.parentNode.removeChild(el); }, 600);
}

document.addEventListener('DOMContentLoaded', init);

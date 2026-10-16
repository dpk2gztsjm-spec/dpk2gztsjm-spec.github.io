/** GOLF JOURNAL club domain. All validation is performed before IndexedDB writes. */
export const CLUB_CATEGORIES = Object.freeze([
  {value:'driver', label:'ドライバー', short:'DR'},
  {value:'fairway', label:'フェアウェイウッド', short:'FW'},
  {value:'utility', label:'ユーティリティ', short:'UT'},
  {value:'iron', label:'アイアン', short:'IR'},
  {value:'wedge', label:'ウェッジ', short:'WG'},
  {value:'putter', label:'パター', short:'PT'}
]);
export const IRON_NUMBERS = Object.freeze(['3','4','5','6','7','8','9','PW','AW','GW','SW','LW']);
const WEDGE_NUMBERS = new Set(['AW','GW','SW','LW']);
export const categoryName = key => CLUB_CATEGORIES.find(v=>v.value===key)?.label ?? '未分類';
export const categoryShort = key => CLUB_CATEGORIES.find(v=>v.value===key)?.short ?? '—';
export function categoryForIronNumber(number) {return WEDGE_NUMBERS.has(number) ? 'wedge' : 'iron';}

export function cleanClub(input) {
  const year = String(input.releaseYear ?? '').trim();
  const loft = String(input.loftDeg ?? '').trim();
  return {
    category: String(input.category ?? ''),
    maker: String(input.maker ?? '').trim().slice(0,80),
    model: String(input.model ?? '').trim().slice(0,100),
    releaseYear: year === '' ? null : Number(year),
    number: String(input.number ?? '').trim().slice(0,24),
    loftDeg: loft === '' ? null : Number(loft),
    shaft: String(input.shaft ?? '').trim().slice(0,100),
    notes: String(input.notes ?? '').trim().slice(0,350)
  };
}
export function validateClub(c) {
  const e = {};
  if (!CLUB_CATEGORIES.some(x=>x.value===c.category)) e.category='クラブの種類を選択してください。';
  if (!c.maker) e.maker='メーカーを入力してください。';
  if (!c.model) e.model='モデル名を入力してください。';
  if (!c.number) e.number='番手・名称を入力してください。';
  if (c.releaseYear !== null && (!Number.isInteger(c.releaseYear) || c.releaseYear < 1900 || c.releaseYear > 2100)) e.releaseYear='発売年は1900〜2100年の整数で入力してください。';
  if (c.loftDeg !== null && (!Number.isFinite(c.loftDeg) || c.loftDeg < 0 || c.loftDeg > 90)) e.loftDeg='ロフト角は0〜90°で入力してください。';
  return e;
}
export function cleanIronSet(input, selectedNumbers=[]) {
  const base = cleanClub({...input, category:'iron', number:'SET'});
  const selected = [...new Set(selectedNumbers)].filter(n=>IRON_NUMBERS.includes(n));
  return {base, selected};
}
export function validateIronSet(base, selected) {
  const errors = validateClub(base);
  delete errors.category;
  delete errors.number;
  delete errors.loftDeg;
  if (!selected.length) errors.selected='登録する番手を1つ以上選択してください。';
  return errors;
}
export function buildIronSet(base, selected, loftByNumber={}, idFactory, now) {
  return selected.map(number=>({
    ...base,
    id:idFactory(),
    category:categoryForIronNumber(number),
    number,
    loftDeg:loftByNumber[number]===undefined || String(loftByNumber[number]).trim()==='' ? null : Number(loftByNumber[number]),
    createdAt:now,
    updatedAt:now,
    sourceType:'manual',
    registeredAsSet:true
  }));
}
export function matchClubs(clubs, query='', category='all') {
  const q=String(query).trim().toLocaleLowerCase('ja');
  return clubs.filter(c=>
    (category==='all' || c.category===category) &&
    (!q || [c.maker,c.model,c.number,c.shaft,c.releaseYear,c.loftDeg].join(' ').toLocaleLowerCase('ja').includes(q))
  );
}
/** User-entered clubs are physical objects, so identical maker/model/number is allowed. */
export function newClubId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    const b = new Uint8Array(16);globalThis.crypto.getRandomValues(b);
    b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
    const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  }
  throw new Error('安全なID生成が使用できません。HTTPSまたはlocalhostから開いてください。');
}

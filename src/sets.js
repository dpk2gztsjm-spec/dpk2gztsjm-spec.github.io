/** MySet domain logic. Memberships use physical club IDs, not names. */
import {CLUB_CATEGORIES} from './clubs.js';

export function cleanSet(input, ownedClubs=[]) {
  const owned = new Set(ownedClubs.map(c=>c.id));
  const requested = Array.isArray(input.clubIds) ? input.clubIds : [];
  return {
    name: String(input.name ?? '').trim().slice(0,60),
    clubIds: [...new Set(requested.filter(id=>typeof id==='string' && owned.has(id)))]
  };
}
export function validateSet(input) {
  const errors = {};
  if (!String(input.name ?? '').trim()) errors.name = 'セット名を入力してください。';
  if (String(input.name ?? '').trim().length > 60) errors.name = 'セット名は60文字以内にしてください。';
  if (!Array.isArray(input.clubIds) || new Set(input.clubIds).size!==input.clubIds.length) errors.clubIds='クラブの選択を確認してください。';
  return errors;
}
export function getSetClubs(set, ownedClubs=[]) {
  const byId = new Map(ownedClubs.map(c=>[c.id,c]));
  return (set?.clubIds ?? []).map(id=>byId.get(id)).filter(Boolean);
}
export function countMissingClubs(set, ownedClubs=[]) {
  const owned = new Set(ownedClubs.map(c=>c.id));
  return (set?.clubIds ?? []).filter(id=>!owned.has(id)).length;
}
export function clubGroups(clubs) {
  return CLUB_CATEGORIES.map(cat=>({category:cat, clubs:clubs.filter(c=>c.category===cat.value)})).filter(group=>group.clubs.length);
}
export function setClubCount(set) { return Array.isArray(set?.clubIds) ? new Set(set.clubIds).size : 0; }
export function isOverLimit(set) { return setClubCount(set)>14; }
export function newSetId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);
    return 'set-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }
  throw new Error('IDを生成できません。HTTPSまたはlocalhostから起動してください。');
}
export function copyName(name) { return `${String(name).slice(0,55)} のコピー`.slice(0,60); }

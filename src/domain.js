/** Domain rules are intentionally pure so they can be tested without a browser. */
export const GENDERS = Object.freeze([
  {value:'male', label:'男性'},
  {value:'female', label:'女性'},
  {value:'undisclosed', label:'回答しない'}
]);
export const HANDEDNESS = Object.freeze([
  {value:'right', label:'右打ち'},
  {value:'left', label:'左打ち'}
]);
export const ROUTES = Object.freeze(['home', 'courses', 'tips', 'strategy', 'records', 'clubs', 'sets', 'shots', 'profile', 'backup']);

export function normalizeRoute(hash) {
  const route = String(hash || '').replace(/^#\/?/, '').split(/[?&]/)[0];
  return ROUTES.includes(route) ? route : 'home';
}

export function escapeHtml(input) {
  return String(input ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}

export function cleanProfile(input) {
  const heightText = String(input.heightCm ?? '').trim();
  const handicapText = String(input.handicap ?? '').trim();
  return {
    id: 'me',
    gender: String(input.gender ?? ''),
    handedness: String(input.handedness ?? ''),
    heightCm: heightText === '' ? null : Number(heightText),
    handicap: handicapText === '' ? null : Number(handicapText),
    playNotes: String(input.playNotes ?? '').trim().slice(0, 280)
  };
}

export function validateProfile(profile) {
  const errors = {};
  if (!GENDERS.some(item => item.value === profile.gender)) errors.gender = '性別を選択してください。';
  if (!HANDEDNESS.some(item => item.value === profile.handedness)) errors.handedness = '右打ち・左打ちを選択してください。';
  if (profile.heightCm !== null && (!Number.isFinite(profile.heightCm) || profile.heightCm < 100 || profile.heightCm > 230)) errors.heightCm = '身長は100〜230cmの範囲で入力してください。';
  if (profile.handicap !== null && (!Number.isFinite(profile.handicap) || profile.handicap < -10 || profile.handicap > 54)) errors.handicap = 'ハンディキャップは-10〜54の範囲で入力してください。';
  if (profile.playNotes.length > 280) errors.playNotes = 'メモは280文字以内で入力してください。';
  return errors;
}

export function profileSummary(profile) {
  if (!profile) return null;
  return {
    gender: GENDERS.find(item => item.value === profile.gender)?.label ?? '未設定',
    handedness: HANDEDNESS.find(item => item.value === profile.handedness)?.label ?? '未設定',
    height: profile.heightCm === null ? '未登録' : `${profile.heightCm} cm`,
    handicap: profile.handicap === null ? '未登録' : String(profile.handicap)
  };
}

export function isProfileComplete(profile) {
  return !!profile && Object.keys(validateProfile(profile)).length === 0;
}

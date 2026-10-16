// Self-owned, minimal stroke-based SVG icons; no external icon license / network calls.
const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.8 5.2L8 16l2.8-5.2z"/>',
  book: '<path d="M12 7c-2.5-2-5.2-2-9-2v14c3.8 0 6.5 0 9 2 2.5-2 5.2-2 9-2V5c-3.8 0-6.5 0-9 2z"/><path d="M12 7v14"/>',
  pencil: '<path d="m4 20 4.5-1 11-11a2 2 0 0 0-3-3l-11 11z"/><path d="m14 7 3 3"/>',
  flag: '<path d="M5 21V3m0 1c6-3 8 4 15 1v11c-7 3-9-4-15-1"/>',
  bag: '<path d="M6 8h12l2 13H4z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/><path d="M9 13h6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  edit: '<path d="m4 20 4.5-1L20 7.5 16.5 4 5 15.5z"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 9v4m0 3v1"/>',
  shield: '<path d="M12 2 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  save: '<path d="M5 3h12l4 4v14H3V3z"/><path d="M7 3v7h10V3M7 21v-8h10v8"/>',
  trash: '<path d="M4 7h16M10 4h4m-8 3 1 14h10l1-14M10 11v6m4-6v6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>'
};
export function icon(name, size = 20) {
  return `<svg aria-hidden="true" class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.info}</svg>`;
}

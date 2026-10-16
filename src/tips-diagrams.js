/** Original lightweight instructional SVGs; entirely local, no image/license dependencies. */
import {escapeHtml} from './domain.js';
const TIP_INK='#273b32', TIP_MINT='#719888', TIP_SAND='#d5a578', TIP_SAGE='#c4d3c8', TIP_CANVAS='#f5f7f1';
const line=(x1,y1,x2,y2,stroke=TIP_MINT,width=3,dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const circle=(cx,cy,r,fill='#fff',stroke=TIP_INK,sw=2)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const txt=(x,y,t,size=11,color=TIP_INK,weight=650,anchor='middle')=>`<text x="${x}" y="${y}" font-family="system-ui,-apple-system,sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${escapeHtml(t)}</text>`;
const arrow=(x1,y1,x2,y2,c=TIP_MINT,width=3)=>{const a=Math.atan2(y2-y1,x2-x1),r=7;return line(x1,y1,x2,y2,c,width)+`<path d="M ${x2} ${y2} L ${x2-r*Math.cos(a-.57)} ${y2-r*Math.sin(a-.57)} L ${x2-r*Math.cos(a+.57)} ${y2-r*Math.sin(a+.57)} Z" fill="${c}"/>`;};
const club=(x,y,angle=0)=>`<g transform="translate(${x} ${y}) rotate(${angle})">${line(0,-80,0,12,TIP_INK,4)}<path d="M-3 7 Q-6 18 -27 18 Q-33 18 -31 9 Q-27 4 -3 7" fill="${TIP_INK}"/>${line(0,-80,0,-63,TIP_MINT,6)}</g>`;
const person=(x,y)=>`<g>${circle(x,y-75,14,'#ebd8c5',TIP_INK,1.5)}<path d="M${x} ${y-60} l-13 48 28 0 -15 -48 M${x-10} ${y-5} l-16 38 M${x+13} ${y-5} l16 38 M${x-8} ${y-52} l-38 32 M${x+8} ${y-52} l32 24" fill="none" stroke="${TIP_INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const iconBall=(x,y)=>circle(x,y,7,'#fff',TIP_INK,1.6);
const shapes={
 grip:()=>`<rect x="106" y="40" width="148" height="122" rx="60" fill="#e6c6a5" stroke="${TIP_INK}" stroke-width="3" transform="rotate(-14 180 100)"/><rect x="161" y="22" width="25" height="144" rx="12" fill="#d8b590" stroke="${TIP_INK}" stroke-width="2" transform="rotate(-14 180 100)"/>${club(184,113,0)}<path d="M110 106 Q146 74 180 102 T251 98" fill="none" stroke="${TIP_SAND}" stroke-width="15" stroke-linecap="round"/>${txt(68,58,'手の一体感')}${line(102,65,131,91,TIP_INK,1.5)}${txt(289,155,'軽く安定')}`,
 clubface:()=>`<rect x="148" y="72" width="72" height="75" rx="6" transform="rotate(-12 184 109)" fill="${TIP_INK}"/>${line(174,95,203,89,'#fff',2)}${line(168,105,200,99,'#fff',2)}${line(163,115,200,108,'#fff',2)}${arrow(176,185,176,139,TIP_SAND,3)}${txt(88,62,'フェース向き')}${arrow(99,68,151,94,TIP_MINT,2)}${txt(262,183,'目標方向 →')}`,
 address:()=>`${line(26,177,332,177,'#8eaa92',4)}${person(150,117)}${club(216,149,24)}${iconBall(247,168)}${txt(73,61,'股関節から前傾')}${arrow(94,67,136,91,TIP_MINT,2)}${txt(275,63,'腕は自然に')}${arrow(261,70,205,105,TIP_SAND,2)}`,
 balance:()=>`${line(28,173,334,173,'#9aaf9a',4)}<path d="M105 165 q40 -24 73 -4 q38 -22 78 4 l-6 11 h-140z" fill="${TIP_INK}"/>${arrow(182,81,182,156,TIP_SAND,4)}${txt(182,52,'足裏の圧力')}${txt(96,198,'かかと')}${txt(267,198,'つま先')}${line(94,188,258,188,TIP_SAGE,1.5)}`,
 'ball-position':()=>`${line(38,94,322,94,TIP_INK,2,'7 8')}<rect x="74" y="40" width="48" height="31" rx="8" fill="${TIP_SAGE}"/><rect x="234" y="40" width="48" height="31" rx="8" fill="${TIP_SAGE}"/>${iconBall(178,94)}${arrow(99,146,178,110,TIP_SAND,2)}${txt(96,163,'短いクラブ')}${arrow(260,145,215,110,TIP_MINT,2)}${txt(270,163,'長いクラブ')}${txt(178,26,'足と球の位置関係')}`,
 alignment:()=>`${line(35,52,326,52,TIP_SAND,3)}${line(35,149,326,149,TIP_INK,4)}${line(95,64,95,134,TIP_MINT,3)}${line(260,64,260,134,TIP_MINT,3)}${iconBall(164,103)}${arrow(164,103,310,103,TIP_MINT,3)}${txt(181,39,'身体の平行線')}${txt(182,182,'フェースと目標線を区別')}`,
 target:()=>`${iconBall(60,151)}${arrow(77,147,294,52,TIP_MINT,4)}${circle(306,44,13,'#d7e8d6',TIP_INK,2)}${txt(303,24,'目標')}${txt(76,182,'ボール')}${txt(203,128,'目標線')}`,
 swing:()=>`${line(37,172,323,172,'#aac4a5',3)}${person(174,108)}<path d="M102 93 Q175 -18 247 78" fill="none" stroke="${TIP_MINT}" stroke-width="5" stroke-dasharray="9 7"/>${club(110,65,-64)}${club(252,68,65)}${txt(92,35,'トップ')}${txt(270,35,'切り返し')}${txt(176,195,'回転と腕の連動')}`,
 'low-point':()=>`${line(23,156,337,156,'#9ab89d',3)}<path d="M55 38 Q177 250 306 41" fill="none" stroke="${TIP_INK}" stroke-width="4" stroke-dasharray="8 5"/>${circle(164,154,7,'#fff',TIP_INK,2)}${circle(202,152,5,TIP_SAND,TIP_SAND,1)}${arrow(202,132,202,147,TIP_SAND,2)}${txt(164,29,'球を先に捉える')}${txt(222,117,'最下点の例')}`,
 flight:()=>`${iconBall(56,151)}<path d="M65 149 Q178 104 300 150" fill="none" stroke="${TIP_MINT}" stroke-width="4"/><path d="M65 149 Q160 40 302 62" fill="none" stroke="${TIP_SAND}" stroke-width="4" stroke-dasharray="7 5"/>${line(57,154,310,154,TIP_INK,1,'5 6')}${txt(273,40,'曲がり')}${txt(274,184,'基準線')}${txt(71,182,'出球')}`,
 loft:()=>`${line(73,157,292,157,'#9bb098',3)}<path d="M141 153 l70 -12 10 9 -81 12z" fill="${TIP_INK}"/>${line(212,142,256,42,TIP_INK,5)}<path d="M190 111 Q213 108 222 119" fill="none" stroke="${TIP_SAND}" stroke-width="3"/>${txt(122,59,'ロフト')}${arrow(145,66,195,123,TIP_SAND,2)}${txt(273,122,'ソール')}${arrow(267,126,212,147,TIP_MINT,2)}`,
 bounce:()=>`${line(25,148,335,148,'#a4b9a5',3)}<path d="M83 131 l164 -18 -3 22 -169 15z" fill="${TIP_INK}"/>${line(244,112,270,40,TIP_INK,5)}${txt(126,79,'バウンス')}${arrow(132,87,188,123,TIP_SAND,2)}${txt(275,177,'地面')}`,
 'carry-roll':()=>`${iconBall(55,164)}<path d="M62 160 Q142 12 242 130" fill="none" stroke="${TIP_MINT}" stroke-width="4"/>${circle(242,130,5,TIP_SAND,TIP_SAND,1)}${line(242,130,320,130,TIP_SAND,5)}${arrow(285,130,320,130,TIP_SAND,5)}${txt(144,35,'キャリー')}${txt(279,112,'ラン')}${line(40,172,330,172,'#cbd8cb',2)}${txt(242,190,'着地点')}`,
 slope:()=>`<path d="M28 144 L331 64" stroke="${TIP_MINT}" stroke-width="6"/><path d="M28 144 L331 144" stroke="${TIP_SAGE}" stroke-width="2" stroke-dasharray="5 8"/>${iconBall(194,106)}${arrow(288,128,288,82,TIP_SAND,3)}${txt(114,75,'地面の勾配')}${txt(280,170,'高い側')}`,
 lie:()=>`<path d="M30 156 l25 -14 22 14 21 -24 18 24 20 -13 20 13 16 -29 24 29 17 -19 20 19 19 -15 23 15 22 -21 23 21v18H30z" fill="${TIP_SAGE}"/>${iconBall(154,131)}${txt(154,56,'球の沈み具合')}${arrow(154,63,154,119,TIP_SAND,3)}${txt(224,193,'芝の抵抗')}`,
 trajectory:()=>`${iconBall(54,151)}<path d="M61 149 Q155 -5 241 137" fill="none" stroke="${TIP_MINT}" stroke-width="5"/><path d="M61 149 Q170 75 294 141" fill="none" stroke="${TIP_SAND}" stroke-width="4" stroke-dasharray="7 7"/>${txt(153,34,'高い弾道')}${txt(256,113,'低い弾道')}${line(33,162,333,162,TIP_SAGE,2)}`,
 bunker:()=>`<path d="M28 118 Q95 201 170 161 T330 116 L330 192 L28 192Z" fill="#e5d4b3"/>${iconBall(187,128)}${arrow(130,63,162,117,TIP_SAND,3)}${txt(105,51,'砂への接触')}${txt(257,185,'砂の状態で調整')}`,
 putting:()=>`<rect x="20" y="29" width="320" height="159" rx="18" fill="#dcebdc"/>${circle(288,96,15,'#e6ebe2',TIP_INK,2)}${iconBall(66,143)}<path d="M75 141 Q177 122 277 97" fill="none" stroke="${TIP_MINT}" stroke-width="5" stroke-dasharray="9 8"/>${txt(135,58,'方向と距離感')}${txt(289,133,'カップ')}`,
 rules:()=>`<rect x="35" y="40" width="290" height="127" rx="14" fill="#fff" stroke="${TIP_SAGE}" stroke-width="2"/>${line(110,61,110,143,TIP_SAND,4)}${line(181,61,181,143,TIP_INK,4)}${line(251,61,251,143,TIP_MINT,4)}${txt(76,95,'OB')}${txt(148,95,'1罰')}${txt(217,95,'救済')}${txt(284,95,'確認')}${txt(180,182,'公式規則・競技条件')}`,
 safety:()=>`${person(96,122)}${person(268,122)}${arrow(131,65,224,65,TIP_SAND,3)}${txt(177,48,'安全な距離')}${line(43,173,323,173,TIP_SAGE,3)}`,
 pace:()=>`<rect x="42" y="49" width="94" height="91" rx="12" fill="${TIP_SAGE}"/><rect x="222" y="49" width="94" height="91" rx="12" fill="${TIP_SAGE}"/>${txt(89,90,'前組')}${txt(269,90,'自分の組')}${arrow(143,90,212,90,TIP_SAND,3)}${txt(181,73,'間隔')}${txt(181,159,'ギャップを意識')}`
};
export const TIP_DIAGRAM_TYPES=Object.freeze(Object.keys(shapes));
export function tipDiagram(type,handedness='right', size='large'){
 const pick=TIP_DIAGRAM_TYPES.includes(type)?type:'target';
 const direction=handedness==='left'?'左打ち':'右打ち';
 const label={grip:'グリップの保持',clubface:'フェースの方向',address:'アドレスの模式図',balance:'足裏の圧力',swing:'スイング軌道',flight:'ボールの曲がり',slope:'地面の傾斜',lie:'ライの状態',rules:'規則の確認',pace:'前組との間隔'}[pick]||'ゴルフの概念図';
 const small=size==='small';
 // Mirror geometric strokes for left-handed players, but keep every Japanese label
 // legible (mirror its x coordinate instead of horizontally flipping glyphs).
 const labels=[];
 const geometry=shapes[pick]().replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, node=>{
   if(handedness==='left')node=node.replace(/x="([0-9.]+)"/,(_,x)=>`x="${360-Number(x)}"`);
   labels.push(node);return '';
 });
 return `<svg xmlns="http://www.w3.org/2000/svg" class="tip-svg ${small?'tip-svg-small':''}" viewBox="0 0 360 208" role="img" aria-label="${escapeHtml(label)}：${escapeHtml(direction)}向けの概念図。寸法と軌道は模式的です。">
 <rect width="360" height="208" rx="16" fill="${TIP_CANVAS}"/><path d="M0 24 H360 M0 104 H360 M0 184 H360 M40 0 V208 M180 0 V208 M320 0 V208" fill="none" stroke="#e9eee7" stroke-width="1"/>
 <g ${handedness==='left'?'transform="translate(360 0) scale(-1 1)"':''}>${geometry}</g>${labels.join('')}
 <rect x="10" y="9" width="${small?79:96}" height="19" rx="9" fill="#fff" opacity=".9"/>${txt(small?49:58,22,small?'模式図':direction+' / 模式図',9,'#60766a',650)}
 </svg>`;
}

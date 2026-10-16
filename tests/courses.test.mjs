import test from 'node:test';
import assert from 'node:assert/strict';
import {PREFECTURES,emptyCourse,cleanCourse,validateCourse,reshapeHoles,searchCourses,teeTotals,parTotals,holeNumbers} from '../src/courses.js';

const sample=()=>{
  const d=emptyCourse();d.name='サンプルカントリークラブ';d.prefecture='茨城県';d.address='茨城県 ○○市';
  d.holes.forEach((h,i)=>h.par=i%3===0?3:i%3===1?4:5);
  d.tees[0].name='レギュラー';d.holes.forEach(h=>d.tees[0].distances[h.number]=330+h.number);
  return d;
};
test('47 prefectures including Japanese regions',()=>{assert.equal(PREFECTURES.length,47);assert.ok(PREFECTURES.includes('茨城県'));});
test('default is 18 holes, no fabricated PAR or yards',()=>{const d=emptyCourse();assert.equal(d.holes.length,18);assert.equal(d.tees.length,1);assert.equal(d.holes[0].par,null);assert.deepEqual(validateCourse(cleanCourse(d)).name,'ゴルフ場名を入力してください。');});
test('cleaned valid 18-hole course and exact PAR/tee yardage totals',()=>{
 const d=cleanCourse(sample());assert.deepEqual(validateCourse(d),{});assert.equal(parTotals(d).total,72);
 assert.equal(parTotals(d).first,36);assert.equal(parTotals(d).second,36);
 assert.equal(teeTotals(d,d.tees[0].id).total.yards,18*330+171);
});
test('unknown distances remain null and total is unknown (not silently partial)',()=>{
 const d=sample();delete d.tees[0].distances[3];d.tees[0].distances[4]='';
 const c=cleanCourse(d);const totals=teeTotals(c,c.tees[0].id);
 assert.equal(c.tees[0].distances[3],null);assert.equal(c.tees[0].distances[4],null);
 assert.equal(totals.total.yards,null);assert.equal(totals.total.known,16);
});
test('separate tees retain independent yardages and sums',()=>{
 const d=sample();const first=d.tees[0];d.tees.push({id:'back',name:'バック',distances:{1:430,2:520}});
 const c=cleanCourse(d);assert.deepEqual(validateCourse(c),{});assert.equal(teeTotals(c,'back').total.known,2);
 assert.equal(teeTotals(c,first.id).total.known,18);
 assert.equal(teeTotals(c,'back').total.yards,null);
});
test('9 holes from 10 to 18 preserve actual numbering and drop obsolete yards on cleaning',()=>{
 const d=sample();const shaped=reshapeHoles(d,9,10);
 assert.deepEqual(shaped.holes.map(h=>h.number),holeNumbers(9,10));
 shaped.holes.forEach(h=>h.par=4);const c=cleanCourse(shaped);
 assert.equal(c.holes[0].number,10);assert.equal(c.holes.length,9);assert.equal(c.tees[0].distances[1],undefined);
 assert.deepEqual(validateCourse(c),{});assert.equal(parTotals(c).total,36);
});
test('course layout changes preserve PAR for shared holes, default OUT for converted 9 holes',()=>{
 const d=sample();const c=reshapeHoles(d,9,1);assert.equal(c.holes[0].par,3);assert.equal(c.layout,'OUT');
 assert.equal(reshapeHoles(c,18,1).holes[0].par,3);
 assert.equal(reshapeHoles(c,18,1).holes[10].par,null);
});
test('invalid and blank PAR rejected individually; invalid yardage rejected',()=>{
 const d=sample();d.holes[0].par='';d.holes[1].par='7';d.tees[0].distances[1]='-1';
 const e=validateCourse(cleanCourse(d));assert.ok(e['par.1']);assert.ok(e['par.2']);assert.ok(e[`yard.${d.tees[0].id}.1`]);
});
test('URL validates scheme and duplicate/missing tee names',()=>{
 const d=sample();d.officialUrl='javascript:alert(1)';d.tees.push({id:'other',name:'レギュラー',distances:{}});
 const e=validateCourse(cleanCourse(d));assert.ok(e.officialUrl);assert.ok(e['tee.other']);
 d.officialUrl='https://example.jp/course';d.tees[1].name='バック';assert.deepEqual(validateCourse(cleanCourse(d)),{});
});
test('search matches normalized name/address/prefecture and filters only saved records',()=>{
 const one={...cleanCourse(sample()),id:'a',updatedAt:'2026-10-10T00:00:00Z'};
 const two={...one,id:'b',name:'東北コース',prefecture:'秋田県',address:'秋田県横手市',updatedAt:'2026-10-14T00:00:00Z'};
 assert.deepEqual(searchCourses([one,two],'ｻﾝﾌﾟﾙ').map(x=>x.id),['a']);
 assert.deepEqual(searchCourses([one,two],'横手').map(x=>x.id),['b']);
 assert.deepEqual(searchCourses([one,two],'','茨城県').map(x=>x.id),['a']);
 assert.deepEqual(searchCourses([one,two],'').map(x=>x.id),['b','a']);
});
test('malicious name kept as plain data, URL is restricted',()=>{
 const d=sample();d.name='<img src=x onerror=alert(1)>';
 assert.equal(cleanCourse(d).name,d.name);
 d.officialUrl='data:text/html;base64,AAAA';assert.ok(validateCourse(cleanCourse(d)).officialUrl);
});

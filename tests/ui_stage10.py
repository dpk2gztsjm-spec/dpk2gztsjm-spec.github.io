"""Stage 9 real Chromium DOM interaction. IndexedDB is mocked in this test.
See TEST_REPORT.md for separate actual IndexedDB browser test.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
sources=['src/domain.js','src/icons.js','src/clubs.js','src/clubs-ui.js','src/sets.js','src/sets-ui.js','src/shots.js','src/shots-ui.js','src/courses.js','src/courses-ui.js','src/course-images.js','src/rounds.js','src/rounds-ui.js','src/round-media.js','src/round-media-ui.js','src/tips-data.js','src/tips-diagrams.js','src/tips-ui.js','src/strategy.js','src/strategy-ui.js','src/strategy-engine.js','src/strategy-result-ui.js']
def stripped(src):return '\n'.join(line.removeprefix('export ') for line in src.splitlines() if not line.startswith('import '))
js='\n'.join(stripped((ROOT/x).read_text()) for x in sources)+'\n'+'''
const memory={profiles:new Map([['me',{id:'me',gender:'undisclosed',handedness:'right',heightCm:null,handicap:null,playNotes:''}]]),settings:new Map([['app',{id:'app',activeSetId:'s-bag',schemaVersion:1}]]),clubs:new Map(),clubSets:new Map([['s-bag',{id:'s-bag',name:'17本の練習バッグ',clubIds:Array.from({length:17},(_,i)=>'c'+i)}]]),shots:new Map(),courses:new Map(),photos:new Map(),rounds:new Map(),roundPlayers:new Map(),holeScores:new Map(),strategies:new Map()};
async function getProfile(){return structuredClone(memory.profiles.get('me'));}
async function ensureSettings(){return structuredClone(memory.settings.get('app'));}
async function saveProfile(p){memory.profiles.set('me',structuredClone(p));return p;}
async function getAllRecords(store){return [...memory[store].values()].map(x=>structuredClone(x));}
async function putRecord(store,r){memory[store].set(r.id,structuredClone(r));return r;}
async function putRecords(store,records){records.forEach(r=>memory[store].set(r.id,structuredClone(r)));return records;}
async function deleteRecord(store,id){memory[store].delete(id);}
async function activateClubSet(id){const s={...memory.settings.get('app'),activeSetId:id};memory.settings.set('app',s);return s;}
async function deleteClubSetSafely(id){memory.clubSets.delete(id);return null;}
async function deleteClubAndPruneSets(id){memory.clubs.delete(id);return 0;}
async function saveCourseAtomic(c){memory.courses.set(c.id,structuredClone(c));return c;}
async function deleteCourseSafely(id){memory.courses.delete(id);}
async function createRoundAtomic(r){return r;}
async function deleteRoundAtomic(id){memory.rounds.delete(id);}
async function addRoundPlayerAtomic(){return;}
async function deleteRoundPlayerAtomic(){return;}
async function saveRoundNotesAtomic(){return;}
async function addRoundPhotosAtomic(){return;}
async function deleteRoundPhotoAtomic(){return;}
async function reorderRoundPhotosAtomic(){return;}
'''+stripped((ROOT/'src/main.js').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
 page.set_default_timeout(12000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width, initial-scale=1"><div id="app"></div></html>')
 page.add_style_tag(content=(ROOT/'src/styles.css').read_text())
 page.add_script_tag(content=js)
 page.locator('.hero-card').wait_for()
 page.evaluate("""() => {
  const clubs=[
   {id:'c1',category:'wedge',maker:'Sample Golf',model:'WEDGE',number:'PW',loftDeg:45},
   {id:'c2',category:'iron',maker:'Sample Golf',model:'IRON',number:'9',loftDeg:40},
   {id:'c3',category:'wedge',maker:'Sample Golf',model:'WEDGE',number:'SW',loftDeg:56},
  ];
  const shots=[
   {id:'sp1',clubId:'c1',name:'PW 75%',type:'pitch',backswing:'75',distanceSource:'measured',carryYards:65,rollYards:5,stanceWidth:'自分の狭めスタンス',ballPosition:'中央',weightDistribution:'目標側を意識',faceDirection:'フェースをスクエア',bodyAlignment:'ピン左の安全側',keyPoints:'ゆっくり振る'},
   {id:'sp2',clubId:'c1',name:'PW chip',type:'chip',backswing:'50',distanceSource:'measured',carryYards:20,rollYards:50},
   {id:'sp3',clubId:'c2',name:'9I running',type:'running',backswing:'25',distanceSource:'measured',carryYards:30,rollYards:40},
   {id:'sp4',clubId:'c3',name:'SW pitch',type:'pitch',backswing:'75',distanceSource:'unmeasured',carryYards:null,rollYards:null}
  ];
  clubs.forEach(c=>memory.clubs.set(c.id,c));shots.forEach(s=>memory.shots.set(s.id,s));
  memory.clubSets.set('s-bag',{id:'s-bag',name:'練習セット',clubIds:['c1','c2','c3']});
  state.clubs=clubs;state.shots=shots;state.sets=[...memory.clubSets.values()];
  state.strategyDraft={...newStrategyDraft('s-bag'),targetYards:70,requiredCarryYards:15,ballSlope:{front:'down',side:'above'},targetSlope:{front:'away',side:'right'}};
  state.strategyView='review';state.strategyStatus='未保存';state.strategyDirty=false;state.strategyId='scenario-test-10';
  render();
 }""")
 page.locator('a[href="#strategy"].nav-link').click()
 page.locator('[data-strategy-action="result"]').click()
 page.locator('.sr10-primary').wait_for()
 assert page.locator('.sr10-candidate').count()==3
 assert page.locator('.sr10-primary').count()==1
 assert page.locator('.sr10-metrics strong').count()==3
 assert '70 yd' in page.locator('.sr10-metrics').first.inner_text()
 assert page.evaluate('recommendStrategy({scenario:state.strategyDraft,sets:state.sets,clubs:state.clubs,shots:state.shots}).candidates.some(x=>x.distance.carry===65)')
 assert '本人の実測値' in page.locator('.sr10-primary').inner_text()
 assert page.locator('.sr10-evidence').is_visible()
 assert '左足下がり' in page.locator('.sr10-situation').inner_text()
 assert '爪先上がり' in page.locator('.sr10-situation').inner_text()
 assert '奥下がり' in page.locator('.sr10-situation').inner_text()
 assert '右下がり' in page.locator('.sr10-situation').inner_text()
 assert page.locator('.sr10-diagram svg').count()==1
 assert page.locator('.sr10-address-visual svg').count()==1
 page.screenshot(path=str(ROOT/'assets/preview-strategy-result.png'),full_page=True)
 # First option rendered open, two other options are compact.
 assert page.locator('.sr10-details').count()==1
 page.locator('[data-strategy-result-action="expand"][data-index="1"]').click()
 assert page.locator('.sr10-details').count()==2
 assert page.locator('.sr10-candidate').nth(1).locator('svg').count()>=3
 page.screenshot(path=str(ROOT/'assets/preview-strategy-alternative.png'),full_page=True)
 page.locator('[data-strategy-result-action="expand"][data-index="1"]').click()
 assert page.locator('.sr10-details').count()==1
 # Diagram switch: top/front and left-handed views.
 page.locator('[data-strategy-result-action="view"][data-view="top"]').first.click()
 assert page.locator('.sr10-address-visual svg').first.get_attribute('aria-label').find('上空')!=-1
 page.evaluate("""() => {state.profile.handedness='left';state.tipHand=null;render()}""")
 assert '左打ち' in page.locator('.sr10-address-visual svg').first.get_attribute('aria-label')
 # Local, accessible Tips article deep link.
 page.locator('[data-strategy-tip]').first.click()
 page.locator('.tip-article-cover').wait_for()
 assert page.evaluate('state.route')=='tips'
 # Reopen scenario result and then edit without resetting wizard.
 page.locator('a[href="#strategy"].nav-link').click()
 page.locator('[data-strategy-action="review"]').click()
 assert page.locator('.strategy-review-section').count()==7
 # Mobile widths: whole page stays within viewport.
 page.evaluate("""() => {state.strategyView='result';render()}""")
 for width in (320,375,390,430):
  page.set_viewport_size({'width':width,'height':844})
  assert page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'),f'horizontal overflow at {width}'
 # No saved set -> honest empty-state.
 page.evaluate("""() => {state.strategyDraft={...state.strategyDraft,setId:null};render()}""")
 assert '確かな候補を表示できません' in page.locator('.sr10-empty').inner_text()
 assert not errors, errors
 browser.close()
 print('STAGE10 CHROMIUM UI PASS: primary+2 alternatives, measured carry+roll, slope context, SVG, expand/collapse, top/front left-hand, Tips deep link, edit review, 320-430px, empty state. Mock DB.')

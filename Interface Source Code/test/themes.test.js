const {test}=require('node:test');
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const {startServer}=require('../src/server');
test('broadcast theme persists, follows game switches, preserves school colors, and migrates existing Floyd saves',async t=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'floyd-theme-'));
 let service=await startServer({port:0,dataDir});
 t.after(async()=>{await new Promise(r=>service.server.close(r));fs.rmSync(dataDir,{recursive:true,force:true});});
 const post=async(route,body)=>{const r=await fetch(service.url+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 let saved=await fetch(service.url+'/api/state').then(r=>r.json());
 assert.equal(saved.match.theme,'default');
 saved=(await post('/api/scoreboard',{...saved.match,gameId:saved.gameId,theme:'floyd',p1PrimaryColor:'#145622',p1SecondaryColor:'#ffd123'})).data;
 const rejected=await post('/api/scoreboard',{...saved.match,gameId:saved.gameId,theme:'unknown'});
 assert.equal(rejected.status,400);
 let sf=(await post('/api/game',{gameId:'street-fighter-6'})).data;assert.equal(sf.match.theme,'floyd');
 await post('/api/scoreboard',{...sf.match,gameId:sf.gameId,theme:'default'});
 saved=(await post('/api/game',{gameId:'smash-ultimate'})).data;
 assert.equal(saved.match.theme,'default');assert.equal(saved.match.p1PrimaryColor,'#145622');assert.equal(saved.match.p1SecondaryColor,'#ffd123');
 for(const game of ['smash-ultimate','street-fighter-6'])for(const kind of ['scoreboard','versus']){
  const r=await fetch(service.url+'/layouts/'+game+'/'+kind);assert.equal(r.status,200);
  const html=await r.text();assert.match(html,/Resources\/Broadcast\/theme.css/);assert.match(html,/Resources\/Broadcast\/energy.js/);
 }
 await new Promise(r=>service.server.close(r));service=await startServer({port:0,dataDir});
 assert.equal((await fetch(service.url+'/api/state').then(r=>r.json())).match.theme,'default');
 await new Promise(r=>service.server.close(r));
 const file=path.join(dataDir,'state.json'),legacy=JSON.parse(fs.readFileSync(file));for(const match of Object.values(legacy.matches))delete match.theme;fs.writeFileSync(file,JSON.stringify(legacy));
 service=await startServer({port:0,dataDir});
 assert.equal((await fetch(service.url+'/api/state').then(r=>r.json())).match.theme,'floyd');
});

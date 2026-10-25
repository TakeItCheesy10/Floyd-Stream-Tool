const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { startServer, resolveBaseDir } = require('../src/server');
const { games } = require('../src/games');

test('publish, isolated game selection, validation, legacy output and restart persistence', async t => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floyd-stream-test-'));
    // A second profile exists only in tests, exercising the real switch without advertising an unfinished game.
    const profiles = [...games, { ...games[0], id: 'test-second-game', name: 'Test profile' }];
    let service = await startServer({ port: 0, dataDir, games: profiles });
    t.after(async () => { await new Promise(r => service.server.close(r)); fs.rmSync(dataDir, { recursive: true, force: true }); });
    const request = async (route, body, headers = {}) => {
        const response = await fetch(service.url + route, body === undefined ? { headers } : {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body)
        });
        return { status: response.status, body: await response.text() };
    };
    const getState = async () => JSON.parse((await request('/api/state')).body);
    let original = await getState();
    assert.equal(original.gameId, 'smash-ultimate');
    let saved = await request('/api/scoreboard', { ...original.match, gameId: original.gameId, p1Name: 'Floyd', p2Name: 'Opponent', p1NScore: '2', p2NScore: '1', bestOf: 'Bo5', p1Character: 'Mario' });
    assert.equal(saved.status, 200);
    assert.equal(JSON.parse(saved.body).match.p1Score, 2);
    assert.equal((await request('/Resources/Texts/Simple%20Texts/Score%201.txt')).body, '2');
    assert.equal(JSON.parse((await request('/Resources/Texts/ScoreboardInfo.json')).body).p1Name, 'Floyd');
    const beforeInvalid = (await getState()).timestamp;
    assert.equal((await request('/api/scoreboard', { ...original.match, gameId: original.gameId, p1NScore: '-1' })).status, 400);
    assert.equal((await request('/api/scoreboard', { ...original.match, gameId: original.gameId, p1Character: '../../bad' })).status, 400);
    assert.equal((await getState()).timestamp, beforeInvalid);
    assert.equal((await request('/api/game', { gameId: 'missing' })).status, 400);
    assert.equal((await request('/api/scoreboard', original.match)).status, 409);
    assert.equal((await request('/api/game', { gameId: 'test-second-game' })).status, 200);
    assert.equal((await getState()).match.p1Name, '');
    assert.equal((await request('/api/scoreboard', { ...original.match, gameId: 'smash-ultimate' })).status, 409);
    let second = await getState();
    await request('/api/scoreboard', { ...second.match, gameId: second.gameId, p1Name: 'Second game', p1NScore: '9' });
    await request('/api/game', { gameId: 'smash-ultimate' });
    assert.equal((await getState()).match.p1Name, 'Floyd');
    assert.equal((await getState()).match.p1NScore, '2');
    for (const kind of ['scoreboard', 'versus']) {
        assert.equal((await request('/overlay/' + kind)).status, 200);
        const layout = await request('/layouts/smash-ultimate/' + kind);
        assert.equal(layout.status, 200); assert.match(layout.body, /<base href="\/">/);
    }
    assert.equal((await request('/layouts/missing/scoreboard')).status, 404);
    assert.equal((await request('/overlay/casters')).status, 404);
    assert.equal((await request('/layouts/smash-ultimate/casters')).status, 404);
    assert.equal((await request('/Resources/Texts/Simple%20Texts/Caster%201%20Name.txt')).status, 404);
    assert.equal((await request('/api/json/Character%20Info/..%2F..%2F..%2Fpackage')).status, 404);
    assert.equal((await request('/api/json/InterfaceInfo')).status, 200);
    assert.equal((await request('/api/game', { gameId: 'smash-ultimate' }, { Origin: 'https://foreign.example' })).status, 403);
    const foreignHostStatus = await new Promise((resolve, reject) => {
        const req = http.get(service.url + '/api/state', { headers: { Host: 'foreign.example' } }, res => { res.resume(); resolve(res.statusCode); });
        req.on('error', reject);
    });
    assert.equal(foreignHostStatus, 403);
    assert.equal(service.server.address().address, '127.0.0.1');
    await request('/api/game', { gameId: 'test-second-game' });
    await new Promise(r => service.server.close(r));
    service = await startServer({ port: 0, dataDir, games: profiles });
    second = await getState();
    assert.equal(second.gameId, 'test-second-game');
    assert.equal(second.match.p1Name, 'Second game');
    assert.equal(second.match.p1NScore, '9');
    await request('/api/game', { gameId: 'smash-ultimate' });
    assert.equal((await getState()).match.p1Name, 'Floyd');
});

test('damaged saved state fails clearly rather than wiping matches', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floyd-corrupt-test-'));
    try {
        fs.writeFileSync(path.join(dataDir, 'state.json'), '{damaged');
        await assert.rejects(startServer({ port: 0, dataDir }), SyntaxError);
        assert.equal(fs.readFileSync(path.join(dataDir, 'state.json'), 'utf8'), '{damaged');
    } finally { fs.rmSync(dataDir, { recursive: true, force: true }); }
});

test('source resource directory resolves without Electron or executable-location assumptions', () => {
    assert.ok(fs.existsSync(path.join(resolveBaseDir(), 'Game Scoreboard.html')));
});

test('Street Fighter uses its own fighter roster, set wins and battle wins', async t => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floyd-sf6-test-'));
    const service = await startServer({ port: 0, dataDir });
    t.after(async () => { await new Promise(r => service.server.close(r)); fs.rmSync(dataDir, { recursive: true, force: true }); });
    const request = async (route, body) => {
        const res = await fetch(service.url + route, body ? { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) } : {});
        return { status:res.status, data:await res.json() };
    };
    const selected = await request('/api/game', { gameId:'street-fighter-6' });
    assert.equal(selected.data.match.bestOf, 'Bo5');
    assert.equal(selected.data.match.p1Color, 'Blue');
    assert.equal(selected.data.match.p1PrimaryColor, '#203cff');
    assert.equal(selected.data.match.p1SecondaryColor, '#ffffff');
    assert.equal(selected.data.match.p1VsColorStrength, 'bold');
    assert.equal(selected.data.match.p1ShowCharacterIcon, true);
    const match = { ...selected.data.match, gameId:'street-fighter-6', p1SecondaryColor:'#F4CE20', p2SecondaryColor:'#ffffff', p1VsColorStrength:'balanced', p2VsColorStrength:'subtle', p1PrimaryColor:'#125A30', p2PrimaryColor:'#e5ac00', p1ShowCharacterIcon:false, p2ShowCharacterIcon:true, p1Team:'Floyd Broncos', p2Team:'Away Team', p1Name:'Floyd Player', p2Name:'Opponent', p1Character:'Guile', p2Character:'Marisa', p1NScore:'1', p2NScore:'0', p1BattleScore:2, p2BattleScore:1, currentSet:2, currentBattle:3 };
    const saved = await request('/api/scoreboard', match);
    assert.equal(saved.status, 200);
    assert.equal(saved.data.match.p1PrimaryColor, '#125a30');
    assert.equal(saved.data.match.p2PrimaryColor, '#e5ac00');
    assert.equal(saved.data.match.p1SecondaryColor, '#f4ce20');
    assert.equal(saved.data.match.p1VsColorStrength, 'balanced');
    assert.equal(saved.data.match.p1ShowCharacterIcon, false);
    assert.equal(saved.data.match.p1BattleScore, 2);
    assert.equal(saved.data.match.p1Character, 'Guile');
    assert.equal(saved.data.match.currentSet, 2);
    for (const invalid of [{p1SecondaryColor:'red'}, {p2VsColorStrength:'intense'}, {p1PrimaryColor:'red'}, {p1PrimaryColor:'#12345z'}, {p2ShowCharacterIcon:'false'}, {p1Character:'Mario'}, {p1BattleScore:3}, {p1NScore:4}, {currentSet:6}, {currentBattle:4}]) assert.equal((await request('/api/scoreboard', { ...match, ...invalid })).status, 400);
    await request('/api/game', {gameId:'smash-ultimate'});
    const smash = await request('/api/state');
    assert.equal(smash.data.match.p1Name, '');
    const restored = await request('/api/game', {gameId:'street-fighter-6'});
    assert.equal(restored.data.match.p1Name, 'Floyd Player');
    assert.equal(restored.data.match.p1BattleScore, 2);
    assert.equal(restored.data.match.p1PrimaryColor, '#125a30');
    assert.equal(restored.data.match.p1SecondaryColor, '#f4ce20');
    assert.equal(restored.data.match.p1VsColorStrength, 'balanced');
    assert.equal(restored.data.match.p1ShowCharacterIcon, false);
    const fixedSmash = await request('/api/matches/smash-ultimate');
    assert.equal(fixedSmash.data.p1Name, '');
    assert.equal(fixedSmash.data.p1Character, 'Random');
    for (const kind of ['scoreboard','versus']) {
        const res = await fetch(service.url + '/layouts/street-fighter-6/' + kind);
        assert.equal(res.status, 200);
        const html = await res.text();
        assert.doesNotMatch(html, /Branding\/floyd-bronco\.png/);
        assert.doesNotMatch(html, /versari|caster/i);
    }
    const active = await request('/api/active-game');
    assert.deepEqual(Object.keys(active.data.layouts), ['scoreboard','versus']);
});

test('Smash two-level scores, costumes, stage and atomic selection reset survive restart', async t => {
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'floyd-smash-'));
 let service=await startServer({port:0,dataDir});
 t.after(async()=>{await new Promise(r=>service.server.close(r));fs.rmSync(dataDir,{recursive:true,force:true})});
 const post=async(route,body)=>{const r=await fetch(service.url+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}};
 const state=await fetch(service.url+'/api/state').then(r=>r.json());
 const match={...state.match,gameId:'smash-ultimate',p1Team:'Floyd',p2Team:'Away',p1Name:'Mr.Cheese',p2Name:'Guest',p1NScore:'2',p2NScore:'1',p1BattleScore:1,p2BattleScore:2,p1Character:'Sora',p2Character:'Steve',p1Skin:'8',p2Skin:'4',stage:'Small Battlefield',p1PrimaryColor:'#0022ff',p1SecondaryColor:'#ffffff'};
 const saved=await post('/api/scoreboard',match);assert.equal(saved.status,200);assert.equal(saved.data.match.p1Skin,'8');assert.equal(saved.data.match.p1BattleScore,1);
 assert.equal((await post('/api/scoreboard',{...match,p1BattleScore:3})).status,400);
 assert.equal((await post('/api/scoreboard',{...match,p1Skin:'99'})).status,400);
 const reset=await post('/api/reset-selections',{});assert.equal(reset.status,200);
 for(const key of Object.keys(saved.data.match)){if(['p1Character','p2Character','p1Skin','p2Skin','stage'].includes(key))continue;assert.deepEqual(reset.data.match[key],saved.data.match[key],key)}
 assert.equal(reset.data.match.p1Character,'Random');assert.equal(reset.data.match.p2Character,'Random');assert.equal(reset.data.match.stage,'Random');
 await new Promise(r=>service.server.close(r));service=await startServer({port:0,dataDir});
 const restored=await fetch(service.url+'/api/state').then(r=>r.json());assert.deepEqual(restored.match,reset.data.match);
 await post('/api/game',{gameId:'street-fighter-6'});assert.equal((await post('/api/reset-selections',{})).status,400);
});

test('Smash roster supplies costume choices and encoded image URLs are served', async t => {
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'floyd-art-'));
 const service=await startServer({port:0,dataDir});
 t.after(async()=>{await new Promise(r=>service.server.close(r));fs.rmSync(dataDir,{recursive:true,force:true})});
 const profiles=await fetch(service.url+'/api/games').then(r=>r.json());
 const roster=profiles.find(g=>g.id==='smash-ultimate').characters;
 for(const name of ['Daisy','Sora','Banjo & Kazooie']){
  const fighter=roster.find(c=>c.name===name);assert.deepEqual(fighter.skins,['1','2','3','4','5','6','7','8']);
  for(const [folder,ext] of [['Renders','webp'],['Stock Icons','png']]){
   const r=await fetch(service.url+'/Resources/Characters/'+encodeURIComponent(folder)+'/'+encodeURIComponent(name)+'/8.'+ext);
   assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^image\//);assert.ok((await r.arrayBuffer()).byteLength>100);
  }
 }
});

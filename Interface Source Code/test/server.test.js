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
    const match = { ...selected.data.match, gameId:'street-fighter-6', p1Team:'Floyd Broncos', p2Team:'Away Team', p1Name:'Floyd Player', p2Name:'Opponent', p1Character:'Guile', p2Character:'Marisa', p1NScore:'1', p2NScore:'0', p1BattleScore:2, p2BattleScore:1, currentSet:2, currentBattle:3 };
    const saved = await request('/api/scoreboard', match);
    assert.equal(saved.status, 200);
    assert.equal(saved.data.match.p1BattleScore, 2);
    assert.equal(saved.data.match.p1Character, 'Guile');
    assert.equal(saved.data.match.currentSet, 2);
    for (const invalid of [{p1Character:'Mario'}, {p1BattleScore:3}, {p1NScore:4}, {currentSet:6}, {currentBattle:4}]) assert.equal((await request('/api/scoreboard', { ...match, ...invalid })).status, 400);
    await request('/api/game', {gameId:'smash-ultimate'});
    const smash = await request('/api/state');
    assert.equal(smash.data.match.p1Name, '');
    const restored = await request('/api/game', {gameId:'street-fighter-6'});
    assert.equal(restored.data.match.p1Name, 'Floyd Player');
    assert.equal(restored.data.match.p1BattleScore, 2);
    const fixedSmash = await request('/api/matches/smash-ultimate');
    assert.equal(fixedSmash.data.p1Name, '');
    assert.equal(fixedSmash.data.p1Character, 'Random');
    for (const kind of ['scoreboard','versus']) {
        const res = await fetch(service.url + '/layouts/street-fighter-6/' + kind);
        assert.equal(res.status, 200);
        const html = await res.text();
        assert.match(html, /Branding\/floyd-esports\.png/);
        assert.doesNotMatch(html, /versari|caster/i);
    }
    const active = await request('/api/active-game');
    assert.deepEqual(Object.keys(active.data.layouts), ['scoreboard','versus']);
});

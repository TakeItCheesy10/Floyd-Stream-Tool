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
    for (const kind of ['scoreboard', 'versus', 'casters']) {
        assert.equal((await request('/overlay/' + kind)).status, 200);
        const layout = await request('/layouts/smash-ultimate/' + kind);
        assert.equal(layout.status, 200); assert.match(layout.body, /<base href="\/">/);
    }
    assert.equal((await request('/layouts/missing/scoreboard')).status, 404);
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

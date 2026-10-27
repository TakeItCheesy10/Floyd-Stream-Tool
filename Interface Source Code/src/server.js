const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { createStore } = require('./state');
const { games } = require('./games');
function resolveBaseDir() {
    if (process.env.FLOYD_RESOURCE_DIR) return path.resolve(process.env.FLOYD_RESOURCE_DIR);
    if (process.env.PORTABLE_EXECUTABLE_DIR) return process.env.PORTABLE_EXECUTABLE_DIR;
    if (process.versions.electron && require('electron').app.isPackaged) return path.join(process.resourcesPath, 'Stream Tool');
    return path.resolve(__dirname, '..', '..', 'Stream Tool');
}
function createApp(options = {}) {
    const app = express();
    const baseDir = options.baseDir || resolveBaseDir();
    const profiles = options.games || games;
    const textsDir = path.join(baseDir, 'Resources', 'Texts');
    const store = createStore({ dataDir: options.dataDir || process.env.FLOYD_DATA_DIR || path.join(baseDir, '.floyd-state'), textsDir, games: profiles });
    app.disable('x-powered-by');
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-store');
        const host = req.get('host') || '';
        if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return res.status(403).json({ error: 'Local access only' });
        const origin = req.get('origin');
        if (origin && origin !== `http://${host}`) return res.status(403).json({ error: 'Foreign origin rejected' });
        next();
    });
    app.use(express.json({ limit: '32kb', inflate: false }));
    const interfaceInfo = JSON.parse(fs.readFileSync(path.join(textsDir, 'InterfaceInfo.json'), 'utf8'));
    app.get('/api/games', (req, res) => res.json(profiles.map(({ id, name, characters }) => ({ id, name, characters: characters || interfaceInfo.charactersBase.map(name => ({ name, skins: name === 'Random' ? ['1'] : JSON.parse(fs.readFileSync(path.join(textsDir, 'Character Info', name + '.json'), 'utf8')).skinList.map(String), art: name === 'Random' ? '/Resources/Characters/Renders/Random.webp' : `/Resources/Characters/Renders/${name}/1.webp` })) }))));
    app.get('/api/active-game', (req, res) => {
        const { activeGame } = store.snapshot();
        res.json({ gameId: activeGame, name: profiles.find(g => g.id === activeGame).name,
            layouts: Object.fromEntries(['scoreboard', 'versus'].map(kind => [kind, `/layouts/${activeGame}/${kind}`])) });
    });
    app.get('/api/application', (req,res)=>res.json({version:options.updates?.version || require('../package.json').version,updatesSupported:Boolean(options.updates?.supported)}));
    app.post('/api/updates/check', async (req,res,next)=>{try{if(!options.updates?.supported)return res.status(409).json({error:'Updates are available in the installed app.'});res.json(await options.updates.check());}catch(error){next(error);}});
    app.get('/api/state', (req, res) => res.json(store.current()));
    app.get('/api/shortcuts', (req,res) => res.json(app.locals.shortcuts?.current() || {supported:false}));
    app.post('/api/shortcuts', (req,res) => {
        if (!app.locals.shortcuts) return res.status(409).json({error:'Custom shortcuts require the desktop app.'});
        res.json(app.locals.shortcuts.save(req.body));
    });
    app.get('/api/matches/:gameId', (req, res) => {
        if (!profiles.some(profile => profile.id === req.params.gameId)) return res.sendStatus(404);
        const match = store.snapshot().matches[req.params.gameId];
        if (!match) return res.sendStatus(404);
        res.json(match);
    });
    app.get('/api/last-update', (req, res) => res.json({ timestamp: store.snapshot().revision }));
    app.post('/api/game', (req, res) => res.json(store.select(req.body?.gameId)));
    app.post('/api/reset-selections', (req,res)=>res.json(store.resetSelections()));
    app.post('/api/scoreboard', (req, res) => res.json(store.publish(req.body)));
    app.get('/Resources/Texts/ScoreboardInfo.json', (req, res) => res.json(store.current().match));
    // Plain text OBS sources are served from saved state too; no tracked seed files are changed.
    const textFields = { 'Player 1': 'p1Name', 'Player 2': 'p2Name', 'Score 1': 'p1NScore', 'Score 2': 'p2NScore', Round: 'round', Format: 'format', 'Tournament Name': 'tournamentName' };
    app.get('/Resources/Texts/:directory/:file', (req, res, next) => {
        if (req.params.directory !== 'Simple Texts') return next();
        const key = textFields[req.params.file.replace(/\.txt$/, '')];
        if (!Object.hasOwn(textFields, req.params.file.replace(/\.txt$/, ''))) return res.sendStatus(404);
        res.type('text').send(store.current().match[key] ?? '');
    });
    app.get(/^\/api\/json\/(.*)/, (req, res) => {
        const name = req.params[0];
        if (name === 'ScoreboardInfo') return res.json(store.current().match);
        if (name !== 'InterfaceInfo' && !/^Character Info\/[\w &.-]+$/.test(name)) return res.sendStatus(404);
        const file = path.resolve(textsDir, `${name}.json`);
        if (!file.startsWith(path.resolve(textsDir) + path.sep) || !fs.existsSync(file)) return res.sendStatus(404);
        res.type('json').sendFile(file);
    });
    app.get('/overlay/:kind', (req, res) => {
        if (!['scoreboard', 'versus'].includes(req.params.kind)) return res.sendStatus(404);
        res.sendFile(path.join(__dirname, 'overlay.html'));
    });
    app.get('/layouts/:gameId/:kind', (req, res) => {
        const profile = profiles.find(g => g.id === req.params.gameId);
        const file = profile?.layouts[req.params.kind];
        if (!file || !Object.hasOwn(profile.layouts, req.params.kind)) return res.sendStatus(404);
        const html = fs.readFileSync(path.join(baseDir, file), 'utf8');
        res.type('html').send(html.replace(/<head>/i, '<head><base href="/">'));
    });
    app.use('/Resources', express.static(path.join(baseDir, 'Resources'), { etag: false }));
    app.use(express.static(__dirname, { etag: false }));
    app.use((err, req, res, next) => {
        if (!err.status || err.status >= 500) console.error(err);
        res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not save match. Check the data folder and try again.' });
    });
    app.locals.store = store;
    return app;
}
async function startServer(options = {}) {
    const app = createApp(options);
    const port = options.port ?? Number(process.env.PORT || 1111);
    return new Promise((resolve, reject) => {
        const server = app.listen(port, '127.0.0.1', () => {
            const url = `http://127.0.0.1:${server.address().port}`;
            console.log(`Floyd Stream Tool: ${url}`);
            resolve({ app, server, url });
        });
        server.on('error', reject);
    });
}
if (require.main === module) startServer().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { createApp, startServer, resolveBaseDir };

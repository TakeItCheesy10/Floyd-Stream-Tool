const $ = id => document.getElementById(id);
let profiles = [], info, live, dirty = false, busy = false, loading = false;
let revision = 0;
const controls = {};
const sf6 = () => live?.gameId === 'street-fighter-6';
function status(message, state = 'live') { $('publishStatus').textContent = message; $('publishStatus').dataset.state = state; }
function edited() { if (loading) return; dirty = true; revision++; status('Unpublished changes', 'pending'); }
async function api(route, body) {
    const response = await fetch(route, { cache: 'no-store', ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Connection unavailable');
    return data;
}
function node(tag, className, text) { const n = document.createElement(tag); if (className) n.className = className; if (text != null) n.textContent = text; return n; }
function field(label, id, options = {}) {
    const host = node('label', options.className, label);
    const input = document.createElement(options.options ? 'select' : 'input');
    input.id = id;
    if (options.options) input.replaceChildren(...options.options.map(([text, value]) => new Option(text, value)));
    else { input.type = options.type || 'text'; input.maxLength = 200; }
    if (options.min != null) input.min = options.min;
    if (options.max != null) input.max = options.max;
    host.append(input); controls[id] = input; return host;
}
function scoreField(p, suffix, label, sfOnly = false) {
    const host = node('div', 'score-control' + (sfOnly ? ' sf6-only' : ''));
    host.append(field(label, p + suffix, { type: 'number', min: 0, max: suffix === 'BattleScore' ? 2 : 999 }));
    const buttons = node('div');
    for (const [symbol, change] of [['−', -1], ['+', 1]]) { const button = node('button', '', symbol); button.type = 'button'; button.setAttribute('aria-label', `${p === 'p1' ? 'Home' : 'Away'} ${label.toLowerCase()} ${change > 0 ? 'increase' : 'decrease'}`); button.onclick = () => adjust(p + suffix, change); buttons.append(button); }
    host.append(buttons); return host;
}
function buildPlayers() {
    $('players').replaceChildren();
    for (const p of ['p1', 'p2']) {
        const side = p === 'p1' ? 'home' : 'away';
        const panel = node('article', 'player ' + side);
        const head = node('header', 'player-header'); head.append(node('strong', '', side.toUpperCase() + ' SIDE'), node('span', '', p === 'p1' ? 'PLAYER 1 · F1' : 'PLAYER 2 · F2'));
        const identity = node('div', 'identity-fields'); identity.append(field('School / team', p + 'Team'), field('Player / gamertag', p + 'Name'));
        const fighterControls = node('div', 'fighter-controls');
        const portrait = node('div', 'fighter-portrait'); const image = node('img'); image.id = p + 'Art'; image.alt = ''; image.hidden = true; portrait.append(image, node('span', '', '?'));
        const fighterFields = node('div', 'fighter-fields'); fighterFields.append(field('Character', p + 'Character', { options: [] }));
        const mini = node('div', 'mini-fields smash-only'); mini.append(field('Skin', p + 'Skin', { options: [['1', '1']] }), field('Color', p + 'Color', { options: Object.values(info.colorSlots).map(c => [c.name, c.name]) }));
        const extras = node('div', 'mini-fields smash-only'); extras.append(field('Pronouns', p + 'Pron'), field('Bracket side', p + 'WL', { options: [['None', 'Nada'], ['Winners', 'W'], ['Losers', 'L']] }));
        fighterFields.append(mini, extras); fighterControls.append(portrait, fighterFields);
        const scores = node('div', 'score-fields'); const series = scoreField(p, 'NScore', 'Set wins'); series.querySelector('label').firstChild.textContent = sf6() ? 'Team set wins' : 'Player score'; scores.append(series, scoreField(p, 'BattleScore', 'Battle wins', true));
        panel.append(head, identity, fighterControls, scores); $('players').append(panel);
        controls[p + 'Character'].onchange = async () => { await loadSkins(p, '1'); updateArt(p); };
        controls[p + 'Skin'].onchange = () => updateArt(p);
    }
}
async function loadSkins(p, selected) {
    const character = controls[p + 'Character'].value;
    let skins = ['1'];
    if (!sf6() && character && character !== 'Random') {
        try { skins = (await api('/api/json/Character%20Info/' + encodeURIComponent(character))).skinList.map(String); }
        catch { skins = ['1']; }
    }
    if (controls[p + 'Character'].value !== character) return;
    controls[p + 'Skin'].replaceChildren(...skins.map(s => new Option(s, s)));
    controls[p + 'Skin'].value = skins.includes(String(selected)) ? String(selected) : skins[0];
}
function updateArt(p) {
    const character = controls[p + 'Character'].value;
    const profile = profiles.find(g => g.id === live.gameId);
    const fighter = profile.characters.find(c => c.name === character);
    const image = $(p + 'Art'); image.hidden = !fighter || character === 'Random';
    image.onerror = () => { image.hidden = true; };
    if (fighter) { image.src = sf6() ? fighter.art : character === 'Random' ? fighter.art : `/Resources/Characters/Renders/${encodeURIComponent(character)}/${encodeURIComponent(controls[p + 'Skin'].value || '1')}.webp`; image.alt = character; }
}
async function paint(saved) {
    loading = true;
    try {
        live = saved; document.body.dataset.game = live.gameId; $('gameSelect').value = live.gameId;
        buildPlayers();
        const profile = profiles.find(g => g.id === live.gameId);
        for (const p of ['p1', 'p2']) {
            const options = profile.characters.filter(c => c.name !== 'Random').map(c => new Option(c.name, c.name));
            controls[p + 'Character'].replaceChildren(new Option(sf6() ? 'Select fighter' : 'Random', 'Random'), ...options);
        }
        for (const [key, input] of Object.entries(controls)) input.value = live.match[key] ?? (key.endsWith('BattleScore') ? '0' : '');
        for (const key of ['tournamentName', 'round', 'bestOf', 'format', 'currentSet', 'currentBattle']) $(key).value = live.match[key] ?? (key.startsWith('current') ? 1 : '');
        $('allowIntro').checked = Boolean(live.match.allowIntro);
        await Promise.all(['p1', 'p2'].map(async p => { await loadSkins(p, live.match[p + 'Skin']); updateArt(p); }));
        $('shortcutHint').textContent = sf6() ? 'F1 / F2: increase battle wins · Enter: publish' : 'F1 / F2: increase player score · Enter: publish';
        setLimits(); dirty = false; status('LIVE · All changes published');
    } finally { loading = false; }
}
function setLimits() {
    const max = $('bestOf').value === 'Bo5' ? 3 : 2;
    for (const p of ['p1', 'p2']) controls[p + 'NScore'].max = sf6() ? max : 999;
    $('currentSet').max = $('bestOf').value === 'Bo5' ? 5 : 3;
}
function draft() {
    const match = { ...live.match };
    for (const [key, input] of Object.entries(controls)) match[key] = input.value;
    for (const key of ['tournamentName', 'round', 'bestOf', 'format', 'currentSet', 'currentBattle']) match[key] = $(key).value;
    match.allowIntro = $('allowIntro').checked;
    return match;
}
function adjust(id, delta) {
    const input = controls[id]; if (!input || busy) return;
    input.value = Math.min(Number(input.max), Math.max(0, Number(input.value || 0) + delta)); edited();
}
async function publish() {
    if (!live || busy || loading) return;
    const invalid = [...document.querySelectorAll('input,select')].find(input => input.offsetParent && !input.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    busy = true; $('publish').disabled = true; $('gameSelect').disabled = true;
    const editedAt = revision; status('Publishing...', 'pending');
    try {
        live = await api('/api/scoreboard', { ...draft(), gameId: live.gameId });
        dirty = revision !== editedAt;
        status(dirty ? 'Unpublished changes' : 'LIVE · All changes published', dirty ? 'pending' : 'live');
    } catch (error) { status(error.message, 'error'); }
    finally { busy = false; $('publish').disabled = false; $('gameSelect').disabled = false; }
}
async function switchGame() {
    if (busy || loading) { $('gameSelect').value = live.gameId; return; }
    if (dirty) { $('gameSelect').value = live.gameId; status('Publish or discard edits before switching games', 'pending'); return; }
    busy = true; $('gameSelect').disabled = true;
    try { await paint(await api('/api/game', { gameId: $('gameSelect').value })); }
    catch (error) { $('gameSelect').value = live.gameId; status(error.message, 'error'); }
    finally { busy = false; $('gameSelect').disabled = false; }
}
async function refresh() {
    try {
        if (!busy && !loading && live) {
            const changed = await api('/api/last-update');
            if (changed.timestamp !== live.timestamp) {
                if (dirty) status('Live match changed. Discard edits to reload it.', 'pending');
                else await paint(await api('/api/state'));
            }
        }
    } catch { status('Disconnected · keep the desktop app running', 'error'); }
    setTimeout(refresh, 1000);
}
async function init() {
    [profiles, info] = await Promise.all([api('/api/games'), api('/api/json/InterfaceInfo')]);
    $('gameSelect').replaceChildren(...profiles.map(g => new Option(g.name, g.id)));
    await paint(await api('/api/state')); $('gameSelect').disabled = false;
    document.querySelector('.app').addEventListener('input', event => { if (event.target.matches('input,select') && event.target.id !== 'gameSelect') edited(); });
    $('bestOf').addEventListener('change', setLimits);
    $('gameSelect').onchange = switchGame; $('publish').onclick = publish;
    $('discard').onclick = async () => { if (busy) return; try { await paint(await api('/api/state')); } catch (error) { status(error.message, 'error'); } };
    $('swap').onclick = async () => {
        if (busy) return; const match = draft();
        for (const suffix of ['Name','Team','Pron','NScore','BattleScore','Character','Skin','Color','WL']) [match['p1' + suffix], match['p2' + suffix]] = [match['p2' + suffix], match['p1' + suffix]];
        const original = live; await paint({ ...live, match }); live = original; edited();
    };
    $('reset').onclick = async () => {
        if (busy) return; const match = draft();
        for (const p of ['p1','p2']) Object.assign(match, { [p+'Name']:'', [p+'Team']:'', [p+'Pron']:'', [p+'NScore']:'0', [p+'BattleScore']:0, [p+'Character']:'Random', [p+'Skin']:'1', [p+'WL']:'Nada' });
        Object.assign(match, { currentSet:1, currentBattle:1, round:'' });
        const original = live; await paint({ ...live, match }); live = original; edited();
    };
    $('copyObsUrl').onclick = async () => { try { await navigator.clipboard.writeText(location.origin + '/overlay/scoreboard'); status('OBS scoreboard URL copied'); } catch { status('OBS URL: ' + location.origin + '/overlay/scoreboard'); } };
    document.querySelectorAll('[data-preview]').forEach(button => { button.onclick = () => { $('previewPanel').hidden = false; $('previewTitle').textContent = button.textContent + ' · live'; $('previewFrame').src = '/overlay/' + button.dataset.preview; }; });
    $('closePreview').onclick = () => { $('previewPanel').hidden = true; $('previewFrame').removeAttribute('src'); };
    document.addEventListener('keydown', event => {
        if (event.key === 'F1' || event.key === 'F2') { event.preventDefault(); adjust((event.key === 'F1' ? 'p1' : 'p2') + (sf6() ? 'BattleScore' : 'NScore'), 1); }
        if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') { event.preventDefault(); publish(); }
    });
    refresh();
}
init().catch(error => status(error.message, 'error'));

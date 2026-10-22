const $ = id => document.getElementById(id);
let profiles = [], info, live, dirty = false, busy = false, loading = false;
let revision = 0, disconnected = false;
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
    for (const key of Object.keys(controls)) delete controls[key];
    for (const p of ['p1', 'p2']) {
        const side = p === 'p1' ? 'home' : 'away';
        const panel = node('article', 'player ' + side);
        const head = node('header', 'player-header'); head.append(node('strong', '', side.toUpperCase() + ' SIDE'), node('span', '', p === 'p1' ? 'PLAYER 1 · F1' : 'PLAYER 2 · F2'));
        const teamRow = node('div', 'competitor-row');
        const playerRow = node('div', 'competitor-row');
        const series = scoreField(p, 'NScore', 'Team set wins');
        teamRow.append(field('School / team', p + 'Team'), series);
        playerRow.append(field('Player / gamertag', p + 'Name'), scoreField(p, 'BattleScore', 'Player wins'));
        const fighterControls = node('div', 'fighter-controls');
        const portrait = node('div', 'fighter-portrait'); const image = node('img'); image.id = p + 'Art'; image.alt = ''; image.hidden = true; portrait.append(image, node('span', '', '?'));
        const fighterFields = node('div', 'fighter-fields'); fighterFields.append(field('Character', p + 'Character', { options: [] }));
        const mini = node('div', 'costume-picker smash-only');
        const skin = document.createElement('input'); skin.type = 'hidden'; skin.id = p + 'Skin'; skin.value = '1'; controls[p + 'Skin'] = skin;
        const icons = node('div', 'costume-icons'); icons.id = p + 'Costumes'; icons.setAttribute('role','group'); icons.setAttribute('aria-label',side + ' costume');
        mini.append(node('span','costume-label','Costume'),skin,icons);
        const branding = node('div', 'school-branding');
        const schoolColors = node('div', 'mini-fields');
        schoolColors.append(field('School primary color', p + 'PrimaryColor', { type: 'color' }), field('School secondary color', p + 'SecondaryColor', { type: 'color' }));
        branding.append(schoolColors);
        fighterFields.append(mini, branding); fighterControls.append(portrait, fighterFields);
        panel.append(head, teamRow, playerRow, fighterControls); $('players').append(panel);
        controls[p + 'Character'].onchange = async () => { await loadSkins(p, '1'); updateArt(p); };
    }
}
async function loadSkins(p, selected) {
    const character = controls[p + 'Character'].value;
    let skins = ['1'];
    if (!sf6() && character && character !== 'Random') {
        try { skins = profiles.find(g=>g.id===live.gameId)?.characters.find(c=>c.name===character)?.skins || (await api('/api/json/Character%20Info/' + encodeURIComponent(character))).skinList.map(String); }
        catch { status('Character assets unavailable · reconnecting', 'error'); return; }
    }
    if (controls[p + 'Character'].value !== character) return;
    controls[p + 'Skin'].value = skins.includes(String(selected)) ? String(selected) : skins[0];
    const host = $(p+'Costumes'); host.replaceChildren();
    if(sf6() || character==='Random') { host.append(node('small','','Select a fighter to choose a costume')); return; }
    for(const value of skins) {
        const button=node('button','costume-option');button.type='button';button.title='Costume '+value;button.setAttribute('aria-label',(p==='p1'?'Home':'Away')+' costume '+value);
        button.setAttribute('aria-pressed',String(value===controls[p+'Skin'].value));
        const icon=node('img');icon.src='/Resources/Characters/Stock%20Icons/'+encodeURIComponent(character)+'/'+encodeURIComponent(value)+'.png';icon.alt='';icon.dataset.asset=icon.src;icon.onerror=()=>{icon.dataset.failed='true';};button.append(icon);
        button.onclick=()=>{controls[p+'Skin'].value=value;host.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));updateArt(p);edited();};host.append(button);
    }
}
function updateArt(p) {
    const character = controls[p + 'Character'].value;
    const profile = profiles.find(g => g.id === live.gameId);
    const fighter = profile.characters.find(c => c.name === character);
    const image = $(p + 'Art'); image.hidden = !fighter || character === 'Random';
    image.onerror = () => { image.hidden = true; image.dataset.failed='true'; };
    image.onload = () => { image.dataset.failed=''; };
    if (fighter) { image.src = sf6() ? fighter.art : character === 'Random' ? fighter.art : `/Resources/Characters/Renders/${encodeURIComponent(character)}/${encodeURIComponent(controls[p + 'Skin'].value || '1')}.webp`; image.alt = character; if(!sf6() && character!=='Random')showSmashFighter(image,image.getAttribute('src')); }
}
async function paint(saved) {
    loading = true;
    try {
        live = saved; document.body.dataset.game = live.gameId; $('gameSelect').value = live.gameId;
        buildPlayers();
        const profile = profiles.find(g => g.id === live.gameId);
        for (const p of ['p1', 'p2']) {
            const options = profile.characters.filter(c => c.name !== 'Random').map(c => new Option(c.name, c.name));
            controls[p + 'Character'].replaceChildren(new Option('Select fighter (?)', 'Random'), ...options);
        }
        for (const [key, input] of Object.entries(controls)) {
            if (input.type === 'checkbox') input.checked = live.match[key] ?? true;
            else input.value = live.match[key] ?? (key.endsWith('SecondaryColor') ? '#ffffff' : key.endsWith('VsColorStrength') ? 'bold' : key.endsWith('PrimaryColor') ? (key.startsWith('p1') ? '#203cff' : '#ff3126') : key.endsWith('BattleScore') ? '0' : '');
        }
        for (const key of ['bestOf', 'format']) $(key).value = live.match[key] ?? (key.startsWith('current') ? 1 : '');
        $('allowIntro').checked = Boolean(live.match.allowIntro);
        $('stage').value=live.match.stage==='Random'?'':live.match.stage||'';
        await Promise.all(['p1', 'p2'].map(async p => { await loadSkins(p, live.match[p + 'Skin']); updateArt(p); }));
        $('shortcutHint').textContent = 'F1 / F2: increase player wins · Enter: publish';
        setLimits(); dirty = false; status('LIVE · All changes published');
    } finally { loading = false; }
}
function setLimits() {
    const max = $('bestOf').value === 'Bo5' ? 3 : 2;
    for (const p of ['p1', 'p2']) controls[p + 'NScore'].max = sf6() ? max : 999;

}
function draft() {
    const match = { ...live.match };
    for (const [key, input] of Object.entries(controls)) match[key] = input.type === 'checkbox' ? input.checked : input.value;
    for (const key of ['bestOf', 'format']) match[key] = $(key).value;
    match.allowIntro = $('allowIntro').checked;
    for(const p of ['p1','p2'])match[p+'VsColorStrength']='bold';
    if(!sf6())match.stage=$('stage').value||'Random';
    if (sf6()) {
        match.currentSet = Math.min(Number(match.currentSet || 1), match.bestOf === 'Bo5' ? 5 : 3);
        match.p1ShowCharacterIcon = match.p2ShowCharacterIcon = true;
    }
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
    busy = true; document.querySelectorAll('#publish,[data-publish]').forEach(button => button.disabled = true); $('gameSelect').disabled = true;
    const editedAt = revision; status('Publishing...', 'pending');
    try {
        live = await api('/api/scoreboard', { ...draft(), gameId: live.gameId });
        dirty = revision !== editedAt;
        status(dirty ? 'Unpublished changes' : 'LIVE · All changes published', dirty ? 'pending' : 'live');
    } catch (error) { status(error.message, 'error'); }
    finally { busy = false; document.querySelectorAll('#publish,[data-publish]').forEach(button => button.disabled = false); $('gameSelect').disabled = false; }
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
            if (disconnected) {
                status(dirty ? 'Unpublished changes' : 'LIVE · All changes published', dirty ? 'pending' : 'live');
                disconnected = false;
                const preview=$('previewFrame');
                if (!$('previewPanel').hidden && preview.getAttribute('src')) preview.src=preview.getAttribute('src');
                await Promise.all(['p1','p2'].map(async p=>{await loadSkins(p,controls[p+'Skin'].value);updateArt(p);}));
            }
            for(const p of ['p1','p2']) { const art=$(p+'Art'); if(art?.dataset.failed==='true'){art.dataset.failed='';updateArt(p);} }
            document.querySelectorAll('.costume-option img[data-failed="true"]').forEach(img=>{img.dataset.failed='';img.src=img.dataset.asset;});
            if (changed.timestamp !== live.timestamp) {
                if (dirty) status('Live match changed. Discard edits to reload it.', 'pending');
                else await paint(await api('/api/state'));
            }
        }
    } catch { disconnected = true; status('Disconnected · keep the desktop app running', 'error'); }
    setTimeout(refresh, 1000);
}
async function init() {
    [profiles, info] = await Promise.all([api('/api/games'), api('/api/json/InterfaceInfo')]);
    $('gameSelect').replaceChildren(...profiles.map(g => new Option(g.name, g.id)));
    await paint(await api('/api/state')); $('gameSelect').disabled = false;
    document.querySelector('.app').addEventListener('input', event => { if (event.target.matches('input,select') && event.target.id !== 'gameSelect') edited(); });
    $('bestOf').addEventListener('change', setLimits);
    $('gameSelect').onchange = switchGame; $('publish').onclick = publish; document.querySelectorAll('[data-publish]').forEach(button => button.onclick = publish);
    $('discard').onclick = async () => { if (busy) return; try { await paint(await api('/api/state')); } catch (error) { status(error.message, 'error'); } };
    $('swap').onclick = async () => {
        if (busy) return; const match = draft();
        for (const suffix of ['Name','Team','Pron','NScore','BattleScore','Character','Skin','Color','WL','PrimaryColor','SecondaryColor','VsColorStrength','ShowCharacterIcon']) [match['p1' + suffix], match['p2' + suffix]] = [match['p2' + suffix], match['p1' + suffix]];
        const original = live; await paint({ ...live, match }); live = original; edited();
    };
    $('reset').onclick = async () => {
        if (busy) return; const match = draft();
        for (const p of ['p1','p2']) Object.assign(match, { [p+'Name']:'', [p+'Team']:'', [p+'Pron']:'', [p+'NScore']:'0', [p+'BattleScore']:0, [p+'Character']:'Random', [p+'Skin']:'1', [p+'WL']:'Nada' });
        Object.assign(match, { currentSet:1, currentBattle:1, round:'', stage:'Random' });
        const original = live; await paint({ ...live, match }); live = original; edited();
    };
    $('resetSelections').onclick=async()=>{
      if(busy||loading||sf6())return;busy=true;
      try {const pending=draft(),hadEdits=dirty;const saved=await api('/api/reset-selections',{});
       Object.assign(pending,{p1Character:'Random',p2Character:'Random',p1Skin:'1',p2Skin:'1',stage:'Random'});
       await paint({...saved,match:hadEdits?pending:saved.match});live=saved;if(hadEdits)edited();else status('LIVE · Fighters and stage reset');
      }catch(e){status(e.message,'error')}finally{busy=false}
    };
    $('copySmashVsUrl').onclick=async()=>{const url=location.origin+'/overlay/versus?game=smash-ultimate';try{await navigator.clipboard.writeText(url);status('Smash VS URL copied')}catch{status(url)}};
    $('copySf6VsUrl').onclick = async () => { const url = location.origin + '/overlay/versus?game=street-fighter-6'; try { await navigator.clipboard.writeText(url); status('Street Fighter VS URL copied'); } catch { status('SF6 VS URL: ' + url); } };
    $('copyObsUrl').onclick = async () => { try { await navigator.clipboard.writeText(location.origin + '/overlay/scoreboard'); status('OBS scoreboard URL copied'); } catch { status('OBS URL: ' + location.origin + '/overlay/scoreboard'); } };
    document.querySelectorAll('[data-preview]').forEach(button => { button.onclick = () => { $('previewPanel').hidden = false; $('previewTitle').textContent = button.textContent + ' · live'; $('previewFrame').src = '/overlay/' + button.dataset.preview; }; });
    $('closePreview').onclick = () => { $('previewPanel').hidden = true; $('previewFrame').removeAttribute('src'); };
    document.addEventListener('keydown', event => {
        if (event.key === 'F1' || event.key === 'F2') { event.preventDefault(); adjust((event.key === 'F1' ? 'p1' : 'p2') + 'BattleScore', 1); }
        if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') { event.preventDefault(); publish(); }
    });
    try { const application=await api('/api/application'); $('checkUpdates').hidden=!application.updatesSupported; $('updateStatus').textContent='v'+application.version; } catch {}
    $('checkUpdates').onclick=async()=>{const button=$('checkUpdates');button.disabled=true;$('updateStatus').textContent='Checking for updates...';try{$('updateStatus').textContent=(await api('/api/updates/check',{})).message;}catch(error){$('updateStatus').textContent=error.message;}finally{button.disabled=false;}};
    refresh();
}
init().catch(error => status(error.message, 'error'));

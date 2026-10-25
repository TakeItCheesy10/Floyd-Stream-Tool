// Adapted from Versari's two-level SF6 scorebug. Local data only; no remote match feed.
const $ = id => document.getElementById(id);
let previous = '', characters, stages;
const stageKey = name => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const text = (id, value) => { if ($(id)) $(id).textContent = value; };
function pips(id, count, max) {
    const host = $(id); if (!host) return;
    host.replaceChildren(...Array.from({ length: max }, (_, index) => { const pip = document.createElement('i'); pip.className = index < count ? 'won' : ''; return pip; }));
}
async function refresh() {
    try {
        const response = await fetch('/api/state', { cache: 'no-store' });
        if (!response.ok) throw Error('Match connection unavailable');
        const saved = await response.json();
        if (saved.gameId !== 'smash-ultimate') { document.body.hidden = true; previous = ''; return; }
        document.body.hidden = false;
        const signature = JSON.stringify(saved.match);
        if (signature === previous) return;
        if (!characters) {
            const profiles = await fetch('/api/games', { cache: 'no-store' }).then(r => r.json());
            characters = profiles.find(g => g.id === 'smash-ultimate').characters;
        }
        if ($('stageImage') && !stages) stages = await fetch('/Resources/SmashUltimate/Stages/stages.json', {cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Stage images unavailable');return r.json();});
        const match = saved.match;
        document.body.dataset.theme = match.theme || 'floyd';
        const stage = stages?.find(s => stageKey(s.name) === stageKey(match.stage));
        text('stageName', stage?.name || 'Stage not selected');
        const stageImage = $('stageImage');
        if(stageImage) {
            stageImage.hidden = !stage;
            $('stageSymbol').hidden = Boolean(stage);
            if(stage) {
                const url='/Resources/SmashUltimate/Stages/'+stage.file;
                stageImage.alt=stage.name; stageImage.parentElement.title=stage.name;
                stageImage.onerror=()=>{stageImage.hidden=true;$('stageSymbol').hidden=false;stageImage.removeAttribute('src');previous='';};
                if(stageImage.getAttribute('src')!==url)stageImage.src=url;
            } else {stageImage.removeAttribute('src');stageImage.parentElement.title='Stage not selected';}
        }
        document.body.style.setProperty('--blue', match.p1PrimaryColor || '#203cff');
        document.body.style.setProperty('--red', match.p2PrimaryColor || '#ff3126');
        for (const p of ['p1', 'p2']) {
            document.body.style.setProperty('--' + p + '-primary', match[p + 'PrimaryColor'] || (p === 'p1' ? '#203cff' : '#ff3126'));
            document.body.style.setProperty('--' + p + '-secondary', match[p + 'SecondaryColor'] || '#ffffff');
            document.querySelectorAll('.fight-side.' + (p === 'p1' ? 'home' : 'away')).forEach(side => side.dataset.colorStrength = 'bold');
            document.body.style.setProperty('--' + p + '-presence', '.8');
        }
        document.dispatchEvent(new Event('school-colors-updated'));
        const max = match.bestOf === 'Bo3' ? 2 : 3;
        text('eventName', match.tournamentName || 'FLOYD ESPORTS');
        text('roundName', match.round || 'MATCH DAY');
        text('seriesLabel', match.bestOf === 'Bo3' ? 'BEST OF 3' : 'BEST OF 5');
        text('firstTo', max);
        text('matchPosition', `SET ${match.currentSet} · BATTLE ${match.currentBattle}`);
        for (const p of ['p1', 'p2']) {
            text(`${p}Team`, match[`${p}Team`] || (p === 'p1' ? 'HOME TEAM' : 'AWAY TEAM'));
            text(`${p}Name`, match[`${p}Name`] || (p === 'p1' ? 'PLAYER 1' : 'PLAYER 2'));
            text(`${p}Character`, match[`${p}Character`] === 'Random' ? 'SELECT FIGHTER' : match[`${p}Character`]);
            text(`${p}Score`, match[`${p}NScore`]);
            text(`${p}BattleScore`, match[`${p}BattleScore`]);
            pips(`${p}SetPips`, Number(match[`${p}NScore`]), max);
            pips(`${p}BattlePips`, Number(match[`${p}BattleScore`]), 2);
            const icon = $(`${p}Icon`);
            if (icon) {
                const fighter = match[p+'Character']==='Random'?null:characters.find(c=>c.name===match[p+'Character']);
                icon.hidden = !fighter; if($(p+'IconUnknown'))$(p+'IconUnknown').hidden=Boolean(fighter);
                icon.onerror = () => { icon.hidden = true; icon.removeAttribute('src'); previous=''; };
                if (fighter && icon.getAttribute('src') !== `/Resources/Characters/Stock%20Icons/${encodeURIComponent(fighter.name)}/${encodeURIComponent(match[p+'Skin']||'1')}.png`) { icon.src = `/Resources/Characters/Stock%20Icons/${encodeURIComponent(fighter.name)}/${encodeURIComponent(match[p+'Skin']||'1')}.png`; icon.alt = fighter.name; }
            }
            const art = $(`${p}Art`);
            if (art) {
                const fighter = match[p+'Character']==='Random'?null:characters.find(c=>c.name===match[p+'Character']);
                art.hidden = !fighter; if($(p+'Unknown'))$(p+'Unknown').hidden=Boolean(fighter);
                art.onerror = () => { art.removeAttribute('src'); art.dataset.source=''; previous=''; art.hidden = true; if($(p+'Unknown'))$(p+'Unknown').hidden=false; };
                if (fighter && art.dataset.source !== `/Resources/Characters/Renders/${encodeURIComponent(fighter.name)}/${encodeURIComponent(match[p+'Skin']||'1')}.webp`) { showSmashFighter(art, `/Resources/Characters/Renders/${encodeURIComponent(fighter.name)}/${encodeURIComponent(match[p+'Skin']||'1')}.webp`); art.alt = fighter.name; }
            }
        }
        previous = signature;
    } catch (error) { console.warn(error.message); }
    finally { setTimeout(refresh, 500); }
}
refresh();

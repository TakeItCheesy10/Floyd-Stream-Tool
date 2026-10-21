// Adapted from Versari's two-level SF6 scorebug. Local data only; no remote match feed.
const $ = id => document.getElementById(id);
let previous = '', characters;
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
        if (saved.gameId !== 'street-fighter-6') return;
        const signature = JSON.stringify(saved.match);
        if (signature === previous) return;
        if (!characters) {
            const profiles = await fetch('/api/games', { cache: 'no-store' }).then(r => r.json());
            characters = profiles.find(g => g.id === 'street-fighter-6').characters;
        }
        const match = saved.match;
        document.body.style.setProperty('--blue', match.p1PrimaryColor || '#203cff');
        document.body.style.setProperty('--red', match.p2PrimaryColor || '#ff3126');
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
                const fighter = characters.find(c => c.name === match[`${p}Character`]);
                icon.hidden = !fighter || match[`${p}ShowCharacterIcon`] === false;
                icon.onerror = () => { icon.hidden = true; };
                if (fighter && icon.getAttribute('src') !== fighter.art) { icon.src = fighter.art; icon.alt = fighter.name; }
            }
            const art = $(`${p}Art`);
            if (art) {
                const fighter = characters.find(c => c.name === match[`${p}Character`]);
                art.hidden = !fighter;
                art.onerror = () => { art.hidden = true; };
                if (fighter && art.getAttribute('src') !== fighter.art) { art.src = fighter.art; art.alt = fighter.name; }
            }
        }
        previous = signature;
    } catch (error) { console.warn(error.message); }
    finally { setTimeout(refresh, 500); }
}
refresh();

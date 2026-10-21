const fs = require('node:fs');
const path = require('node:path');
function invalid(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function atomicJson(file, data) {
    const temp = `${file}.tmp`;
    try { fs.writeFileSync(temp, JSON.stringify(data, null, 2)); fs.renameSync(temp, file); }
    finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function validateMatch(input, info) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) invalid('Match must be an object');
    const result = {};
    for (const key of ['p1Name', 'p2Name', 'p1Team', 'p2Team', 'p1Pron', 'p2Pron', 'round', 'tournamentName']) {
        const value = input[key] ?? '';
        if (typeof value !== 'string' || value.length > 200) invalid(`${key} must be text (up to 200 characters)`);
        result[key] = value;
    }
    for (const p of ['p1', 'p2']) {
        const score = input[`${p}NScore`] ?? '0';
        if (!/^\d{1,3}$/.test(String(score))) invalid('Scores must be whole numbers from 0 to 999');
        result[`${p}NScore`] = String(Number(score));
        result[`${p}Score`] = Number(score); // animated ticks and number now share a score
        const character = input[`${p}Character`] || 'Random';
        if (!info.charactersBase.includes(character)) invalid('Unknown Smash character');
        result[`${p}Character`] = character;
        const skin = input[`${p}Skin`] || '1';
        if (!/^[\w -]{1,40}$/.test(skin)) invalid('Invalid character skin');
        result[`${p}Skin`] = skin;
        const color = input[`${p}Color`] || (p === 'p1' ? 'Red' : 'Blue');
        if (!Object.values(info.colorSlots).some(c => c.name === color)) invalid('Unknown color');
        result[`${p}Color`] = color;
        const wl = input[`${p}WL`] || 'Nada';
        if (!['W', 'L', 'Nada'].includes(wl)) invalid('Invalid bracket side');
        result[`${p}WL`] = wl;
    }
    result.bestOf = input.bestOf || 'Bo3';
    if (!['Bo3', 'Bo5'].includes(result.bestOf)) invalid('Invalid series format');
    const format = input.format === '' || input.format == null ? '' : String(input.format);
    if (format && !/^\d{1,3}$/.test(format)) invalid('Format must be a whole number');
    result.format = format;
    if (input.allowIntro != null && typeof input.allowIntro !== 'boolean') invalid('Intro must be true or false');
    result.allowIntro = input.allowIntro ?? false;
    return result;
}
function validateStreetFighter(input, info) {
    const { characters } = require('./sf6-characters');
    const result = validateMatch(input, { ...info, charactersBase: ['Random', ...characters.map(c => c.name)] });
    const maxSets = result.bestOf === 'Bo5' ? 3 : 2;
    if (Number(result.p1NScore) > maxSets || Number(result.p2NScore) > maxSets) invalid(`Set wins cannot exceed ${maxSets}`);
    for (const p of ['p1', 'p2']) {
        const value = input[`${p}BattleScore`] ?? '0';
        if (!/^[0-2]$/.test(String(value))) invalid('Battle wins must be 0, 1, or 2');
        result[`${p}BattleScore`] = Number(value);
        result[`${p}Skin`] = '1';
        const primary = input[`${p}PrimaryColor`] ?? (p === 'p1' ? '#203cff' : '#ff3126');
        if (typeof primary !== 'string' || !/^#[0-9a-f]{6}$/i.test(primary)) invalid('School primary color must be a six-digit hex color');
        result[`${p}PrimaryColor`] = primary.toLowerCase();
        const showIcon = input[`${p}ShowCharacterIcon`] ?? true;
        if (typeof showIcon !== 'boolean') invalid('Show character icon must be true or false');
        result[`${p}ShowCharacterIcon`] = showIcon;
    }
    for (const [key, max] of [['currentSet', result.bestOf === 'Bo5' ? 5 : 3], ['currentBattle', 3]]) {
        const value = input[key] ?? 1;
        if (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > max) invalid(`${key} must be from 1 to ${max}`);
        result[key] = Number(value);
    }
    return result;
}
function createStore({ dataDir, textsDir, games }) {
    fs.mkdirSync(dataDir, { recursive: true });
    const file = path.join(dataDir, 'state.json');
    const info = JSON.parse(fs.readFileSync(path.join(textsDir, 'InterfaceInfo.json'), 'utf8'));
    const validate = (id, match) => {
        const profile = games.find(g => g.id === id);
        if (!profile) invalid('Unknown game');
        return profile.validate ? profile.validate(match, info) : validateMatch(match, info);
    };
    let state;
    if (fs.existsSync(file)) {
        // Do not silently replace a damaged saved match with a blank scoreboard.
        state = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (state.version !== 1 || !games.some(g => g.id === state.activeGame) || !state.matches || !Number.isSafeInteger(state.revision)) throw new Error('Invalid saved state. Restore state.json from backup.');
        for (const game of games) if (state.matches[game.id]) state.matches[game.id] = validate(game.id, state.matches[game.id]);
        if (!state.matches[state.activeGame]) throw new Error('Saved active match is missing.');
    } else {
        const seed = JSON.parse(fs.readFileSync(path.join(textsDir, 'ScoreboardInfo.json'), 'utf8'));
        seed.p1NScore ||= '0'; seed.p2NScore ||= '0';
        state = { version: 1, activeGame: games[0].id, revision: Date.now(), matches: { [games[0].id]: validate(games[0].id, seed) } };
        atomicJson(file, state);
    }
    const current = () => ({ gameId: state.activeGame, match: structuredClone(state.matches[state.activeGame]), timestamp: state.revision });
    const commit = next => {
        next.revision = Math.max(Date.now(), state.revision + 1);
        atomicJson(file, next); // match and live game commit together
        state = next;
        return current();
    };
    return {
        snapshot: () => structuredClone(state), current,
        select(id) {
            if (!games.some(g => g.id === id)) invalid('Unknown game');
            if (id === state.activeGame) return current();
            const next = structuredClone(state);
            next.activeGame = id;
            next.matches[id] ||= validate(id, games.find(g => g.id === id).defaults || {});
            return commit(next);
        },
        publish(input) {
            if (!input || input.gameId !== state.activeGame) invalid('The live game changed. Reload before publishing.', 409);
            const next = structuredClone(state);
            next.matches[state.activeGame] = validate(state.activeGame, input);
            return commit(next);
        }
    };
}
module.exports = { createStore, validateMatch, validateStreetFighter };

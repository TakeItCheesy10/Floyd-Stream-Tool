const fs = require('node:fs');
const path = require('node:path');
const actions = ['p1NScoreUp','p1NScoreDown','p2NScoreUp','p2NScoreDown','p1BattleScoreUp','p1BattleScoreDown','p2BattleScoreUp','p2BattleScoreDown'];
function createShortcuts({ globalShortcut, dataDir, perform, log = () => {} }) {
    const file = path.join(dataDir, 'shortcuts.json');
    let bindings = Object.fromEntries(actions.map(id => [id, ''])), warning = '';
    const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
    function validate(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Invalid shortcut settings');
        const result = {}, used = new Set();
        for (const id of actions) {
            const value = input[id] ?? '';
            if (typeof value !== 'string' || value.length > 80) fail('Invalid shortcut');
            const parts = value.trim().split('+').map(p => p.trim());
            const key = parts.pop();
            if (value.trim() && (!/^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Up|Down|Left|Right|Space|PageUp|PageDown|Home|End|Insert|Delete|num[0-9])$/i.test(key) || parts.some(p => !/^(Control|Ctrl|Alt|Shift)$/i.test(p)))) fail('Use a key such as Ctrl+Alt+1 or F13');
            const mods = [...new Set(parts.map(p => /^ctrl$|^control$/i.test(p) ? 'Control' : /^alt$/i.test(p) ? 'Alt' : 'Shift'))].sort();
            if (value.trim() && !mods.length && !/^F\d+$/i.test(key)) fail('Add Ctrl, Alt, or Shift, or use a function key');
            const normalized = value.trim() ? [...mods, key.length === 1 || /^f\d+$/i.test(key) ? key.toUpperCase() : key].join('+') : '';
            if (normalized && used.has(normalized.toLowerCase())) fail('Each action needs a different shortcut');
            used.add(normalized.toLowerCase()); result[id] = normalized;
        }
        return result;
    }
    function register(next) {
        for (const [id, key] of Object.entries(next)) if (key) {
            if (!globalShortcut.register(key, () => { try { perform(id); } catch (error) { log('Shortcut failed: ' + error.message); } })) fail(key + ' is unavailable. Choose another shortcut.');
        }
    }
    function save(input) {
        const next = validate(input), previous = bindings;
        globalShortcut.unregisterAll();
        try {
            register(next);
            fs.mkdirSync(dataDir, { recursive: true });
            fs.writeFileSync(file + '.tmp', JSON.stringify(next, null, 2));
            fs.renameSync(file + '.tmp', file);
            bindings = next; warning = '';
        } catch (error) {
            globalShortcut.unregisterAll();
            try { register(previous); } catch (restoreError) { warning = restoreError.message; }
            throw Object.assign(error, { status: 400 });
        }
        return current();
    }
    function current() { return { supported: true, bindings: { ...bindings }, warning }; }
    try { if (fs.existsSync(file)) { bindings = validate(JSON.parse(fs.readFileSync(file, 'utf8'))); register(bindings); } }
    catch (error) { globalShortcut.unregisterAll(); warning = 'Shortcuts inactive: ' + error.message; log(warning); }
    return { current, save, close: () => globalShortcut.unregisterAll() };
}
module.exports = { createShortcuts, actions };

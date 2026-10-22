const path = require('node:path');
const fs = require('node:fs');
function prepareUserData({ userDataDir, legacyDataDir }) {
    fs.mkdirSync(userDataDir, { recursive: true });
    const destination = path.join(userDataDir, 'state.json');
    const legacy = path.join(legacyDataDir, 'state.json');
    if (!fs.existsSync(destination) && fs.existsSync(legacy)) {
        const content = fs.readFileSync(legacy, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed.version !== 1 || !parsed.matches) throw Error('The previous saved match is damaged. Restore it before migrating.');
        fs.writeFileSync(destination, content, { flag: 'wx' });
    }
    return userDataDir;
}
module.exports = { prepareUserData };

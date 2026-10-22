const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');

function fixture() {
    const updater = new EventEmitter();
    const choices = [];
    let downloads = 0, installs = 0;
    updater.checkForUpdates = async () => ({ isUpdateAvailable: true, updateInfo: { version: '2.0.1' } });
    updater.downloadUpdate = async () => { downloads++; updater.emit('update-downloaded'); };
    updater.quitAndInstall = () => { installs++; };
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/updates.js'), 'utf8'), {
        module, require: name => { assert.equal(name, 'electron-updater'); return { autoUpdater: updater }; }
    });
    const updates = module.exports.createUpdates({
        app: { isPackaged: true, getVersion: () => '2.0.0' }, parent: () => null, log: () => {},
        dialog: { showMessageBox: async () => ({ response: choices.shift() ?? 1 }) }
    });
    return { updater, updates, choices, counts: () => ({ downloads, installs }) };
}

test('updates download only on request and wait for an explicit restart', async () => {
    const f = fixture();
    assert.equal(f.updater.autoDownload, false);
    assert.equal(f.updater.autoInstallOnAppQuit, false);
    f.choices.push(0, 1); // Download now; restart later.
    await f.updates.check();
    assert.equal(f.counts().downloads, 1);
    assert.equal(f.counts().installs, 0);
    f.choices.push(0); // Explicitly restart on the next check.
    await f.updates.check();
    assert.equal(f.counts().installs, 1);
    assert.equal(f.counts().downloads, 1);
});

test('declining an update leaves the running version alone', async () => {
    const f = fixture();
    f.choices.push(1);
    await f.updates.check();
    assert.equal(f.counts().downloads, 0);
    assert.equal(f.counts().installs, 0);
    f.updater.checkForUpdates = async () => { throw Error('Network unavailable'); };
    await assert.rejects(f.updates.check(), /internet connection/);
});

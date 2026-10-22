const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createShortcuts}=require('../src/shortcuts');
const {mergeLiveDraft}=require('../src/merge-live-draft');
const {createStore}=require('../src/state');
const {games}=require('../src/games');
const {resolveBaseDir}=require('../src/server');
test('saved global keys trigger live scores, reject conflicts and restore previous bindings',t=>{
    const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'floyd-keys-'));
    t.after(()=>fs.rmSync(dataDir,{recursive:true,force:true}));
    const keys=new Map();let pressed='';
    const globalShortcut={register(key,fn){if(key==='Control+Alt+9')return false;keys.set(key,fn);return true;},unregisterAll(){keys.clear();}};
    const options={globalShortcut,dataDir,perform:id=>pressed=id};
    let manager=createShortcuts(options);
    manager.save({p1NScoreUp:'Ctrl+Alt+1'});
    keys.get('Alt+Control+1')();assert.equal(pressed,'p1NScoreUp');
    assert.throws(()=>manager.save({p1NScoreUp:'Ctrl+Alt+1',p2NScoreUp:'Alt+Control+1'}),/different/);

    // Use a registration failure independent of modifier canonical ordering.
    globalShortcut.register=(key,fn)=>{if(key.endsWith('+9'))return false;keys.set(key,fn);return true;};
    assert.throws(()=>manager.save({p1NScoreUp:'Ctrl+Alt+9'}),/unavailable/);
    assert.ok(keys.has('Alt+Control+1'));
    manager.close();manager=createShortcuts(options);assert.ok(keys.has('Alt+Control+1'));
    manager.save({});assert.equal(keys.size,0);
});
test('score shortcuts clamp scores, preserve identity and persist across games and restart',t=>{
    const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'floyd-score-'));
    t.after(()=>fs.rmSync(dataDir,{recursive:true,force:true}));
    const options={dataDir,textsDir:path.join(resolveBaseDir(),'Resources','Texts'),games};
    let store=createStore(options);store.select('street-fighter-6');
    store.publish({...store.current().match,gameId:'street-fighter-6',p1Name:'Cheesy',p1Team:'Floyd',p1Character:'Ryu',bestOf:'Bo3',p1NScore:'0'});
    store.adjustScore('p1NScoreDown');for(let i=0;i<4;i++)store.adjustScore('p1NScoreUp');
    assert.equal(store.current().match.p1NScore,'2');assert.equal(store.current().match.p1Score,2);
    for(let i=0;i<4;i++)store.adjustScore('p2BattleScoreUp');assert.equal(store.current().match.p2BattleScore,2);
    assert.equal(store.current().match.p1Name,'Cheesy');assert.equal(store.current().match.p1Character,'Ryu');
    store.select('smash-ultimate');store.adjustScore('p1BattleScoreUp');store.select('street-fighter-6');
    store=createStore(options);assert.equal(store.current().match.p1NScore,'2');
    assert.throws(()=>store.adjustScore('delete'),/Unknown/);
});
test('remote score updates merge with unfinished names without publishing them',()=>{
    const old={p1Name:'Cheesy',p1NScore:'0',p1BattleScore:0};
    const pending={...old,p1Name:'New player'};
    assert.deepEqual(mergeLiveDraft(pending,old,{...old,p1NScore:'1'}),{...pending,p1NScore:'1'});
});

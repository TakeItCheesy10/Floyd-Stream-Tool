const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {prepareUserData}=require('../src/user-data');
test('installed updates retain user data and migrate a legacy save only once',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'floyd-install-data-'));
 try {
  const legacyDataDir=path.join(root,'legacy'),userDataDir=path.join(root,'user');fs.mkdirSync(legacyDataDir);
  fs.writeFileSync(path.join(legacyDataDir,'state.json'),JSON.stringify({version:1,matches:{smash:{p1Name:'Floyd'}}}));
  prepareUserData({userDataDir,legacyDataDir});
  assert.equal(JSON.parse(fs.readFileSync(path.join(userDataDir,'state.json'))).matches.smash.p1Name,'Floyd');
  const existing=JSON.stringify({version:1,matches:{smash:{p1Name:'Saved after update'}}});fs.writeFileSync(path.join(userDataDir,'state.json'),existing);
  prepareUserData({userDataDir,legacyDataDir});assert.equal(fs.readFileSync(path.join(userDataDir,'state.json'),'utf8'),existing);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('development preview does not attempt installed-app updates',async()=>{
 const updates=require('../src/updates').createUpdates({app:{isPackaged:false,getVersion:()=> '2.0.0'}});
 assert.equal(updates.supported,false);assert.match((await updates.check()).message,/installed app/);
});

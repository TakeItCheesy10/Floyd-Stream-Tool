function createUpdates({ app, dialog, parent, log }) {
    if (!app.isPackaged) return { supported:false, version:app.getVersion(), check:async()=>({message:'Updates are available in the installed app.'}) };
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    let checking = false, downloaded = false;
    const message = options => { const window=parent(); return window ? dialog.showMessageBox(window,options) : dialog.showMessageBox(options); };
    async function installPrompt() {
        const result=await message({type:'info',title:'Update ready',message:'The update is ready. Restart Floyd Stream Tool now?',detail:'OBS overlays pause while the program restarts. Your saved matches are kept.',buttons:['Restart and update','Later'],defaultId:1,cancelId:1});
        if (result.response===0) autoUpdater.quitAndInstall(false,true);
    }
    autoUpdater.on('error',error=>log('Updater: '+error.message));
    autoUpdater.on('update-downloaded',()=>{downloaded=true;installPrompt().catch(error=>log(error.message));});
    return {
        supported:true,version:app.getVersion(),
        async check() {
            if (downloaded) {await installPrompt();return {message:'Update ready to install.'};}
            if (checking) return {message:'An update check or download is already in progress.'};
            checking=true;
            try {
                const result=await autoUpdater.checkForUpdates();
                if (!result || !result.isUpdateAvailable) return {message:'You have the latest version ('+app.getVersion()+').'};
                const choice=await message({type:'info',title:'Update available',message:'Version '+result.updateInfo.version+' is available.',detail:'Download now and restart when you are ready.',buttons:['Download update','Later'],defaultId:0,cancelId:1});
                if (choice.response===0) {await autoUpdater.downloadUpdate();return {message:'Update downloaded. Choose when to restart.'};}
                return {message:'Update available. Check again when you are ready.'};
            } catch(error) {
                log('Update check failed: '+error.message);
                throw Error('Could not check for updates. Check your internet connection and try again.');
            } finally {checking=false;}
        }
    };
}
module.exports={createUpdates};

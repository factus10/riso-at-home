const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('risoApp', {
  // Opens a native file picker, copies the chosen image into the app's
  // writable data dir, and resolves with just its filename (or null if
  // the user cancelled) so the page can load it the same way it already
  // loads bundled sample images: loadImage('data/' + filename).
  chooseImage: () => ipcRenderer.invoke('choose-image'),
});

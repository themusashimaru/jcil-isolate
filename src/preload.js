const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  checkOllama: () => ipcRenderer.invoke('check-ollama'),
  getProfile: () => ipcRenderer.invoke('get-profile'),
  saveProfile: (profile) => ipcRenderer.invoke('save-profile', profile),
  getConversations: () => ipcRenderer.invoke('get-conversations'),
  saveConversations: (convs) => ipcRenderer.invoke('save-conversations', convs),
  chat: (messages) => ipcRenderer.invoke('chat', messages),
  chatStream: (messages) => ipcRenderer.invoke('chat-stream', messages),
  onToken: (callback) => ipcRenderer.on('chat-token', (_, token) => callback(token)),
  onChatDone: (callback) => ipcRenderer.on('chat-done', () => callback()),
  removeTokenListener: () => ipcRenderer.removeAllListeners('chat-token'),
  removeDoneListener: () => ipcRenderer.removeAllListeners('chat-done'),
  searchBible: (query) => ipcRenderer.invoke('search-bible', query),
  getLanguage: () => ipcRenderer.invoke('get-language'),
  checkSetup: () => ipcRenderer.invoke('check-setup'),
  installModel: () => ipcRenderer.invoke('install-model'),
  openOllamaDownload: () => ipcRenderer.invoke('open-ollama-download'),
});

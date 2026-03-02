let ghostOn = false;
let currentHost = '';
let autoEnableDomains = [];

const mainToggle = document.getElementById('mainToggle');
const mainPill   = document.getElementById('mainPill');
const mainSub    = document.getElementById('mainSub');
const statusBar  = document.getElementById('statusBar');
const hostLabel  = document.getElementById('hostLabel');
const autoBtn    = document.getElementById('autoBtn');

function setUI(on) {
  ghostOn = on;
  mainToggle.classList.toggle('active', on);
  mainPill.classList.toggle('on', on);
  mainSub.textContent = on ? 'Tab switches are hidden from sites' : 'Websites can detect tab switches';
  statusBar.textContent = on ? '● Ghost Mode ACTIVE' : '● Inactive';
  statusBar.className = 'status ' + (on ? 'on' : 'off');
}

function updateAutoBtn() {
  const isAuto = autoEnableDomains.includes(currentHost);
  autoBtn.textContent = isAuto ? '✓ Auto-enabled' : '+ Auto-enable';
  autoBtn.classList.toggle('added', isAuto);
  hostLabel.classList.toggle('autoenabled', isAuto);
}

// Load state
chrome.storage.local.get(['ghostEnabled', 'autoEnableDomains'], (s) => {
  autoEnableDomains = s.autoEnableDomains || [];
  setUI(s.ghostEnabled === true);

  // Get current tab host
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      try { currentHost = new URL(tabs[0].url).hostname; } catch(e) { currentHost = ''; }
      hostLabel.textContent = currentHost || 'N/A';
      updateAutoBtn();
    }
  });
});

// Toggle ghost
mainToggle.addEventListener('click', () => {
  const newState = !ghostOn;
  setUI(newState);
  chrome.storage.local.set({ ghostEnabled: newState });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SET_GHOST', on: newState }).catch(() => {});
    }
  });
});

// Auto-enable toggle
autoBtn.addEventListener('click', () => {
  if (!currentHost) return;
  const idx = autoEnableDomains.indexOf(currentHost);
  if (idx === -1) {
    autoEnableDomains.push(currentHost);
  } else {
    autoEnableDomains.splice(idx, 1);
  }
  chrome.storage.local.set({ autoEnableDomains });
  updateAutoBtn();
});

// Options page
document.getElementById('optBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Test page
document.getElementById('testBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://tabghost.vercel.app' });
});

// Listen for ghost state changes from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'GHOST_CHANGED') setUI(msg.on);
});

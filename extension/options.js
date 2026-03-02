const DEFAULTS = {
  showButton: true,
  sessionPersist: true,
  blockPagehide: true,
  autoEnableDomains: [],
};

let settings = { ...DEFAULTS };

function showSaved() {
  const msg = document.getElementById('savedMsg');
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), 1800);
}

function save(partial) {
  Object.assign(settings, partial);
  chrome.storage.local.set(partial, showSaved);
}

function makeSw(id, key) {
  const el = document.getElementById(id);
  if (settings[key]) el.classList.add('on');
  el.addEventListener('click', () => {
    el.classList.toggle('on');
    const val = el.classList.contains('on');
    save({ [key]: val });

    // Propagate button visibility change to all tabs
    if (key === 'showButton') {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: 'SET_BUTTON_VISIBLE', visible: val }).catch(() => {});
        });
      });
    }
  });
}

function renderDomains() {
  const list = document.getElementById('domainList');
  const domains = settings.autoEnableDomains;
  if (!domains.length) {
    list.innerHTML = '<div class="domain-empty">No sites added yet</div>';
    return;
  }
  list.innerHTML = domains.map(d => `
    <div class="domain-item">
      <span class="host">${d}</span>
      <span class="remove" data-host="${d}">Remove</span>
    </div>
  `).join('');
  list.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      settings.autoEnableDomains = settings.autoEnableDomains.filter(x => x !== btn.dataset.host);
      save({ autoEnableDomains: settings.autoEnableDomains });
      renderDomains();
    });
  });
}

// Init
chrome.storage.local.get(Object.keys(DEFAULTS), (stored) => {
  settings = { ...DEFAULTS, ...stored };
  makeSw('swButton', 'showButton');
  makeSw('swSession', 'sessionPersist');
  makeSw('swPagehide', 'blockPagehide');
  renderDomains();
});

// Add domain
document.getElementById('addDomainBtn').addEventListener('click', () => {
  const input = document.getElementById('domainInput');
  let val = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!val || settings.autoEnableDomains.includes(val)) return;
  settings.autoEnableDomains.push(val);
  save({ autoEnableDomains: settings.autoEnableDomains });
  renderDomains();
  input.value = '';
});

document.getElementById('domainInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addDomainBtn').click();
});

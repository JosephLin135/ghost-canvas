# 👻 TabGhost

**Hide your tab switching from websites.** TabGhost makes sites think you never left — no pause triggers, no "are you still watching?", no activity tracking from tab switching.

## What it does

When you switch tabs, websites detect it via:
- `document.hidden` → becomes `true`  
- `document.visibilityState` → becomes `"hidden"`  
- `visibilitychange` event fires  
- `blur` / `focusout` events fire  

TabGhost intercepts all of these at the browser's JavaScript level before any page code sees them.

## Structure

```
tabghost/
├── extension/          # Chrome extension (load unpacked)
│   ├── manifest.json
│   ├── spoof.js        # MAIN world — overrides browser APIs
│   ├── content.js      # Isolated world — UI + messaging
│   ├── popup.html/js   # Extension popup
│   ├── options.html/js # Full options page
│   └── icons/
└── website/            # Vercel test page
    ├── index.html
    └── vercel.json
```

## Install Extension

1. Clone this repo
2. Go to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked** → select the `extension/` folder

## Deploy Website

```bash
cd website
npx vercel deploy
```

Or connect this GitHub repo to Vercel and set the root directory to `website/`.

## Features

- 👻 **Ghost Mode** — blocks all visibility/blur/pagehide events via capture-phase interception
- 🔘 **Floating button** — toggle on any page (can be hidden in options)
- ⚙️ **Options page** — show/hide button, auto-enable domains, per-feature toggles
- 🌐 **Auto-enable** — automatically turn Ghost Mode on for specified domains
- 🧪 **Live test page** — hosted on Vercel, shows real-time event blocking status

## How it works

`spoof.js` runs in the **MAIN world** (`world: "MAIN"`) at `document_start`, before any page JavaScript. It:

1. Overrides `Document.prototype.hidden` and `Document.prototype.visibilityState` at the prototype level
2. Registers capture-phase event listeners that call `stopImmediatePropagation()` before page handlers
3. Wraps `EventTarget.prototype.addEventListener` to drop blocked event registrations
4. Wraps `EventTarget.prototype.dispatchEvent` to suppress programmatic event dispatch

`content.js` runs in the isolated extension world and handles the UI, storage, and messaging.

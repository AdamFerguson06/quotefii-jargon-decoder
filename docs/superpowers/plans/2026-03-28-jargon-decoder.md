# Insurance Jargon Decoder Chrome Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that auto-highlights insurance terms on insurance sites and provides right-click definitions on all sites, with a searchable glossary popup.

**Architecture:** Manifest V3 extension with 4 core files: a static JSON dictionary (~50 terms), a content script that highlights terms and shows definition popups, a service worker that manages the context menu, and a toolbar popup with a searchable glossary. All data is bundled; no network requests.

**Tech Stack:** Plain HTML/CSS/JS, Chrome Extensions Manifest V3, chrome.contextMenus API, chrome.storage.sync API

---

## File Structure

```
quotefii-jargon-decoder/
├── manifest.json            # Extension manifest (V3)
├── data/
│   └── dictionary.json      # ~50 insurance terms with definitions
├── background.js            # Service worker: context menu + messaging
├── content.js               # Content script: highlight terms + show popups
├── content.css              # Styles for highlights and definition popups
├── popup/
│   ├── popup.html           # Toolbar popup: searchable glossary
│   ├── popup.css            # Glossary styles
│   └── popup.js             # Glossary search/filter logic
├── icons/
│   ├── icon16.png           # Extension icon 16px
│   ├── icon48.png           # Extension icon 48px
│   └── icon128.png          # Extension icon 128px
├── index.html               # (existing) GitHub Pages site
├── quotefii-logo.webp       # (existing) Logo
└── LICENSE                  # (existing) MIT
```

---

### Task 1: Manifest and Icons

**Files:**
- Create: `manifest.json`
- Create: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`

- [ ] **Step 1: Create manifest.json**

Create `manifest.json` in the repo root with Manifest V3 configuration:
- permissions: contextMenus, storage, activeTab
- background service_worker: background.js
- content_scripts: content.js + content.css on all URLs, run at document_idle
- action popup: popup/popup.html
- web_accessible_resources: data/dictionary.json and quotefii-logo.webp

- [ ] **Step 2: Generate extension icons from the logo**

Use `sips` (macOS built-in) to convert quotefii-logo.webp to PNG at 16px, 48px, and 128px into `icons/` directory.

- [ ] **Step 3: Create placeholder files so extension loads**

Create empty `background.js`, `content.js`, `content.css`, `popup/popup.html`, `popup/popup.css`, `popup/popup.js`, and `data/dictionary.json` (with `[]`).

- [ ] **Step 4: Load extension in Chrome and verify it loads**

Open `chrome://extensions/`, enable Developer mode, Load unpacked from the repo directory. Verify extension appears with QuoteFii icon and no console errors.

- [ ] **Step 5: Commit**

```
git add manifest.json icons/ background.js content.js content.css popup/ data/
git commit -m "feat: extension manifest, icons, and skeleton files"
```

---

### Task 2: Dictionary Data

**Files:**
- Create: `data/dictionary.json`

- [ ] **Step 1: Write the complete dictionary**

Create `data/dictionary.json` with ~50 insurance terms. Each entry has: `term`, `aliases` (array), `definition` (2-3 sentences, plain English), and `learn_more_url` (UTM-tagged blog.quotefii.com link).

Cover these categories:
- **Coverage types (15):** Liability, Bodily Injury (BI), Property Damage (PD), Collision, Comprehensive, Uninsured Motorist (UM), Underinsured Motorist (UIM), PIP, MedPay, GAP Insurance, Full Coverage, Minimum Coverage, Umbrella Policy, Rental Reimbursement, Roadside Assistance
- **Policy basics (12):** Premium, Deductible, Policy, Declarations Page, Endorsement, Rider, Exclusion, Binder, Coverage Limit, Split Limits, Combined Single Limit (CSL), Named Insured
- **Claims and process (8):** Claim, Adjuster, Subrogation, Total Loss, Diminished Value, Comparative Negligence, No-Fault, Tort
- **Regulatory (7):** SR-22, FR-44, State Minimum, Proof of Insurance, Insurance Score, NAIC, Rate Filing
- **Discounts and factors (8):** Multi-Policy Discount, Good Driver Discount, Telematics, Usage-Based Insurance (UBI), Credit Score Factor, At-Fault Accident, Lapse in Coverage, Renewal

UTM format: `utm_source=chrome_extension&utm_medium=popup&utm_content=jargon-decoder`
Default URL when no specific article exists: `https://blog.quotefii.com/guides?utm_source=chrome_extension&utm_medium=popup&utm_content=jargon-decoder`

- [ ] **Step 2: Validate JSON is parseable**

Run: `python3 -c "import json; d=json.load(open('data/dictionary.json')); print(f'{len(d)} terms loaded'); assert len(d) >= 45"`

- [ ] **Step 3: Commit**

```
git add data/dictionary.json
git commit -m "feat: dictionary with 50 insurance term definitions"
```

---

### Task 3: Content Script (Auto-Highlight + Popups)

**Files:**
- Create: `content.js`
- Create: `content.css`

- [ ] **Step 1: Write content.css**

Styles for:
- `.qf-highlight`: dotted underline (#2d5a9e), cursor help, transparent bg, hover bg highlight
- `.qf-popup-overlay`: fixed fullscreen, z-index 2147483646 (catches outside clicks)
- `.qf-popup`: fixed positioned, white bg, border-radius 10px, box-shadow, 340px width, Inter font
- `.qf-popup-header`, `.qf-popup-term`: bold #1B3A6D term name
- `.qf-popup-definition`: definition text
- `.qf-popup-learn`: "Learn more" link
- `.qf-popup-footer`: light gray bg, QuoteFii logo + CTA link
- `.qf-popup-notfound`: centered "Term not found" message

- [ ] **Step 2: Write content.js**

IIFE with these components:
1. **State**: dictionary array, termMap (lowercase term/alias to entry), highlightEnabled flag, UTM constants, logo URL
2. **Insurance site detection**: `isInsuranceSite()` checks hostname against pattern list (insurance, geico, progressive, statefarm, allstate, usaa, nationwide, helpinsure, state DOI domains, etc.)
3. **Skip logic**: `shouldSkip(node)` skips SCRIPT, STYLE, INPUT, TEXTAREA, SELECT, BUTTON, NOSCRIPT, IFRAME, SVG, CODE, PRE, contentEditable elements, and already-highlighted elements
4. **Term regex builder**: `buildTermRegex()` collects all terms + aliases, sorts longest-first, escapes special chars, builds case-insensitive word-boundary regex
5. **DOM walker**: `walkAndHighlight(root, regex)` uses TreeWalker on SHOW_TEXT nodes, collects nodes first then processes (avoids mutation during walk), wraps matches in `<span class="qf-highlight" data-qf-term="...">`
6. **Popup**: `showPopup(termText, anchorRect)` removes any existing popup, looks up term in termMap, builds popup HTML (definition + learn more + footer CTA, or "not found" + glossary link), creates overlay for outside-click dismiss, positions popup near anchorRect with viewport clamping (flip above if no room below, clamp horizontal)
7. **Event listeners**: click on .qf-highlight shows popup, Escape dismisses popup
8. **Message listener**: receives `define-term` messages from background.js (context menu), shows popup using selection range rect
9. **Init**: fetch dictionary.json via chrome.runtime.getURL, build termMap, load highlight setting from chrome.storage.sync, if enabled and on insurance site run walkAndHighlight, attach event listeners

- [ ] **Step 3: Test auto-highlight on an insurance site**

Reload extension, navigate to an insurance-related site, verify terms highlighted with dotted underline, click to see definition popup, dismiss with Escape or outside click.

- [ ] **Step 4: Test no highlighting on non-insurance sites**

Navigate to google.com, verify no terms are highlighted.

- [ ] **Step 5: Commit**

```
git add content.js content.css
git commit -m "feat: content script with auto-highlight and definition popups"
```

---

### Task 4: Background Service Worker (Context Menu)

**Files:**
- Create: `background.js`

- [ ] **Step 1: Write background.js**

Three responsibilities:
1. **onInstalled**: create context menu item "Define Insurance Term" with id "qf-define", contexts ["selection"]
2. **onClicked**: when menu item clicked, send message `{type: "define-term", text: selectionText}` to active tab via chrome.tabs.sendMessage
3. **Badge management**: on startup load highlightEnabled from storage, set badge to "" (enabled) or "OFF" (disabled) with gray background. Listen to chrome.storage.onChanged to update badge dynamically.

- [ ] **Step 2: Test context menu**

Reload extension, go to any site, select text "deductible", right-click, verify "Define Insurance Term" appears, click it, verify popup appears.

- [ ] **Step 3: Commit**

```
git add background.js
git commit -m "feat: service worker with context menu and badge management"
```

---

### Task 5: Toolbar Popup (Searchable Glossary)

**Files:**
- Create: `popup/popup.html`
- Create: `popup/popup.css`
- Create: `popup/popup.js`

- [ ] **Step 1: Write popup.html**

Simple HTML document loading popup.css and popup.js. Structure:
- Header: QuoteFii logo + "Insurance Jargon Decoder" title
- Toggle section: "Auto-highlight on insurance sites" with checkbox
- Search input: "Search terms..." placeholder
- Scrollable term list container
- Footer: "Powered by QuoteFii" with UTM-tagged blog link

- [ ] **Step 2: Write popup.css**

Styles for:
- body: 360px width, 500px max-height
- Header with logo and title on gray background
- Toggle switch (CSS-only, checkbox hidden, slider with ::after pseudo-element)
- Search input with focus border
- Scrollable list (max-height 340px, overflow-y auto)
- Term items: clickable name with arrow indicator, collapsible definition body
- No results message
- Footer with muted link

- [ ] **Step 3: Write popup.js**

Async IIFE:
1. Fetch dictionary.json, sort alphabetically by term
2. Load highlightEnabled from chrome.storage.sync, set toggle checkbox
3. Toggle change handler: save to chrome.storage.sync
4. `render(filter)` function: filters dictionary by term, aliases, and definition text matching filter string; renders items with click-to-expand; shows "No matching terms" when empty
5. Search input event listener calls render on each keystroke
6. Auto-focus search input on popup open
7. Initial render with empty filter

- [ ] **Step 4: Test toolbar popup**

Click extension icon, verify glossary appears with all terms A-Z, type in search, verify filtering works, click term to expand definition, toggle highlight off and verify badge shows "OFF".

- [ ] **Step 5: Commit**

```
git add popup/
git commit -m "feat: toolbar popup with searchable glossary and highlight toggle"
```

---

### Task 6: End-to-End Verification

**Files:** None (testing only)

- [ ] **Step 1: Auto-highlight on insurance site** — verify dotted underline, click popup with definition + "Learn more" + QuoteFii CTA, Escape dismisses
- [ ] **Step 2: Right-click on non-insurance site** — select "deductible" on Wikipedia, right-click define, verify popup
- [ ] **Step 3: Term not found** — select random word, right-click define, verify "Term not found" with glossary link
- [ ] **Step 4: Toggle persistence** — toggle OFF, verify badge, navigate to insurance site, no highlights. Toggle ON, refresh, highlights return.
- [ ] **Step 5: Popup positioning** — test near bottom/right edges of viewport, verify popup stays in view
- [ ] **Step 6: Commit final state**

```
git add -A
git commit -m "chore: verified all user stories pass end-to-end"
```

---

### Task 7: Push and Update PRD

- [ ] **Step 1: Push to GitHub**

```
cd /tmp/quotefii-jargon-decoder
git push origin main
```

- [ ] **Step 2: Update PRD status to in-progress**

Change frontmatter in `/tmp/insurance-data-tools/tasks/prd-chrome-jargon-decoder.md` to `status: in-progress`.

- [ ] **Step 3: Commit and push PRD update**

```
cd /tmp/insurance-data-tools
git add tasks/prd-chrome-jargon-decoder.md
git commit -m "chore: mark jargon decoder PRD as in-progress"
git push origin main
```

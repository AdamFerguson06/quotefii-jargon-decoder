# Insurance Jargon Decoder

Chrome extension that explains auto insurance terms in plain English. Highlights jargon on insurance sites and lets you right-click to look up any term.

**Project page:** [adamferguson06.github.io/quotefii-jargon-decoder](https://adamferguson06.github.io/quotefii-jargon-decoder)

## Features

- **Auto-highlight on insurance sites** — recognized terms get a subtle dotted underline. Click to see the definition.
- **Right-click anywhere** — select any insurance term on any website, right-click, and choose "Define Insurance Term."
- **Searchable glossary** — click the toolbar icon to browse and search all 51 terms.
- **Toggle on/off** — disable auto-highlighting when you don't need it.

## Install (Developer Mode)

1. Clone this repo
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this directory
5. The QuoteFii shield icon appears in your toolbar

## How It Works

On insurance-related websites (detected by URL patterns), the extension scans the page for recognized insurance terms and highlights them with a dotted underline. Clicking a highlighted term shows a popup with:

- The term name
- A plain-English definition (2-3 sentences)
- A "Learn more" link to a relevant guide
- A link to compare auto insurance quotes

On all other websites, you can select any text, right-click, and choose "Define Insurance Term" to look it up.

## Dictionary

The extension includes 51 terms across 5 categories:

| Category | Terms | Examples |
|----------|-------|---------|
| Coverage types | 15 | Liability, Collision, Comprehensive, PIP, GAP |
| Policy basics | 12 | Premium, Deductible, Declarations Page, Endorsement |
| Claims and process | 8 | Claim, Adjuster, Subrogation, Total Loss |
| Regulatory | 7 | SR-22, FR-44, NAIC, Rate Filing |
| Discounts and factors | 9 | Telematics, UBI, Credit Score Factor, Bundling |

All definitions are stored in [`data/dictionary.json`](data/dictionary.json). Each entry includes the term, aliases (abbreviations and alternate names), a plain-English definition, and a link to learn more.

## Project Structure

```
├── manifest.json          # Chrome Extension Manifest V3
├── background.js          # Service worker: context menu, badge
├── content.js             # Content script: highlight + popups
├── content.css            # Highlight and popup styles
├── popup/
│   ├── popup.html         # Toolbar popup: searchable glossary
│   ├── popup.css          # Glossary styles
│   └── popup.js           # Search/filter logic
├── data/
│   └── dictionary.json    # 51 insurance terms
├── icons/                 # Extension icons (16, 48, 128px)
└── index.html             # GitHub Pages project page
```

## Privacy

This extension:

- Makes **zero network requests**. All data is bundled in the extension.
- Collects **no user data**. No analytics, no tracking, no cookies.
- Stores only one setting locally: whether auto-highlighting is on or off.
- Reads page content solely to find and highlight insurance terms.

## Built By

[QuoteFii](https://blog.quotefii.com?utm_source=github&utm_medium=readme&utm_content=jargon-decoder) — auto insurance data and tools powered by .gov sources.

## License

MIT

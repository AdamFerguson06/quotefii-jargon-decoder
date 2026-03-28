(function () {
  "use strict";

  // ── State ──
  var dictionary = [];
  var termMap = {};
  var highlightEnabled = true;
  var UTM = "utm_source=chrome_extension&utm_medium=popup&utm_content=jargon-decoder";
  var QUOTEFII_CTA = "https://quotefii.com?" + UTM;
  var GLOSSARY_URL = "https://blog.quotefii.com/guides?" + UTM;
  var logoUrl = "";

  // ── Insurance site detection ──
  var INSURANCE_PATTERNS = [
    "insurance", "geico", "progressive", "statefarm", "allstate", "usaa",
    "nationwide", "libertymutual", "farmers", "travelers", "erie",
    "thezebra", "policygenius", "gabi", "insurify", "quotewizard",
    "helpinsure", "aldoi", "difi.az.gov", "doi.nv.gov", "doi.sc.gov",
    "oci.wi.gov", "insurance.ca.gov", "tdi.texas.gov",
  ];

  function isInsuranceSite() {
    var host = window.location.hostname.toLowerCase();
    var path = window.location.pathname.toLowerCase();
    for (var i = 0; i < INSURANCE_PATTERNS.length; i++) {
      if (host.indexOf(INSURANCE_PATTERNS[i]) !== -1 || path.indexOf(INSURANCE_PATTERNS[i]) !== -1) {
        return true;
      }
    }
    return false;
  }

  // ── Skip elements ──
  var SKIP_TAGS = {
    SCRIPT: true, STYLE: true, INPUT: true, TEXTAREA: true, SELECT: true,
    BUTTON: true, NOSCRIPT: true, IFRAME: true, OBJECT: true, SVG: true,
    CODE: true, PRE: true,
  };

  function shouldSkip(node) {
    if (!node.parentElement) return true;
    var el = node.parentElement;
    while (el) {
      if (SKIP_TAGS[el.tagName]) return true;
      if (el.isContentEditable) return true;
      if (el.classList && el.classList.contains("qf-highlight")) return true;
      if (el.classList && el.classList.contains("qf-popup")) return true;
      el = el.parentElement;
    }
    return false;
  }

  // ── Build term regex ──
  function buildTermRegex() {
    var allTerms = [];
    for (var i = 0; i < dictionary.length; i++) {
      var entry = dictionary[i];
      allTerms.push(entry.term);
      if (entry.aliases) {
        for (var j = 0; j < entry.aliases.length; j++) {
          allTerms.push(entry.aliases[j]);
        }
      }
    }
    // Sort longest first so "bodily injury" matches before "injury"
    allTerms.sort(function (a, b) { return b.length - a.length; });
    var escaped = [];
    for (var k = 0; k < allTerms.length; k++) {
      escaped.push(allTerms[k].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
    return new RegExp("\\b(" + escaped.join("|") + ")\\b", "gi");
  }

  // ── Highlight terms in text nodes ──
  function highlightTextNode(textNode, regex) {
    var text = textNode.textContent;
    if (!text.trim()) return;

    var parts = [];
    var lastIndex = 0;
    var match;
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      var span = document.createElement("span");
      span.className = "qf-highlight";
      span.textContent = match[0];
      span.dataset.qfTerm = match[0].toLowerCase();
      parts.push(span);
      lastIndex = regex.lastIndex;
    }

    if (parts.length === 0) return;

    if (lastIndex < text.length) {
      parts.push(document.createTextNode(text.slice(lastIndex)));
    }

    var frag = document.createDocumentFragment();
    for (var i = 0; i < parts.length; i++) {
      frag.appendChild(parts[i]);
    }
    textNode.parentNode.replaceChild(frag, textNode);
  }

  function walkAndHighlight(root, regex) {
    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          if (shouldSkip(node)) return NodeFilter.FILTER_REJECT;
          if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    var textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    for (var i = 0; i < textNodes.length; i++) {
      highlightTextNode(textNodes[i], regex);
    }
  }

  // ── Popup ──
  function removePopup() {
    var old = document.querySelector(".qf-popup-overlay");
    if (old) old.remove();
    var oldPopup = document.querySelector(".qf-popup");
    if (oldPopup) oldPopup.remove();
  }

  function showPopup(termText, anchorRect) {
    removePopup();

    var key = termText.toLowerCase().trim();
    var entry = termMap[key];

    var popup = document.createElement("div");
    popup.className = "qf-popup";

    if (entry) {
      popup.innerHTML =
        '<div class="qf-popup-header">' +
          '<p class="qf-popup-term">' + entry.term + '</p>' +
        '</div>' +
        '<p class="qf-popup-definition">' + entry.definition + '</p>' +
        '<div class="qf-popup-learn">' +
          '<a href="' + entry.learn_more_url + '" target="_blank" rel="noopener">Learn more &rarr;</a>' +
        '</div>' +
        '<div class="qf-popup-footer">' +
          (logoUrl ? '<img src="' + logoUrl + '" alt="QuoteFii">' : '') +
          '<a href="' + QUOTEFII_CTA + '" target="_blank" rel="noopener">Compare auto insurance quotes</a>' +
        '</div>';
    } else {
      popup.innerHTML =
        '<div class="qf-popup-notfound">' +
          '<p>Term not found.</p>' +
          '<p><a href="' + GLOSSARY_URL + '" target="_blank" rel="noopener">Browse our insurance glossary &rarr;</a></p>' +
        '</div>' +
        '<div class="qf-popup-footer">' +
          (logoUrl ? '<img src="' + logoUrl + '" alt="QuoteFii">' : '') +
          '<a href="' + QUOTEFII_CTA + '" target="_blank" rel="noopener">Compare auto insurance quotes</a>' +
        '</div>';
    }

    // Overlay to catch outside clicks
    var overlay = document.createElement("div");
    overlay.className = "qf-popup-overlay";
    overlay.addEventListener("click", removePopup);

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    // Position popup
    var popupRect = popup.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    var top = anchorRect.bottom + 8;
    var left = anchorRect.left;

    // Flip above if no room below
    if (top + popupRect.height > vh - 12) {
      top = anchorRect.top - popupRect.height - 8;
    }
    // Clamp horizontal
    if (left + popupRect.width > vw - 12) {
      left = vw - popupRect.width - 12;
    }
    if (left < 12) left = 12;
    if (top < 12) top = 12;

    popup.style.top = top + "px";
    popup.style.left = left + "px";
  }

  // ── Event listeners ──
  function onHighlightClick(e) {
    var target = e.target;
    while (target && target !== document.body) {
      if (target.classList && target.classList.contains("qf-highlight")) break;
      target = target.parentElement;
    }
    if (!target || !target.classList || !target.classList.contains("qf-highlight")) return;
    e.preventDefault();
    e.stopPropagation();
    var rect = target.getBoundingClientRect();
    showPopup(target.dataset.qfTerm || target.textContent, rect);
  }

  function onKeydown(e) {
    if (e.key === "Escape") removePopup();
  }

  // ── Listen for context menu messages from background.js ──
  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.type === "define-term") {
      var sel = window.getSelection();
      var text = (msg.text || sel.toString()).trim();
      if (!text) return;

      var rect;
      if (sel.rangeCount > 0) {
        rect = sel.getRangeAt(0).getBoundingClientRect();
      }
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        rect = {
          top: window.innerHeight / 2 - 20,
          bottom: window.innerHeight / 2 + 20,
          left: window.innerWidth / 2 - 20,
          right: window.innerWidth / 2 + 20,
        };
      }
      showPopup(text, rect);
    }
  });

  // ── Init ──
  function init() {
    var dictUrl = chrome.runtime.getURL("data/dictionary.json");
    fetch(dictUrl)
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        dictionary = data;

        // Build lookup map
        for (var i = 0; i < dictionary.length; i++) {
          var entry = dictionary[i];
          termMap[entry.term.toLowerCase()] = entry;
          if (entry.aliases) {
            for (var j = 0; j < entry.aliases.length; j++) {
              termMap[entry.aliases[j].toLowerCase()] = entry;
            }
          }
        }

        // Logo URL for popups
        logoUrl = chrome.runtime.getURL("quotefii-logo.webp");

        // Check highlight setting
        chrome.storage.sync.get({ highlightEnabled: true }, function (settings) {
          highlightEnabled = settings.highlightEnabled;

          // Auto-highlight on insurance sites if enabled
          if (highlightEnabled && isInsuranceSite()) {
            var regex = buildTermRegex();
            walkAndHighlight(document.body, regex);
          }
        });

        // Listen for clicks on highlighted terms
        document.addEventListener("click", onHighlightClick);
        document.addEventListener("keydown", onKeydown);
      });
  }

  init();
})();

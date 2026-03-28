(function () {
  "use strict";

  var listEl = document.getElementById("qf-list");
  var searchEl = document.getElementById("qf-search");
  var toggleEl = document.getElementById("qf-toggle");
  var dictionary = [];

  // ── Safe DOM builder (no innerHTML with untrusted content) ──
  function createTermItem(entry) {
    var item = document.createElement("div");
    item.className = "qf-term-item";

    // Header row
    var nameRow = document.createElement("div");
    nameRow.className = "qf-term-name";
    var nameSpan = document.createElement("span");
    nameSpan.textContent = entry.term;
    var arrowSpan = document.createElement("span");
    arrowSpan.className = "qf-term-arrow";
    arrowSpan.innerHTML = "&#9654;";
    nameRow.appendChild(nameSpan);
    nameRow.appendChild(arrowSpan);

    // Body (definition + link)
    var body = document.createElement("div");
    body.className = "qf-term-body";
    var defP = document.createElement("p");
    defP.className = "qf-term-def";
    defP.textContent = entry.definition;
    var linkP = document.createElement("p");
    linkP.className = "qf-term-link";
    var linkA = document.createElement("a");
    linkA.href = entry.learn_more_url;
    linkA.target = "_blank";
    linkA.rel = "noopener";
    linkA.textContent = "Learn more \u2192";
    linkP.appendChild(linkA);
    body.appendChild(defP);
    body.appendChild(linkP);

    item.appendChild(nameRow);
    item.appendChild(body);

    nameRow.addEventListener("click", function () {
      item.classList.toggle("open");
    });

    return item;
  }

  // ── Render term list ──
  function render(filter) {
    var filterLower = (filter || "").toLowerCase();
    listEl.textContent = "";

    var filtered = [];
    for (var i = 0; i < dictionary.length; i++) {
      var entry = dictionary[i];
      if (!filterLower) {
        filtered.push(entry);
        continue;
      }
      if (entry.term.toLowerCase().indexOf(filterLower) !== -1) {
        filtered.push(entry);
        continue;
      }
      if (entry.definition.toLowerCase().indexOf(filterLower) !== -1) {
        filtered.push(entry);
        continue;
      }
      if (entry.aliases) {
        var matched = false;
        for (var j = 0; j < entry.aliases.length; j++) {
          if (entry.aliases[j].toLowerCase().indexOf(filterLower) !== -1) {
            matched = true;
            break;
          }
        }
        if (matched) {
          filtered.push(entry);
        }
      }
    }

    if (filtered.length === 0) {
      var noResults = document.createElement("div");
      noResults.className = "qf-no-results";
      noResults.textContent = "No matching terms found.";
      listEl.appendChild(noResults);
      return;
    }

    for (var k = 0; k < filtered.length; k++) {
      listEl.appendChild(createTermItem(filtered[k]));
    }
  }

  // ── Search filter ──
  searchEl.addEventListener("input", function () {
    render(searchEl.value);
  });

  // Auto-focus search
  searchEl.focus();

  // ── Load dictionary ──
  fetch(chrome.runtime.getURL("data/dictionary.json"))
    .then(function (resp) { return resp.json(); })
    .then(function (data) {
      dictionary = data;
      // Sort alphabetically by term
      dictionary.sort(function (a, b) {
        return a.term.localeCompare(b.term);
      });
      render("");
    });

  // ── Load and handle highlight toggle ──
  chrome.storage.sync.get({ highlightEnabled: true }, function (settings) {
    toggleEl.checked = settings.highlightEnabled;
  });

  toggleEl.addEventListener("change", function () {
    chrome.storage.sync.set({ highlightEnabled: toggleEl.checked });
  });
})();

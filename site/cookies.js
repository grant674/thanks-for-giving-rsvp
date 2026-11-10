/* Cookie preference center for answeringthecall2026.com.
   Stores the choice in localStorage under "atc_consent". No analytics or advertising tags are loaded on this site;
   the Analytics category is governed here so anything added later respects the visitor's choice. */
(function () {
  var KEY = "atc_consent", VERSION = 1;
  function read() { try { var v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && v.v === VERSION ? v : null; } catch (e) { return null; } }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, t: Date.now(), functional: !!c.functional, analytics: !!c.analytics })); } catch (e) {} }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  var banner = el('<div class="ck-banner" role="region" aria-label="Cookie notice">' +
    '<p>This site uses strictly necessary cookies to run the RSVP form, plus optional cookies to remember your preferences. We do not use advertising or tracking cookies.</p>' +
    '<div class="ck-actions"><button type="button" class="ck-btn ck-ghost" data-ck="prefs">Manage preferences</button>' +
    '<button type="button" class="ck-btn ck-ghost" data-ck="necessary">Necessary only</button>' +
    '<button type="button" class="ck-btn ck-solid" data-ck="all">Accept all</button></div></div>');

  var modal = el('<div class="ck-modal" role="dialog" aria-modal="true" aria-labelledby="ck-title" hidden>' +
    '<div class="ck-panel">' +
    '<div class="ck-head"><span>Thanks for Answering the Call</span><button type="button" class="ck-x" aria-label="Close" data-ck="close">&times;</button></div>' +
    '<div class="ck-body">' +
    '<h2 id="ck-title">Cookie preferences</h2>' +
    '<p>Choose which cookies this site may use. Strictly necessary cookies are always on because the RSVP form cannot work without them. Your choice is kept on this device for 12 months and you can change it any time from the link in the footer.</p>' +
    '<div class="ck-cat"><div><h3>Strictly necessary</h3><p>Session security and spam protection for the RSVP form, and the record of your cookie choice. Font files are delivered by Adobe Fonts and Google Fonts; these services receive your IP address to serve the file but set no tracking cookies.</p></div><span class="ck-always">Always on</span></div>' +
    '<div class="ck-cat"><div><h3>Functional</h3><p>Remembers details such as a partly completed form so you do not have to re-enter them.</p></div><label class="ck-switch"><input type="checkbox" id="ck-functional"><span></span></label></div>' +
    '<div class="ck-cat"><div><h3>Analytics</h3><p>Would help us understand how the page is used. No analytics service is installed on this site today; this setting governs any added later.</p></div><label class="ck-switch"><input type="checkbox" id="ck-analytics"><span></span></label></div>' +
    '<p class="ck-fine">Questions about privacy for this event: <a href="mailto:grant@pachecoventuresaz.com">grant@pachecoventuresaz.com</a>. PMI U.S. privacy notice: <a href="https://www.pmiprivacy.com/en/business-partner" target="_blank" rel="noopener">pmiprivacy.com</a>.</p>' +
    '</div>' +
    '<div class="ck-foot"><button type="button" class="ck-btn ck-ghost" data-ck="necessary">Necessary only</button><button type="button" class="ck-btn ck-ghost" data-ck="savesel">Save my choices</button><button type="button" class="ck-btn ck-solid" data-ck="all">Accept all</button></div>' +
    '</div></div>');

  function showBanner() { document.body.appendChild(banner); }
  function hideBanner() { if (banner.parentNode) banner.parentNode.removeChild(banner); }
  function openModal() {
    var c = read() || {};
    modal.querySelector("#ck-functional").checked = !!c.functional;
    modal.querySelector("#ck-analytics").checked = !!c.analytics;
    if (modal.parentNode !== document.body) document.body.appendChild(modal);
    modal.hidden = false; document.body.classList.add("ck-lock");
    modal.querySelector("#ck-functional").focus();
  }
  function closeModal() { modal.hidden = true; document.body.classList.remove("ck-lock"); }
  function apply(c) { save(c); hideBanner(); closeModal(); document.dispatchEvent(new CustomEvent("atc:consent", { detail: c })); }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ck]"); if (!b) return;
    var a = b.getAttribute("data-ck");
    if (a === "all") apply({ functional: true, analytics: true });
    else if (a === "necessary") apply({ functional: false, analytics: false });
    else if (a === "savesel") apply({ functional: modal.querySelector("#ck-functional").checked, analytics: modal.querySelector("#ck-analytics").checked });
    else if (a === "prefs") openModal();
    else if (a === "close") closeModal();
  });
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeModal(); });

  var existing = read();
  if (!existing || Date.now() - existing.t > 365 * 24 * 3600 * 1000) showBanner();
})();

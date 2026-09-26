// Noted — Google Meet companion.
//
// One job: put a Record button inside the Meet page. Clicking it opens the
// recorder in a new tab, already knowing which call this is, so the only
// thing left to do there is pick this tab in the share dialog.
//
// Deliberately no audio capture in the extension itself. Chrome's
// tabCapture API would let an extension record the tab silently, and that is
// exactly the kind of quiet recording the product refuses to do. The
// share-tab dialog is the consent step, and it stays.

(function () {
  const APP = "https://8x-fathom-rebuild.vercel.app";
  const ID = "noted-record";

  function meetingCode() {
    const m = location.pathname.match(/^\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    return m ? m[1] : null;
  }

  function meetingTitle() {
    // Meet puts the meeting name in the document title once you're in the
    // room; before that it is just "Meet".
    const t = document.title.replace(/\s*[-–|]\s*Google Meet\s*$/i, "").trim();
    return t && t.toLowerCase() !== "meet" ? t : "Google Meet call";
  }

  function inCall() {
    // The in-call toolbar exists only once you have joined. Its "Leave call"
    // control is the most stable thing to look for across Meet redesigns.
    return Boolean(document.querySelector('[aria-label*="Leave call" i], [aria-label*="leave call" i]'));
  }

  // Meet's class names are minified and change, so the control bar is found
  // by structure: the "Leave call" button sits inside a grid of control
  // groups, and that grid's parent is the flex row the bar is laid out in.
  // Appending to that row puts the button right after the leave button, at
  // the bar's own height. If the structure ever changes, fall back to a
  // fixed pill above the bar rather than showing nothing.
  function controlBar() {
    const leave = document.querySelector('[aria-label*="Leave call" i], [aria-label*="leave call" i]');
    if (!leave) return null;
    let grid = leave;
    for (let i = 0; i < 8 && grid; i++) {
      if (getComputedStyle(grid).display === "grid") break;
      grid = grid.parentElement;
    }
    const row = grid && grid.parentElement;
    return row && getComputedStyle(row).display === "flex" ? row : null;
  }

  function mount() {
    const existing = document.getElementById(ID);
    const code = meetingCode();
    if (!code || !inCall()) return;
    const bar = controlBar();
    if (existing) {
      // Meet re-renders the bar; if ours fell out of it, put it back.
      if (bar && existing.parentElement !== bar) bar.appendChild(existing);
      return;
    }

    const a = document.createElement("a");
    a.id = ID;
    a.href = `${APP}/record?join=${encodeURIComponent(`https://meet.google.com/${code}`)}&title=${encodeURIComponent(meetingTitle())}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.innerHTML = '<span class="fr-dot"></span><span class="fr-label">Record with Noted</span>';
    a.title = "Opens the recorder for this call in a new tab";
    if (bar) {
      a.classList.add("in-bar");
      bar.appendChild(a);
    } else {
      document.body.appendChild(a);
    }
  }

  // Meet is a single-page app: the toolbar appears after join, and the URL
  // changes without a navigation. Watch, don't poll.
  const mo = new MutationObserver(() => {
    if (!inCall()) {
      const el = document.getElementById(ID);
      if (el) el.remove();
      return;
    }
    mount();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  mount();
})();

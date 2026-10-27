const params = new URLSearchParams(window.location.search);
const domain = params.get('domain');

const domainEl = document.getElementById('blocked-domain');
if (domainEl && domain) {
  domainEl.textContent = `${domain} is paused during your focus session.`;
}

const pauseBtn = document.getElementById('pause-block-btn');
if (pauseBtn) {
  pauseBtn.addEventListener('click', async () => {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({ type: 'PAUSE_BLOCKER_5MIN' });
        if (domain) {
          window.location.href = `https://${domain}`;
          return;
        }
      } catch {
        // Fallback to Cove home
      }
    }
    window.location.href = '/index.html';
  });
}

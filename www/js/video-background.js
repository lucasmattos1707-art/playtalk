(function initPlaytalkVideoBackground() {
  const GLOBAL_ID = 'playtalkVideoBackground';
  const SURFACE_ID = 'playtalkAlbumsVideoBackground';

  function createBackground(id, surface = false) {
    const root = document.createElement('div');
    root.id = id;
    root.className = `playtalk-video-background${surface ? ' playtalk-video-background--surface' : ''}`;
    root.setAttribute('aria-hidden', 'true');

    const shade = document.createElement('span');
    shade.className = 'playtalk-video-background__shade';
    root.append(shade);
    return root;
  }

  function ensureGlobalBackground() {
    if (!document.body) return null;
    let root = document.getElementById(GLOBAL_ID);
    if (!root) {
      root = createBackground(GLOBAL_ID, false);
      document.body.prepend(root);
    }
    document.body.classList.add('playtalk-video-bg-active');
    return root;
  }

  function ensureAlbumsBackground() {
    const albums = document.querySelector('.albums-modal');
    if (!albums) return null;
    let root = albums.querySelector(`#${SURFACE_ID}`);
    if (!root) {
      root = createBackground(SURFACE_ID, true);
      albums.prepend(root);
    }
    return root;
  }

  function boot() {
    ensureGlobalBackground();
    ensureAlbumsBackground();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

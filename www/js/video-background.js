(function initPlaytalkVideoBackground() {
  const VIDEO_PATH = '/background.mp4';
  const GLOBAL_ID = 'playtalkVideoBackground';
  const SURFACE_ID = 'playtalkAlbumsVideoBackground';

  function createBackground(id, surface = false) {
    const root = document.createElement('div');
    root.id = id;
    root.className = `playtalk-video-background${surface ? ' playtalk-video-background--surface' : ''}`;
    root.setAttribute('aria-hidden', 'true');

    const video = document.createElement('video');
    video.className = 'playtalk-video-background__media';
    video.autoplay = !surface;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = surface ? 'metadata' : 'auto';
    video.disablePictureInPicture = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('tabindex', '-1');
    video.src = VIDEO_PATH;

    const shade = document.createElement('span');
    shade.className = 'playtalk-video-background__shade';
    root.append(video, shade);
    return { root, video };
  }

  function tryPlay(video) {
    if (!video) return;
    const result = video.play();
    if (result && typeof result.catch === 'function') {
      result.catch(function ignoreAutoplayRejection() {});
    }
  }

  function ensureGlobalBackground() {
    if (!document.body) return null;
    let root = document.getElementById(GLOBAL_ID);
    let video = root ? root.querySelector('video') : null;
    if (!root) {
      const created = createBackground(GLOBAL_ID, false);
      root = created.root;
      video = created.video;
      document.body.prepend(root);
    }
    document.body.classList.add('playtalk-video-bg-active');
    tryPlay(video);
    return video;
  }

  function ensureAlbumsBackground() {
    const albums = document.querySelector('.albums-modal');
    if (!albums) return null;
    let root = albums.querySelector(`#${SURFACE_ID}`);
    let video = root ? root.querySelector('video') : null;
    if (!root) {
      const created = createBackground(SURFACE_ID, true);
      root = created.root;
      video = created.video;
      albums.prepend(root);
    }

    const syncPlayback = function syncAlbumsVideoPlayback() {
      if (albums.classList.contains('is-visible')) {
        tryPlay(video);
      } else if (video && !video.paused) {
        video.pause();
      }
    };
    syncPlayback();
    const observer = new MutationObserver(syncPlayback);
    observer.observe(albums, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
    return video;
  }

  function boot() {
    const globalVideo = ensureGlobalBackground();
    const albumsVideo = ensureAlbumsBackground();
    document.addEventListener('visibilitychange', function handleVisibility() {
      if (document.hidden) {
        if (globalVideo && !globalVideo.paused) globalVideo.pause();
        if (albumsVideo && !albumsVideo.paused) albumsVideo.pause();
        return;
      }
      tryPlay(globalVideo);
      if (document.querySelector('.albums-modal.is-visible')) tryPlay(albumsVideo);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();

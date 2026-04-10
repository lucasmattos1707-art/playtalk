(function initPlaytalkShell() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const starPages = new Set(['/flashcards', '/allcards', '/speaking', '/users', '/account', '/premium']);
  const footerInjectedPages = new Set(['/books', '/speaking']);

  function injectStars() {
    if (!starPages.has(path)) return;
    // Global background now comes from shared page CSS/WebP assets.
    // Keep legacy cosmic-shell effect disabled to avoid masking the new background.
    return;
  }

  function activeSlot() {
    if (path === '/allcards') return 'cards';
    if (path === '/users') return 'users';
    if (path === '/account') return 'account';
    if (path === '/premium') return 'premium';
    if (path === '/books' || path === '/speaking') return 'books';
    return 'play';
  }

  function buildFooterItem(slot, href, label, svg) {
    const active = activeSlot() === slot ? ' is-active' : '';
    return `<a class="flashcards-footer-nav__item${active}" href="${href}" aria-label="${label}">${svg}</a>`;
  }

  function injectFooter() {
    if (!footerInjectedPages.has(path)) return;
    if (document.querySelector('.flashcards-footer-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'flashcards-footer-nav';
    nav.dataset.shellPage = path === '/books' ? 'books' : 'default';
    nav.setAttribute('aria-label', 'Navegacao do flashcards');
    nav.innerHTML = [
      buildFooterItem('play', '/flashcards?view=play', 'Jogar', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.14v13.72a1 1 0 0 0 1.5.86l10-6.36a1 1 0 0 0 0-1.72l-10-6.36A1 1 0 0 0 8 5.14Z"/></svg>'),
      buildFooterItem('cards', '/allcards', 'Flashcards', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.6 2.5c.33 2.34 2.12 3.25 3.48 4.86 1.34 1.59 2 3.22 2 5.35 0 4.3-2.96 8.79-7.58 8.79-3.36 0-5.58-2.4-5.58-5.34 0-2.21 1.12-3.85 2.97-5.78 1.38-1.44 2.94-3.14 4.71-7.88Z"/></svg>'),
      buildFooterItem('users', '/users', 'Usuarios', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 3h10v2h2a2 2 0 0 1 2 2c0 3.32-2.47 6-5.57 6.4A5.99 5.99 0 0 1 13 17.83V20h4v2H7v-2h4v-2.17A5.99 5.99 0 0 1 8.57 13.4C5.47 13 3 10.32 3 7a2 2 0 0 1 2-2h2V3Zm-2 4c0 2.1 1.45 3.82 3.4 4.28A6 6 0 0 1 7 7V7H5Zm14 0h-2a6 6 0 0 1-1.4 4.28C17.55 10.82 19 9.1 19 7Z"/></svg>'),
      buildFooterItem('account', '/account', 'Perfil', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4.42 0-8 2.46-8 5.5 0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5 0-3.04-3.58-5.5-8-5.5Z"/></svg>'),
      buildFooterItem('books', '/books', 'Books', '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v15h-2V4H7.5a.5.5 0 0 0 0 1H16v12H7.5A2.5 2.5 0 0 1 5 14.5v-10Zm2.5 10.5H14V7H7.5a2.5 2.5 0 0 1-.5-.05v7.55a.5.5 0 0 0 .5.5Z"/></svg>')
    ].join('');
    document.body.appendChild(nav);
  }

  injectStars();
  injectFooter();
})();

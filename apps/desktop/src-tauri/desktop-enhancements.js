/**
 * Orivraa Desktop Enhancements
 * Injected into orivraa.com pages to make the desktop app feel native.
 * This script runs after every page load on orivraa.com domains.
 */
(function() {
  'use strict';

  // Prevent double injection
  if (window.__ORIVRAA_DESKTOP_ENHANCED__) return;
  window.__ORIVRAA_DESKTOP_ENHANCED__ = true;

  var TAURI = window.__TAURI_INTERNALS__;
  if (!TAURI) return;

  console.log('[Orivraa Desktop] Injecting desktop enhancements');

  // ─── 1. DISABLE BROWSER CONTEXT MENU (more native feel) ───
  document.addEventListener('contextmenu', function(e) {
    // Allow context menu on input/textarea for copy-paste
    var tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    e.preventDefault();
  });

  // ─── 2. DISABLE TEXT SELECTION ON UI ELEMENTS ───
  var style = document.createElement('style');
  style.id = 'orivraa-desktop-styles';
  style.textContent = [
    '/* Desktop app: disable text selection on UI, allow on content */',
    'body { -webkit-user-select: none; user-select: none; }',
    'input, textarea, [contenteditable="true"], pre, code, .selectable,',
    'td, th, p, span, h1, h2, h3, h4, h5, h6, li, dd, dt, blockquote { -webkit-user-select: text; user-select: text; }',
    '',
    '/* Desktop app: subtle scrollbar styling */',
    '::-webkit-scrollbar { width: 8px; height: 8px; }',
    '::-webkit-scrollbar-track { background: transparent; }',
    '::-webkit-scrollbar-thumb { background: rgba(212, 175, 55, 0.2); border-radius: 4px; }',
    '::-webkit-scrollbar-thumb:hover { background: rgba(212, 175, 55, 0.35); }',
    '',
    '/* Desktop auth overlay */',
    '#orivraa-desktop-auth-overlay {',
    '  position: fixed; inset: 0; z-index: 99999;',
    '  background: rgba(15, 23, 42, 0.92);',
    '  backdrop-filter: blur(8px);',
    '  display: flex; align-items: center; justify-content: center;',
    '  flex-direction: column; gap: 16px;',
    '  animation: fadeInOverlay 0.3s ease-out;',
    '}',
    '@keyframes fadeInOverlay {',
    '  from { opacity: 0; } to { opacity: 1; }',
    '}',
    '#orivraa-desktop-auth-overlay .auth-icon {',
    '  width: 64px; height: 64px; border-radius: 50%;',
    '  background: linear-gradient(135deg, #e5a31e, #f3dd99);',
    '  display: flex; align-items: center; justify-content: center;',
    '  font-size: 28px; margin-bottom: 8px;',
    '  animation: pulse 2s ease-in-out infinite;',
    '}',
    '@keyframes pulse {',
    '  0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.4); }',
    '  50% { box-shadow: 0 0 0 15px rgba(212,175,55,0); }',
    '}',
    '#orivraa-desktop-auth-overlay h2 {',
    '  color: #f3dd99; font-size: 20px; font-weight: 600;',
    '  letter-spacing: 0.5px; margin: 0;',
    '}',
    '#orivraa-desktop-auth-overlay p {',
    '  color: rgba(255,255,255,0.6); font-size: 14px;',
    '  text-align: center; max-width: 340px; line-height: 1.5; margin: 0;',
    '}',
    '#orivraa-desktop-auth-overlay button {',
    '  margin-top: 12px; padding: 10px 28px;',
    '  background: transparent; border: 1px solid rgba(212,175,55,0.3);',
    '  color: rgba(212,175,55,0.8); border-radius: 8px;',
    '  font-size: 13px; cursor: pointer; transition: all 0.2s;',
    '}',
    '#orivraa-desktop-auth-overlay button:hover {',
    '  background: rgba(212,175,55,0.1); border-color: rgba(212,175,55,0.5);',
    '  color: #f3dd99;',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  // ─── 3. INTERCEPT GOOGLE LOGIN → OPEN IN SYSTEM BROWSER ───
  function showBrowserAuthOverlay() {
    // Remove existing overlay if present
    var existing = document.getElementById('orivraa-desktop-auth-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'orivraa-desktop-auth-overlay';
    overlay.innerHTML = [
      '<div class="auth-icon">\uD83C\uDF10</div>',
      '<h2>Signing in with Google</h2>',
      '<p>Complete the sign-in in your browser. Your existing Google session will be used automatically.</p>',
      '<p style="color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 4px;">After signing in, return here and the app will update.</p>',
      '<button id="auth-overlay-dismiss">Use email &amp; password instead</button>',
    ].join('');
    document.body.appendChild(overlay);

    document.getElementById('auth-overlay-dismiss').addEventListener('click', function() {
      overlay.remove();
    });

    // Auto-dismiss after 60 seconds
    setTimeout(function() {
      if (overlay.parentNode) overlay.remove();
    }, 60000);
  }

  // Capture-phase listener to intercept Google login before React handles it
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('button');
    if (!btn) return;

    var text = (btn.textContent || btn.innerText || '').toLowerCase();
    // Match buttons containing "google" (the login/register Google buttons)
    if (text.includes('google') && TAURI) {
      e.stopPropagation();
      e.preventDefault();

      var isRegister = window.location.pathname.includes('register');
      var mode = isRegister ? 'register' : 'login';

      // Determine role from page context
      var role = 'CUSTOMER';
      // Check if shopkeeper tab is active
      var activeTab = document.querySelector('[data-state="active"]');
      if (activeTab) {
        var tabText = (activeTab.textContent || '').toLowerCase();
        if (tabText.includes('shop') || tabText.includes('seller') || tabText.includes('business')) {
          role = 'SHOPKEEPER';
        }
      }

      TAURI.invoke('open_google_auth', { role: role, mode: mode })
        .then(function() {
          showBrowserAuthOverlay();
        })
        .catch(function(err) {
          console.error('[Orivraa Desktop] Failed to open browser auth:', err);
          // Fallback: let the normal flow continue
          // We can't re-trigger the React handler, so show a message
          alert('Could not open browser. Please use email & password to sign in.');
        });

      return false;
    }
  }, true); // CAPTURE phase — fires before React's event delegation

  // ─── 4. KEYBOARD SHORTCUTS ───
  document.addEventListener('keydown', function(e) {
    // F5 or Ctrl+R to refresh
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
      e.preventDefault();
      window.location.reload();
    }

    // Ctrl+Shift+I to toggle devtools (only in debug builds)
    // F11 for fullscreen toggle
    if (e.key === 'F11') {
      e.preventDefault();
      TAURI.invoke('plugin:window|is_fullscreen').then(function(isFs) {
        TAURI.invoke('plugin:window|set_fullscreen', { value: !isFs });
      }).catch(function() {});
    }

    // Escape to close overlays
    if (e.key === 'Escape') {
      var overlay = document.getElementById('orivraa-desktop-auth-overlay');
      if (overlay) overlay.remove();
    }
  });

  // ─── 5. SMOOTH LINK HANDLING ───
  // Open external links in system browser, keep internal links in webview
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href');
    if (!href) return;

    // External links (not orivraa.com)
    if (href.startsWith('http') && !href.includes('orivraa.com')) {
      e.preventDefault();
      TAURI.invoke('open_external_url', { url: href }).catch(function() {
        // Fallback: open in webview
        window.open(href, '_blank');
      });
    }
  });

  // ─── 6. CONNECTIVITY INDICATOR ───
  var wasOnline = navigator.onLine;
  function updateConnectivityUI(online) {
    var existing = document.getElementById('orivraa-offline-banner');
    if (!online && !existing) {
      var banner = document.createElement('div');
      banner.id = 'orivraa-offline-banner';
      banner.style.cssText = [
        'position: fixed; top: 0; left: 0; right: 0; z-index: 99998;',
        'background: linear-gradient(90deg, #92400e, #b45309);',
        'color: white; text-align: center; padding: 6px 16px;',
        'font-size: 12px; font-weight: 500; letter-spacing: 0.5px;',
        'animation: fadeInOverlay 0.3s ease-out;',
      ].join('');
      banner.textContent = '\u26A0 You\'re offline \u2014 Changes will sync when you reconnect';
      document.body.appendChild(banner);
      document.body.style.paddingTop = '30px';
    } else if (online && existing) {
      existing.remove();
      document.body.style.paddingTop = '';
    }
  }

  window.addEventListener('online', function() { updateConnectivityUI(true); });
  window.addEventListener('offline', function() { updateConnectivityUI(false); });
  updateConnectivityUI(navigator.onLine);

  console.log('[Orivraa Desktop] Enhancements loaded successfully');
})();

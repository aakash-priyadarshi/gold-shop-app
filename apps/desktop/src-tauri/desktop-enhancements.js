/**
 * Orivraa Desktop Enhancements v2
 * Injected into orivraa.com pages to make the desktop app feel native.
 * Features:
 * - Google OAuth via system browser with token callback
 * - Token polling to complete auth flow
 * - Golden loading spinner replacement
 * - Update checking via Help menu and Ctrl+U
 * - Keyboard shortcuts, scrollbar, offline banner
 */
(function() {
  'use strict';

  if (window.__ORIVRAA_DESKTOP_ENHANCED__) return;
  window.__ORIVRAA_DESKTOP_ENHANCED__ = true;

  var TAURI = window.__TAURI_INTERNALS__;
  if (!TAURI) return;

  console.log('[Orivraa Desktop] Injecting desktop enhancements v2');

  // ─── DOM SAFETY PATCH ─────────────────────────────────
  // Monkey-patch removeChild/insertBefore to prevent React crashes when
  // this script (or Tauri internals) modifies DOM nodes that React tracks.
  // React's commit phase calls removeChild on nodes it expects to own;
  // if anything external moved/removed them first, React throws
  // "Failed to execute 'removeChild' on 'Node'". This patch catches
  // and suppresses that error gracefully.
  if (typeof Node !== 'undefined' && Node.prototype) {
    var _origRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function(child) {
      if (child && child.parentNode !== this) {
        // Node was already moved/removed by external code — return silently.
        return child;
      }
      return _origRemoveChild.apply(this, arguments);
    };

    var _origInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function(newNode, refNode) {
      if (refNode && refNode.parentNode !== this) {
        // Reference node no longer belongs to this parent — skip silently.
        return newNode;
      }
      return _origInsertBefore.apply(this, arguments);
    };
  }

  // ─── JWT HELPER — decode token payload for user info ───
  function parseJwtPayload(token) {
    try {
      var parts = token.split('.');
      if (parts.length !== 3) return null;
      var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(b64));
    } catch (e) { return null; }
  }

  // ─── STYLES ────────────────────────────────────────────
  var style = document.createElement('style');
  style.id = 'orivraa-desktop-styles';
  style.textContent = [
    '/* Desktop: disable text selection on UI, allow on content */',
    'body { -webkit-user-select: none; user-select: none; }',
    'input, textarea, [contenteditable="true"], pre, code, .selectable,',
    'td, th, p, span, h1, h2, h3, h4, h5, h6, li, dd, dt, blockquote { -webkit-user-select: text; user-select: text; }',
    '',
    '/* Gold scrollbars */',
    '::-webkit-scrollbar { width: 8px; height: 8px; }',
    '::-webkit-scrollbar-track { background: transparent; }',
    '::-webkit-scrollbar-thumb { background: rgba(212, 175, 55, 0.2); border-radius: 4px; }',
    '::-webkit-scrollbar-thumb:hover { background: rgba(212, 175, 55, 0.35); }',
    '',
    '/* ─── Golden Loading Spinner (replaces all loading indicators) ─── */',
    '@keyframes orivraaSpinRing { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }',
    '@keyframes orivraaShimmer {',
    '  0% { background-position: 200% center; }',
    '  100% { background-position: -200% center; }',
    '}',
    '.orivraa-golden-spinner {',
    '  display: inline-block; position: relative;',
    '  width: 40px; height: 40px;',
    '}',
    '.orivraa-golden-spinner::after {',
    '  content: ""; display: block;',
    '  width: 36px; height: 36px; margin: 2px;',
    '  border-radius: 50%;',
    '  border: 3px solid transparent;',
    '  border-top-color: #e5a31e;',
    '  border-right-color: #f3dd99;',
    '  animation: orivraaSpinRing 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite;',
    '}',
    '.orivraa-golden-spinner-sm { width: 20px; height: 20px; }',
    '.orivraa-golden-spinner-sm::after { width: 16px; height: 16px; margin: 2px; border-width: 2px; }',
    '.orivraa-golden-spinner-lg { width: 56px; height: 56px; }',
    '.orivraa-golden-spinner-lg::after { width: 48px; height: 48px; margin: 4px; border-width: 4px; }',
    '',
    '/* Auth overlay */',
    '#orivraa-desktop-auth-overlay {',
    '  position: fixed; inset: 0; z-index: 99999;',
    '  background: rgba(15, 23, 42, 0.92);',
    '  backdrop-filter: blur(8px);',
    '  display: flex; align-items: center; justify-content: center;',
    '  flex-direction: column; gap: 16px;',
    '  animation: fadeInOverlay 0.3s ease-out;',
    '}',
    '@keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }',
    '#orivraa-desktop-auth-overlay h2 { color: #f3dd99; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; margin: 0; }',
    '#orivraa-desktop-auth-overlay p { color: rgba(255,255,255,0.6); font-size: 14px; text-align: center; max-width: 340px; line-height: 1.5; margin: 0; }',
    '#orivraa-desktop-auth-overlay .auth-actions { display: flex; gap: 12px; margin-top: 8px; }',
    '#orivraa-desktop-auth-overlay button {',
    '  padding: 10px 24px; background: transparent; border: 1px solid rgba(212,175,55,0.3);',
    '  color: rgba(212,175,55,0.8); border-radius: 8px; font-size: 13px; cursor: pointer; transition: all 0.2s;',
    '}',
    '#orivraa-desktop-auth-overlay button:hover { background: rgba(212,175,55,0.1); border-color: rgba(212,175,55,0.5); color: #f3dd99; }',
    '',
    '/* Update panel */',
    '#orivraa-update-overlay {',
    '  position: fixed; inset: 0; z-index: 99995;',
    '  background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(6px);',
    '  display: flex; align-items: center; justify-content: center; padding: 24px;',
    '  animation: fadeInOverlay 0.25s ease-out;',
    '}',
    '#orivraa-update-panel {',
    '  width: min(440px, 100%); background: linear-gradient(160deg, #1a2744 0%, #0f172a 100%);',
    '  border: 1px solid rgba(212,175,55,0.28); border-radius: 16px;',
    '  box-shadow: 0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(212,175,55,0.08) inset;',
    '  overflow: hidden; animation: slideUp 0.35s ease-out;',
    '}',
    '#orivraa-update-panel .panel-header {',
    '  padding: 20px 22px 14px; border-bottom: 1px solid rgba(255,255,255,0.06);',
    '  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;',
    '}',
    '#orivraa-update-panel .panel-title { color: #f3dd99; font-size: 18px; font-weight: 600; margin: 0; }',
    '#orivraa-update-panel .panel-subtitle { color: rgba(255,255,255,0.5); font-size: 12px; margin: 4px 0 0; }',
    '#orivraa-update-panel .panel-close {',
    '  background: transparent; border: none; color: rgba(255,255,255,0.45);',
    '  font-size: 20px; line-height: 1; cursor: pointer; padding: 2px 6px; border-radius: 6px;',
    '}',
    '#orivraa-update-panel .panel-close:hover { color: #f3dd99; background: rgba(212,175,55,0.08); }',
    '#orivraa-update-panel .panel-body { padding: 18px 22px 22px; }',
    '#orivraa-update-panel .status-pill {',
    '  display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px;',
    '  border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.3px;',
    '  margin-bottom: 14px;',
    '}',
    '#orivraa-update-panel .status-pill.ok { background: rgba(34,197,94,0.12); color: #4ade80; }',
    '#orivraa-update-panel .status-pill.warn { background: rgba(229,163,30,0.15); color: #f3dd99; }',
    '#orivraa-update-panel .status-pill.info { background: rgba(147,197,253,0.12); color: #93c5fd; }',
    '#orivraa-update-panel .release-notes {',
    '  color: rgba(255,255,255,0.62); font-size: 13px; line-height: 1.55;',
    '  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);',
    '  border-radius: 10px; padding: 12px 14px; margin: 0 0 16px; max-height: 120px; overflow: auto;',
    '}',
    '#orivraa-update-panel .version-row {',
    '  display: flex; justify-content: space-between; gap: 12px;',
    '  font-size: 12px; color: rgba(255,255,255,0.45); margin-bottom: 16px;',
    '}',
    '#orivraa-update-panel .version-row strong { color: rgba(255,255,255,0.82); font-weight: 600; }',
    '#orivraa-update-panel .progress-block { margin: 8px 0 16px; }',
    '#orivraa-update-panel .progress-bar {',
    '  width: 100%; height: 8px; background: rgba(255,255,255,0.08);',
    '  border-radius: 999px; overflow: hidden;',
    '}',
    '#orivraa-update-panel .progress-fill {',
    '  height: 100%; width: 0%; background: linear-gradient(90deg, #e5a31e, #f3dd99);',
    '  border-radius: 999px; transition: width 0.25s ease-out;',
    '}',
    '#orivraa-update-panel .progress-meta {',
    '  display: flex; justify-content: space-between; margin-top: 8px;',
    '  font-size: 11px; color: rgba(255,255,255,0.45);',
    '}',
    '#orivraa-update-panel .panel-actions { display: flex; gap: 10px; flex-wrap: wrap; }',
    '#orivraa-update-panel button {',
    '  border: none; border-radius: 8px; padding: 10px 16px; font-size: 13px;',
    '  cursor: pointer; transition: all 0.2s; font-weight: 600;',
    '}',
    '#orivraa-update-panel button:disabled { opacity: 0.55; cursor: not-allowed; }',
    '#orivraa-update-panel .btn-primary {',
    '  background: linear-gradient(135deg, #e5a31e, #c9942a); color: #0f172a;',
    '}',
    '#orivraa-update-panel .btn-primary:hover:not(:disabled) {',
    '  background: linear-gradient(135deg, #f3dd99, #e5a31e);',
    '}',
    '#orivraa-update-panel .btn-secondary {',
    '  background: transparent; color: rgba(255,255,255,0.72);',
    '  border: 1px solid rgba(255,255,255,0.16);',
    '}',
    '#orivraa-update-panel .btn-secondary:hover:not(:disabled) {',
    '  border-color: rgba(212,175,55,0.35); color: #f3dd99;',
    '}',
    '#orivraa-update-panel .panel-hint {',
    '  margin-top: 12px; font-size: 11px; color: rgba(255,255,255,0.38); line-height: 1.45;',
    '}',
    '/* Floating update badge */',
    '#orivraa-update-badge {',
    '  position: fixed; bottom: 22px; right: 22px; z-index: 99990;',
    '  display: inline-flex; align-items: center; gap: 8px;',
    '  padding: 10px 14px; border-radius: 999px;',
    '  background: linear-gradient(135deg, #1a2744, #0f172a);',
    '  border: 1px solid rgba(212,175,55,0.35); color: #f3dd99;',
    '  font-size: 12px; font-weight: 600; cursor: pointer;',
    '  box-shadow: 0 8px 28px rgba(0,0,0,0.35);',
    '  animation: orivraaUpdatePulse 2.2s ease-in-out infinite;',
    '}',
    '#orivraa-update-badge:hover { transform: translateY(-1px); }',
    '@keyframes orivraaUpdatePulse {',
    '  0%, 100% { box-shadow: 0 8px 28px rgba(0,0,0,0.35); }',
    '  50% { box-shadow: 0 8px 28px rgba(212,175,55,0.25), 0 0 0 6px rgba(212,175,55,0.08); }',
    '}',
    '@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }',
  ].join('\n');
  document.head.appendChild(style);

  // ─── 1. GOLDEN SPINNERS VIA CSS-ONLY (no DOM replacement) ───
  // Previous approach replaced React-managed DOM nodes, breaking reconciliation.
  // Now we use pure CSS to restyle animate-spin elements as golden spinners.
  var spinnerOverrideStyle = document.createElement('style');
  spinnerOverrideStyle.id = 'orivraa-spinner-override';
  spinnerOverrideStyle.textContent = [
    '/* Override Tailwind animate-spin with golden spinner */',
    '.animate-spin, [class*="animate-spin"] {',
    '  color: transparent !important;',
    '  background: transparent !important;',
    '  border-color: transparent !important;',
    '  border-top-color: #e5a31e !important;',
    '  border-right-color: #f3dd99 !important;',
    '  border-radius: 50% !important;',
    '  animation: orivraaSpinRing 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite !important;',
    '}',
    '.animate-spin > *, [class*="animate-spin"] > * {',
    '  visibility: hidden !important;',
    '}',
    '',
    '/* Override Tailwind animate-pulse small loading indicators */',
    '.animate-pulse {',
    '  background: linear-gradient(90deg, transparent 25%, rgba(212,175,55,0.1) 50%, transparent 75%) !important;',
    '  background-size: 200% 100% !important;',
    '  animation: orivraaShimmer 1.5s ease-in-out infinite !important;',
    '}',
  ].join('\n');
  document.head.appendChild(spinnerOverrideStyle);

  // ─── 2. DISABLE BROWSER CONTEXT MENU ───
  document.addEventListener('contextmenu', function(e) {
    var tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    e.preventDefault();
  });

  // ─── 3. GOOGLE OAUTH → SYSTEM BROWSER + TOKEN POLLING ───
  var authPollingInterval = null;

  function showBrowserAuthOverlay() {
    var existing = document.getElementById('orivraa-desktop-auth-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'orivraa-desktop-auth-overlay';
    overlay.innerHTML = [
      '<div class="orivraa-golden-spinner orivraa-golden-spinner-lg" style="margin-bottom: 16px;"></div>',
      '<h2>Signing in with Google</h2>',
      '<p>Your default browser has opened. Complete the sign-in there — your existing Google session will be used automatically.</p>',
      '<p style="color: rgba(255,255,255,0.35); font-size: 11px; margin-top: 4px;">The app will update automatically once sign-in completes.</p>',
      '<div class="auth-actions">',
      '  <button id="auth-overlay-dismiss">Use email & password</button>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    document.getElementById('auth-overlay-dismiss').addEventListener('click', function() {
      stopAuthPolling();
      overlay.remove();
    });
  }

  function startAuthPolling() {
    stopAuthPolling();
    console.log('[Orivraa Desktop] Starting auth token polling');

    authPollingInterval = setInterval(function() {
      TAURI.invoke('poll_auth_tokens').then(function(result) {
        if (result) {
          console.log('[Orivraa Desktop] Auth tokens received from browser!');
          stopAuthPolling();

          // Store tokens in web localStorage too (for the web app session)
          try {
            localStorage.setItem('token', result.access_token);
            localStorage.setItem('refreshToken', result.refresh_token);
          } catch (e) {}

          // Remove overlay
          var overlay = document.getElementById('orivraa-desktop-auth-overlay');
          if (overlay) overlay.remove();

          // Navigate to dashboard
          window.location.href = 'https://www.orivraa.com/auth/oauth-callback?accessToken=' +
            encodeURIComponent(result.access_token) +
            '&refreshToken=' + encodeURIComponent(result.refresh_token);
        }
      }).catch(function(err) {
        console.warn('[Orivraa Desktop] Token poll error:', err);
      });
    }, 1500); // Poll every 1.5 seconds

    // Auto-stop after 5 minutes
    setTimeout(function() {
      if (authPollingInterval) {
        stopAuthPolling();
        var overlay = document.getElementById('orivraa-desktop-auth-overlay');
        if (overlay) overlay.remove();
      }
    }, 300000);
  }

  function stopAuthPolling() {
    if (authPollingInterval) {
      clearInterval(authPollingInterval);
      authPollingInterval = null;
    }
  }

  // Intercept Google login buttons
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('button');
    if (!btn) return;

    var text = (btn.textContent || btn.innerText || '').toLowerCase();
    if (text.includes('google') && TAURI) {
      e.stopPropagation();
      e.preventDefault();

      var isRegister = window.location.pathname.includes('register');
      var mode = isRegister ? 'register' : 'login';

      var role = 'CUSTOMER';
      var activeTab = document.querySelector('[data-state="active"]');
      if (activeTab) {
        var tabText = (activeTab.textContent || '').toLowerCase();
        if (tabText.includes('shop') || tabText.includes('seller') || tabText.includes('business')) {
          role = 'SHOPKEEPER';
        }
      }

      TAURI.invoke('open_google_auth', { role: role, mode: mode })
        .then(function(port) {
          console.log('[Orivraa Desktop] Auth server on port', port);
          showBrowserAuthOverlay();
          startAuthPolling();
        })
        .catch(function(err) {
          console.error('[Orivraa Desktop] Failed to open browser auth:', err);
          alert('Could not open browser. Please use email & password to sign in.');
        });

      return false;
    }
  }, true);

  // ─── 4. KEYBOARD SHORTCUTS ───
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
      e.preventDefault();
      window.location.reload();
    }
    if (e.key === 'F11') {
      e.preventDefault();
      TAURI.invoke('plugin:window|is_fullscreen').then(function(isFs) {
        TAURI.invoke('plugin:window|set_fullscreen', { value: !isFs });
      }).catch(function() {});
    }
    if (e.key === 'Escape') {
      var overlay = document.getElementById('orivraa-desktop-auth-overlay');
      if (overlay) { stopAuthPolling(); overlay.remove(); }
      closeUpdatePanel();
    }
    // Ctrl+U — Check for updates
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      openUpdatePanel();
    }
  });

  // ─── 5. EXTERNAL LINK HANDLING ───
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href) return;
    if (href.startsWith('http') && !href.includes('orivraa.com')) {
      e.preventDefault();
      TAURI.invoke('open_external_url', { url: href }).catch(function() {
        window.open(href, '_blank');
      });
    }
  });

  // ─── 6. CONNECTIVITY INDICATOR ───
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

  // ─── 7. UPDATE PANEL ───
  var updateState = {
    currentVersion: 'unknown',
    availableInfo: null,
    downloadReady: false,
    pendingVersion: null,
    panelOpen: false,
    checking: false,
    downloading: false,
    progressPercent: 0,
  };

  function refreshUpdateStatus() {
    return TAURI.invoke('get_update_status').then(function(raw) {
      try {
        var status = JSON.parse(raw);
        updateState.currentVersion = status.currentVersion || updateState.currentVersion;
        updateState.downloadReady = !!status.downloadReady;
        updateState.pendingVersion = status.pendingVersion || null;
      } catch (e) {}
    }).catch(function() {});
  }

  function closeUpdatePanel() {
    var overlay = document.getElementById('orivraa-update-overlay');
    if (overlay) overlay.remove();
    updateState.panelOpen = false;
  }

  function showUpdateBadge(info) {
    if (updateState.panelOpen) return;
    var existing = document.getElementById('orivraa-update-badge');
    if (existing) return;

    var badge = document.createElement('button');
    badge.id = 'orivraa-update-badge';
    badge.type = 'button';
    badge.innerHTML = [
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">',
      '  <path d="M12 4V2L8 6l4 4V8c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 17.03 20 15.57 20 14c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v2l4-4-4-4v2z"/>',
      '</svg>',
      '<span>Update v' + (info && info.version ? info.version : 'available') + '</span>',
    ].join('');
    badge.addEventListener('click', function() {
      openUpdatePanel(info);
    });
    document.body.appendChild(badge);
  }

  function hideUpdateBadge() {
    var badge = document.getElementById('orivraa-update-badge');
    if (badge) badge.remove();
  }

  function renderUpdatePanelContent(container) {
    var info = updateState.availableInfo;
    var isUpToDate = !info && !updateState.downloadReady && !updateState.checking;
    var statusClass = 'info';
    var statusText = 'Checking for updates...';

    if (updateState.checking) {
      statusText = 'Checking for updates...';
    } else if (updateState.downloading) {
      statusClass = 'warn';
      statusText = 'Downloading update...';
    } else if (updateState.downloadReady) {
      statusClass = 'ok';
      statusText = 'Ready to install';
    } else if (info && info.version) {
      statusClass = 'warn';
      statusText = 'Update available';
    } else if (isUpToDate) {
      statusClass = 'ok';
      statusText = 'You are up to date';
    }

    var notes = '';
    if (info && info.body) {
      notes = '<div class="release-notes">' + escapeHtml(info.body.substring(0, 400)) + '</div>';
    } else if (updateState.downloadReady) {
      notes = '<div class="release-notes">The update has been downloaded in the background. Restart to apply it — no installer wizard needed.</div>';
    } else if (!info && !updateState.checking) {
      notes = '<div class="release-notes">Updates download silently in the background. When ready, restart the app to apply them.</div>';
    }

    var progressBlock = '';
    if (updateState.downloading || updateState.downloadReady) {
      progressBlock = [
        '<div class="progress-block">',
        '  <div class="progress-bar"><div class="progress-fill" style="width:' + updateState.progressPercent + '%"></div></div>',
        '  <div class="progress-meta">',
        '    <span>' + (updateState.downloading ? 'Downloading...' : 'Download complete') + '</span>',
        '    <span>' + updateState.progressPercent + '%</span>',
        '  </div>',
        '</div>',
      ].join('');
    }

    var primaryLabel = 'Check for Updates';
    var primaryAction = 'check';
    var primaryDisabled = updateState.checking || updateState.downloading;

    if (updateState.downloadReady) {
      primaryLabel = 'Restart & Install';
      primaryAction = 'install';
    } else if (info && info.version) {
      primaryLabel = 'Download Update';
      primaryAction = 'download';
    } else if (!updateState.checking) {
      primaryLabel = 'Check Again';
      primaryAction = 'check';
    }

    container.innerHTML = [
      '<div class="status-pill ' + statusClass + '">' + statusText + '</div>',
      '<div class="version-row">',
      '  <span>Installed</span><strong>v' + escapeHtml(updateState.currentVersion) + '</strong>',
      '</div>',
      info && info.version ? (
        '<div class="version-row"><span>Latest</span><strong>v' + escapeHtml(info.version) + '</strong></div>'
      ) : '',
      notes,
      progressBlock,
      '<div class="panel-actions">',
      '  <button class="btn-primary" id="orivraa-update-primary" data-action="' + primaryAction + '"' + (primaryDisabled ? ' disabled' : '') + '>' + primaryLabel + '</button>',
      '  <button class="btn-secondary" id="orivraa-update-later">Close</button>',
      '</div>',
      '<p class="panel-hint">Tip: Help → Check for Updates, or press Ctrl+U. Use Help → Download Update to fetch in the background.</p>',
    ].join('');

    document.getElementById('orivraa-update-later').addEventListener('click', closeUpdatePanel);
    document.getElementById('orivraa-update-primary').addEventListener('click', function() {
      var action = this.getAttribute('data-action');
      if (action === 'check') checkForUpdates(true);
      else if (action === 'download') downloadUpdate();
      else if (action === 'install') installPendingUpdate();
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openUpdatePanel(prefillInfo) {
    if (prefillInfo) updateState.availableInfo = prefillInfo;
    updateState.panelOpen = true;
    hideUpdateBadge();

    var existing = document.getElementById('orivraa-update-overlay');
    if (existing) {
      renderUpdatePanelContent(document.getElementById('orivraa-update-body'));
      if (!prefillInfo && !updateState.checking) checkForUpdates(false);
      return;
    }

    var overlay = document.createElement('div');
    overlay.id = 'orivraa-update-overlay';
    overlay.innerHTML = [
      '<div id="orivraa-update-panel" role="dialog" aria-modal="true" aria-label="Software updates">',
      '  <div class="panel-header">',
      '    <div>',
      '      <h3 class="panel-title">Software Updates</h3>',
      '      <p class="panel-subtitle">Orivraa Desktop</p>',
      '    </div>',
      '    <button class="panel-close" id="orivraa-update-close" aria-label="Close">&times;</button>',
      '  </div>',
      '  <div class="panel-body" id="orivraa-update-body"></div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeUpdatePanel();
    });
    document.getElementById('orivraa-update-close').addEventListener('click', closeUpdatePanel);

    renderUpdatePanelContent(document.getElementById('orivraa-update-body'));
    refreshUpdateStatus().then(function() {
      var body = document.getElementById('orivraa-update-body');
      if (body) renderUpdatePanelContent(body);
    });

    if (!prefillInfo && !updateState.checking) {
      checkForUpdates(false);
    }
  }

  function checkForUpdates(openPanel) {
    if (openPanel && !updateState.panelOpen) openUpdatePanel();
    updateState.checking = true;

    var body = document.getElementById('orivraa-update-body');
    if (body) renderUpdatePanelContent(body);

    return TAURI.invoke('check_for_updates').then(function(result) {
      updateState.checking = false;
      if (result) {
        updateState.availableInfo = JSON.parse(result);
        showUpdateBadge(updateState.availableInfo);
      } else {
        updateState.availableInfo = null;
        hideUpdateBadge();
        if (!openPanel) showToast('You\'re on the latest version');
      }
      var panelBody = document.getElementById('orivraa-update-body');
      if (panelBody) renderUpdatePanelContent(panelBody);
    }).catch(function(err) {
      updateState.checking = false;
      console.warn('[Orivraa Desktop] Update check failed:', err);
      showToast('Could not check for updates');
      var panelBody = document.getElementById('orivraa-update-body');
      if (panelBody) renderUpdatePanelContent(panelBody);
    });
  }

  function downloadUpdate() {
    updateState.downloading = true;
    updateState.progressPercent = 0;
    var body = document.getElementById('orivraa-update-body');
    if (body) renderUpdatePanelContent(body);

    return TAURI.invoke('download_update').then(function(version) {
      updateState.downloading = false;
      updateState.downloadReady = true;
      updateState.pendingVersion = version;
      updateState.progressPercent = 100;
      hideUpdateBadge();
      var panelBody = document.getElementById('orivraa-update-body');
      if (panelBody) renderUpdatePanelContent(panelBody);
      showToast('Update downloaded — ready to install');
    }).catch(function(err) {
      updateState.downloading = false;
      showToast('Download failed: ' + err);
      var panelBody = document.getElementById('orivraa-update-body');
      if (panelBody) renderUpdatePanelContent(panelBody);
    });
  }

  function installPendingUpdate() {
    return TAURI.invoke('install_pending_update').catch(function(err) {
      return TAURI.invoke('install_update').catch(function(err2) {
        showToast('Install failed: ' + (err2 || err));
      });
    });
  }

  function handleUpdateProgress(data) {
    if (!data) return;

    if (data.status === 'downloading') {
      updateState.downloading = true;
      updateState.progressPercent = data.percent || 0;
      if (!updateState.panelOpen && (data.percent || 0) < 5) {
        showToast('Downloading update v' + (data.version || '') + '...');
      }
    } else if (data.status === 'ready') {
      updateState.downloading = false;
      updateState.downloadReady = true;
      updateState.pendingVersion = data.version;
      updateState.progressPercent = 100;
      hideUpdateBadge();
    } else if (data.status === 'installing' || data.status === 'installed') {
      updateState.downloading = false;
      updateState.progressPercent = 100;
    }

    var body = document.getElementById('orivraa-update-body');
    if (body) renderUpdatePanelContent(body);
  }

  if (TAURI && TAURI.event && TAURI.event.listen) {
    TAURI.event.listen('orivraa-update-available', function(event) {
      var info = event.payload;
      if (info && info.version) {
        updateState.availableInfo = info;
        showUpdateBadge(info);
      }
    });

    TAURI.event.listen('orivraa-update-progress', function(event) {
      handleUpdateProgress(event.payload);
    });

    TAURI.event.listen('orivraa-menu-action', function(event) {
      var action = event.payload;
      if (action === 'open-update-panel') openUpdatePanel();
      else if (action === 'download-update') {
        openUpdatePanel();
        downloadUpdate();
      } else if (action === 'install-update') {
        openUpdatePanel();
        installPendingUpdate();
      } else if (action === 'reload') window.location.reload();
      else if (action === 'toggle-fullscreen') {
        TAURI.invoke('plugin:window|is_fullscreen').then(function(isFs) {
          TAURI.invoke('plugin:window|set_fullscreen', { value: !isFs });
        }).catch(function() {});
      }
    });
  }

  refreshUpdateStatus();
  TAURI.invoke('get_app_version').then(function(version) {
    if (version) updateState.currentVersion = version;
  }).catch(function() {});

  setTimeout(function() {
    checkForUpdates(false).then(function() {
      if (updateState.availableInfo) showUpdateBadge(updateState.availableInfo);
    });
  }, 12000);

  function showToast(message) {
    var toast = document.createElement('div');
    toast.style.cssText = [
      'position: fixed; bottom: 20px; right: 20px; z-index: 99990;',
      'background: #1a2744; border: 1px solid rgba(212,175,55,0.2);',
      'color: rgba(255,255,255,0.7); padding: 10px 18px;',
      'border-radius: 8px; font-size: 13px;',
      'animation: slideUp 0.3s ease-out;',
      'box-shadow: 0 4px 16px rgba(0,0,0,0.3);',
    ].join('');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  // ─── 8. APP VERSION ───────────────────────────────────
  // Store version for use in crash reports / UI, but do NOT modify
  // document.title — Next.js manages <title> via React's reconciler,
  // and changing it externally causes "removeChild" crashes on every
  // page navigation.
  var desktopAppVersion = 'unknown';
  TAURI.invoke('get_app_version').then(function(version) {
    if (version) {
      desktopAppVersion = version;
      console.log('[Orivraa Desktop] App version:', version);
    }
  }).catch(function() {});

  // ─── 9. HEARTBEAT — report version to server periodically ───
  function sendHeartbeat() {
    TAURI.invoke('send_heartbeat').then(function(resp) {
      try {
        var data = JSON.parse(resp);
        if (data.isLatest === false && data.latestVersion) {
          console.log('[Orivraa Desktop] Not on latest version. Latest:', data.latestVersion);
        }
      } catch(e) {}
    }).catch(function() {});
  }
  // Send heartbeat after 15s, then every 30 minutes
  setTimeout(sendHeartbeat, 15000);
  setInterval(sendHeartbeat, 1800000);

  // ─── 10. CLIENT-SIDE ERROR RECOVERY ───
  // Detect "Application error" crash screens and offer recovery options.
  // Next.js shows a full-screen error when an unhandled client exception occurs.
  // Without this, the desktop app becomes completely stuck with no navigation.

  var crashObserver = null;
  var crashBannerShown = false;

  // Track the last captured error for crash reporting
  var lastCapturedError = null;

  function detectCrashScreen() {
    // Next.js error overlay contains "Application error" text
    var body = document.body;
    if (!body) return false;

    // Check for Next.js production error page
    var hasError = body.textContent && body.textContent.indexOf('Application error') !== -1;
    // Also check for the Next.js error digest element
    if (!hasError) {
      hasError = !!document.getElementById('__next-error');
    }
    // Also check for our own error boundary
    if (!hasError) {
      hasError = body.textContent && body.textContent.indexOf('Something went wrong') !== -1
        && body.textContent.indexOf('Try again') !== -1;
    }
    return hasError;
  }

  function showCrashRecoveryBanner() {
    if (crashBannerShown) return;
    crashBannerShown = true;

    var banner = document.createElement('div');
    banner.id = 'orivraa-crash-recovery';
    banner.style.cssText = [
      'position: fixed; bottom: 0; left: 0; right: 0; z-index: 99999;',
      'background: linear-gradient(135deg, #1a2744, #0f172a);',
      'border-top: 1px solid rgba(212,175,55,0.3);',
      'padding: 14px 20px;',
      'display: flex; align-items: center; justify-content: space-between;',
      'gap: 12px; flex-wrap: wrap;',
      'box-shadow: 0 -4px 24px rgba(0,0,0,0.4);',
      'animation: slideUp 0.3s ease-out;',
    ].join('');
    banner.innerHTML = [
      '<div style="flex:1; min-width: 200px;">',
      '  <div style="color: #f3dd99; font-size: 14px; font-weight: 600; margin-bottom: 2px;">',
      '    \u26A0 This page encountered an error',
      '  </div>',
      '  <div style="color: rgba(255,255,255,0.5); font-size: 12px;">',
      '    You can navigate away or reload to continue using the app.',
      '  </div>',
      '</div>',
      '<div style="display: flex; gap: 8px; flex-shrink: 0;">',
      '  <button id="crash-go-home" style="padding:8px 18px; background:linear-gradient(135deg,#e5a31e,#c9942a); color:#0f172a; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Go Home</button>',
      '  <button id="crash-go-back" style="padding:8px 18px; background:transparent; color:rgba(212,175,55,0.8); border:1px solid rgba(212,175,55,0.3); border-radius:6px; font-size:12px; cursor:pointer;">Go Back</button>',
      '  <button id="crash-reload" style="padding:8px 18px; background:transparent; color:rgba(255,255,255,0.5); border:1px solid rgba(255,255,255,0.15); border-radius:6px; font-size:12px; cursor:pointer;">Reload</button>',
      '  <button id="crash-report" style="padding:8px 18px; background:transparent; color:#93c5fd; border:1px solid rgba(147,197,253,0.3); border-radius:6px; font-size:12px; cursor:pointer;">\uD83D\uDEE1 Report Error</button>',
      '</div>',
    ].join('');
    document.body.appendChild(banner);

    document.getElementById('crash-go-home').addEventListener('click', function() {
      window.location.href = 'https://www.orivraa.com/';
    });
    document.getElementById('crash-go-back').addEventListener('click', function() {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'https://www.orivraa.com/';
      }
    });
    document.getElementById('crash-reload').addEventListener('click', function() {
      window.location.reload();
    });

    document.getElementById('crash-report').addEventListener('click', function() {
      var btn = document.getElementById('crash-report');
      if (!btn || btn.dataset.sent === 'true') return;
      btn.textContent = 'Sending...';
      btn.style.opacity = '0.6';

      var userRole = 'guest';
      var userId = null;
      try {
        var token = localStorage.getItem('token');
        if (token) {
          var payload = parseJwtPayload(token);
          if (payload) {
            userRole = payload.role || 'guest';
            userId = payload.sub || null;
          }
        }
      } catch(e) {}

      var errorInfo = lastCapturedError || {
        message: 'Desktop crash detected (no error object captured)',
        stack: '',
        timestamp: new Date().toISOString(),
      };

      setTimeout(function() {
        var authToken = null;
        try { authToken = localStorage.getItem('token'); } catch(e) {}

        var headers = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = 'Bearer ' + authToken;

        fetch('https://api.orivraa.com/api/crash-reports', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            errorMessage: errorInfo.message,
            errorStack: errorInfo.stack,
            page: window.location.pathname + window.location.search,
            userAction: 'Desktop app crash on page: ' + window.location.pathname,
            platform: 'desktop',
            userRole: userRole,
            userId: userId,
            userAgent: navigator.userAgent,
            appVersion: desktopAppVersion,
          }),
        }).then(function() {
          btn.textContent = 'Reported \u2713';
          btn.style.color = '#4ade80';
          btn.style.borderColor = 'rgba(34,197,94,0.3)';
          btn.style.opacity = '1';
          btn.dataset.sent = 'true';
        }).catch(function() {
          btn.textContent = 'Failed - Retry';
          btn.style.color = '#f87171';
          btn.style.borderColor = 'rgba(248,113,113,0.3)';
          btn.style.opacity = '1';
        });
      }, 100);
    });
  }

  function removeCrashRecoveryBanner() {
    var existing = document.getElementById('orivraa-crash-recovery');
    if (existing) {
      existing.remove();
      crashBannerShown = false;
    }
  }

  // Watch for crash screens via DOM mutation observer
  function startCrashDetection() {
    if (crashObserver) return;

    // Check immediately
    if (detectCrashScreen()) {
      showCrashRecoveryBanner();
    }

    crashObserver = new MutationObserver(function() {
      if (detectCrashScreen()) {
        showCrashRecoveryBanner();
      } else {
        removeCrashRecoveryBanner();
      }
    });

    crashObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // Also catch unhandled errors globally and show recovery
  window.addEventListener('error', function(event) {
    console.error('[Orivraa Desktop] Unhandled error:', event.error || event.message);
    lastCapturedError = {
      message: (event.error && event.error.message) || event.message || 'Unknown error',
      stack: (event.error && event.error.stack) || '',
      timestamp: new Date().toISOString(),
    };
    // Give Next.js error boundary time to render, then check
    setTimeout(function() {
      if (detectCrashScreen()) {
        showCrashRecoveryBanner();
      }
    }, 500);
  });

  window.addEventListener('unhandledrejection', function(event) {
    console.error('[Orivraa Desktop] Unhandled promise rejection:', event.reason);
    var reason = event.reason;
    lastCapturedError = {
      message: (reason && reason.message) || String(reason) || 'Unhandled promise rejection',
      stack: (reason && reason.stack) || '',
      timestamp: new Date().toISOString(),
    };
    setTimeout(function() {
      if (detectCrashScreen()) {
        showCrashRecoveryBanner();
      }
    }, 500);
  });

  // Start crash detection after a short delay (page needs to load first)
  setTimeout(startCrashDetection, 1000);

  console.log('[Orivraa Desktop] Enhancements v2 loaded successfully');
})();

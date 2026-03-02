/**
 * Orivraa Desktop Enhancements v2
 * Injected into orivraa.com pages to make the desktop app feel native.
 * Features:
 * - Google OAuth via system browser with token callback
 * - Token polling to complete auth flow
 * - Golden loading spinner replacement
 * - Update checking from system menu
 * - Keyboard shortcuts, scrollbar, offline banner
 */
(function() {
  'use strict';

  if (window.__ORIVRAA_DESKTOP_ENHANCED__) return;
  window.__ORIVRAA_DESKTOP_ENHANCED__ = true;

  var TAURI = window.__TAURI_INTERNALS__;
  if (!TAURI) return;

  console.log('[Orivraa Desktop] Injecting desktop enhancements v2');

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
    '/* Update banner */',
    '#orivraa-update-banner {',
    '  position: fixed; bottom: 20px; right: 20px; z-index: 99990;',
    '  background: linear-gradient(135deg, #1a2744, #0f172a);',
    '  border: 1px solid rgba(212,175,55,0.3); border-radius: 12px;',
    '  padding: 16px 20px; max-width: 340px;',
    '  box-shadow: 0 8px 32px rgba(0,0,0,0.4);',
    '  animation: slideUp 0.4s ease-out;',
    '}',
    '@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }',
    '#orivraa-update-banner h4 { color: #f3dd99; font-size: 14px; margin: 0 0 4px; }',
    '#orivraa-update-banner p { color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 12px; line-height: 1.4; }',
    '#orivraa-update-banner .update-actions { display: flex; gap: 8px; }',
    '#orivraa-update-banner button { padding: 6px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s; border: none; }',
    '#orivraa-update-banner .btn-update { background: linear-gradient(135deg, #e5a31e, #c9942a); color: #0f172a; font-weight: 600; }',
    '#orivraa-update-banner .btn-update:hover { background: linear-gradient(135deg, #f3dd99, #e5a31e); }',
    '#orivraa-update-banner .btn-later { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.5); }',
    '#orivraa-update-banner .btn-later:hover { border-color: rgba(255,255,255,0.4); color: rgba(255,255,255,0.8); }',
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
      var updateBanner = document.getElementById('orivraa-update-banner');
      if (updateBanner) updateBanner.remove();
    }
    // Ctrl+U — Check for updates
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      checkForUpdates();
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

  // ─── 7. UPDATE CHECKER ───
  function checkForUpdates() {
    TAURI.invoke('check_for_updates').then(function(result) {
      if (result) {
        var info = JSON.parse(result);
        showUpdateBanner(info);
      } else {
        // No update available — show brief notification
        showToast('You\'re on the latest version');
      }
    }).catch(function(err) {
      console.warn('[Orivraa Desktop] Update check failed:', err);
      showToast('Could not check for updates');
    });
  }

  function showUpdateBanner(info) {
    var existing = document.getElementById('orivraa-update-banner');
    if (existing) existing.remove();

    var banner = document.createElement('div');
    banner.id = 'orivraa-update-banner';
    banner.innerHTML = [
      '<h4>\u2728 Update Available — v' + (info.version || 'new') + '</h4>',
      '<p>' + (info.body ? info.body.substring(0, 150) : 'A new version of Orivraa Desktop is available.') + '</p>',
      '<div class="update-actions">',
      '  <button class="btn-update" id="update-install-btn">Update Now</button>',
      '  <button class="btn-later" id="update-later-btn">Later</button>',
      '</div>',
    ].join('');
    document.body.appendChild(banner);

    document.getElementById('update-install-btn').addEventListener('click', function() {
      this.textContent = 'Downloading...';
      this.disabled = true;
      TAURI.invoke('install_update').catch(function(err) {
        showToast('Update failed: ' + err);
        banner.remove();
      });
    });

    document.getElementById('update-later-btn').addEventListener('click', function() {
      banner.remove();
    });
  }

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

  // Check for updates on startup (with delay)
  setTimeout(function() {
    TAURI.invoke('check_for_updates').then(function(result) {
      if (result) {
        var info = JSON.parse(result);
        showUpdateBanner(info);
      }
    }).catch(function() {});
  }, 10000); // 10s after page load

  // ─── 8. APP VERSION IN WINDOW TITLE ───
  TAURI.invoke('get_app_version').then(function(version) {
    if (version) {
      document.title = document.title.replace(/Orivraa/, 'Orivraa v' + version);
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
    // Give Next.js error boundary time to render, then check
    setTimeout(function() {
      if (detectCrashScreen()) {
        showCrashRecoveryBanner();
      }
    }, 500);
  });

  window.addEventListener('unhandledrejection', function(event) {
    console.error('[Orivraa Desktop] Unhandled promise rejection:', event.reason);
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

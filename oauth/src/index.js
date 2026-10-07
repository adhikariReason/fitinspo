/**
 * OAuth proxy for Decap CMS, as a Cloudflare Worker.
 *
 * Decap's GitHub backend needs a server to complete the OAuth handshake,
 * because exchanging the authorization code for a token requires the client
 * secret, which can never ship in browser code. This Worker is that server and
 * does nothing else.
 *
 * Flow:
 *   1. Decap opens a popup at  GET /auth?provider=github&scope=repo
 *   2. we redirect to GitHub, carrying a CSRF token in an HttpOnly cookie
 *   3. GitHub redirects back to  GET /callback?code=...&state=...
 *   4. we swap the code for an access token and hand it to the opener window
 *      over postMessage, using the handshake Decap expects
 *
 * The token is never logged, stored, or sent anywhere but the opener window,
 * and only to an origin on ALLOWED_ORIGINS.
 */

const COOKIE = 'decap_oauth_state';
const PROVIDER = 'github';

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/** Minimal HTML escape for values interpolated into the popup document. */
function escapeJs(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function handleAuth(url, env) {
  const missing = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'].filter((k) => !env[k]);
  if (missing.length) {
    return new Response(`Worker is missing: ${missing.join(', ')}`, { status: 500 });
  }

  // Tie the callback to this browser so a stray /callback cannot be replayed.
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    // Sent explicitly: GitHub requires it once an app has more than one
    // redirect URI registered, and naming it turns a vague 404 into a precise
    // "redirect_uri mismatch". It must equal the app's registered callback.
    redirect_uri: `${url.origin}/callback`,
    scope: url.searchParams.get('scope') || 'repo,user',
    state,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${params}`,
      'Set-Cookie': `${COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      'Cache-Control': 'no-store',
    },
  });
}

async function handleCallback(request, url, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookie = (request.headers.get('Cookie') ?? '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);

  let payload;

  if (!code || !state) {
    payload = { provider: PROVIDER, error: 'Missing code or state', errorCode: 'MISSING_PARAMS' };
  } else if (!cookie || cookie !== state) {
    payload = { provider: PROVIDER, error: 'State mismatch', errorCode: 'CSRF_DETECTED' };
  } else {
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
        }),
      });
      const data = await response.json();
      payload = data.access_token
        ? { provider: PROVIDER, token: data.access_token }
        : {
            provider: PROVIDER,
            // GitHub's own message, e.g. bad_verification_code.
            error: data.error_description || data.error || 'No access token returned',
            errorCode: data.error || 'NO_TOKEN',
          };
    } catch (error) {
      payload = { provider: PROVIDER, error: String(error), errorCode: 'EXCHANGE_FAILED' };
    }
  }

  const status = payload.token ? 'success' : 'error';

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Signing in…</title></head>
<body>
<p>Completing sign-in…</p>
<script>
(function () {
  var allowed = ${escapeJs(allowedOrigins(env))};
  var message = 'authorization:${PROVIDER}:${status}:' + ${escapeJs(JSON.stringify(payload))};

  function send(origin) {
    window.opener.postMessage(message, origin);
    window.removeEventListener('message', onMessage, false);
    setTimeout(function () { window.close(); }, 200);
  }

  function onMessage(event) {
    // Hand the token only to an origin we trust.
    if (allowed.indexOf(event.origin) === -1) return;
    send(event.origin);
  }

  if (!window.opener) {
    document.body.textContent = 'This page has to be opened from the CMS.';
    return;
  }

  window.addEventListener('message', onMessage, false);
  // Decap is listening for this, and answers so we learn its origin.
  window.opener.postMessage('authorizing:${PROVIDER}', '*');
})();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      // Clear the one-shot CSRF cookie.
      'Set-Cookie': `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    switch (url.pathname) {
      case '/auth':
        return handleAuth(url, env);
      case '/callback':
        return handleCallback(request, url, env);
      case '/':
        return new Response('Decap CMS OAuth proxy for Fit Inspo by Kristina.', {
          headers: { 'Content-Type': 'text/plain' },
        });
      default:
        return new Response('Not found', { status: 404 });
    }
  },
};

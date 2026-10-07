# CMS OAuth proxy

A Cloudflare Worker that completes the GitHub OAuth handshake for Decap CMS.

Decap runs entirely in the browser, but trading an OAuth code for an access
token needs the client secret, which cannot ship in browser code. This Worker
holds the secret and does that one exchange. It stores nothing.

## Deploy

You need a free Cloudflare account and a GitHub OAuth app.

**1. Deploy the Worker** (from this directory):

```bash
npx wrangler deploy
```

Wrangler prints the URL. For this account it is:

```
https://fitinspo-cms-auth.reason-adhikari888.workers.dev
```

If the account has no `workers.dev` subdomain yet, the first deploy stops and
prints a dashboard link to register one. That is a one-time account setting.

**2. Create the GitHub OAuth app** at
<https://github.com/settings/developers> → *New OAuth App*:

| Field | Value |
|---|---|
| Application name | Fit Inspo CMS |
| Homepage URL | `https://fitinspobykristina.com` |
| Authorization callback URL | `https://fitinspo-cms-auth.reason-adhikari888.workers.dev/callback` |

The callback URL must match exactly, including `/callback`.

**3. Give the Worker the credentials.** These are secrets and must never be
committed:

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

**4. Point the CMS at the Worker.** In `../public/admin/config.yml`:

```yaml
backend:
  name: github
  repo: adhikariReason/fitinspo
  branch: main
  base_url: https://fitinspo-cms-auth.reason-adhikari888.workers.dev
```

Commit and push; the deploy workflow publishes it.

## Checking it

Open <https://fitinspobykristina.com/admin/> and click *Login with GitHub*. A
popup should ask you to authorize the app, then close itself and drop you into
the CMS.

If it fails:

- **The popup closes and nothing happens** — the site's origin is missing from
  `ALLOWED_ORIGINS` in `wrangler.toml`. Add it and redeploy.
- **"State mismatch"** — cookies are being blocked for the Worker domain, or the
  login took more than 10 minutes. Try again.
- **"bad_verification_code"** — the callback URL on the GitHub app does not match
  the Worker's `/callback`, or the client ID/secret pair is wrong.
- **Logs**: `npx wrangler tail` streams live requests.

## Who can log in

Anyone with a GitHub account can *authenticate*, but Decap can only commit what
GitHub itself permits. Write access to `adhikariReason/fitinspo` is what decides
who can actually publish — manage that in the repo's collaborator settings, not
here.

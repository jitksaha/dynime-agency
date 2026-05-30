# Deploying to Hostinger

If `https://dynime.com/superadmin` (or `/admin`, `/portfolio/...`, any deep link) returns **404**, it means the SPA fallback isn't active on the server. Follow these steps **exactly**.

## 1. Build the project locally

```bash
npm install
npm run build
```

This creates a `dist/` folder.

## 2. Upload the **contents of `dist/`** to `public_html/`

In Hostinger File Manager:

1. Go to **Files → File Manager**.
2. Open `public_html/`.
3. **Delete everything** currently inside `public_html/` (back it up first if needed).
4. Upload **everything inside `dist/`** — not the `dist` folder itself, but its contents.

⚠️ **CRITICAL — the `.htaccess` file:**

- Files starting with a dot (`.htaccess`) are **hidden by default** in Hostinger File Manager and most FTP clients (FileZilla, WinSCP).
- In **Hostinger File Manager**: click the **gear icon (⚙) → Show hidden files**.
- In **FileZilla**: menu **Server → Force showing hidden files**.
- After uploading, verify that `public_html/.htaccess` exists. If it doesn't, your deep links will 404. **This is the #1 cause of `/superadmin` not working.**

## 3. Verify the upload

In `public_html/` you should see:

```
public_html/
├── .htaccess          ← MUST exist (hidden file)
├── 404.html
├── index.html
├── favicon.svg
├── robots.txt
├── sitemap.xml
└── assets/
    ├── index-XXXX.js
    └── index-XXXX.css
```

## 4. Test

Open these URLs in an **incognito window** (to bypass cache):

- https://dynime.com/                 → home loads
- https://dynime.com/superadmin       → super admin login loads
- https://dynime.com/admin            → admin login loads
- https://dynime.com/portfolio        → portfolio loads
- Refresh any of those pages          → still loads (no 404)

## 5. If `/superadmin` still 404s

Check, in order:

1. **Is `.htaccess` actually in `public_html/`?** Enable "Show hidden files" and confirm.
2. **Open `.htaccess` in the File Manager editor** and confirm the contents match `public/.htaccess` from this repo.
3. **Clear Hostinger cache**: hPanel → **Advanced → Cache Manager → Purge All**.
4. **Clear Cloudflare cache** (if you use Cloudflare): dashboard → Caching → Configuration → Purge Everything.
5. **Check `mod_rewrite`**: hPanel → **Advanced → PHP Configuration**. On Hostinger Premium/Business plans `mod_rewrite` is always on. On the cheapest plan it may not be — contact Hostinger support.
6. As a last resort, the included `.htaccess` also sets `ErrorDocument 404 /index.html` so even if rewrite fails, the SPA still loads.

## 6. Subsequent deploys

Every time you make changes:

```bash
npm run build
```

Then re-upload the **contents of `dist/`** to `public_html/` (overwrite). Always include `.htaccess`.

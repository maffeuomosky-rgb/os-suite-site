# OS SUITE

Production source for the OS SUITE corporate website.

## Deploy

The project is designed for GitHub → Vercel. Vercel runs:

```bash
npm run build
```

and serves `dist/`.

The build script resolves the public URL from `PUBLIC_BASE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or `VERCEL_URL`, then generates canonical metadata, absolute social image URLs, `robots.txt`, and `sitemap.xml`.

## Local production build

```bash
PUBLIC_BASE_URL=https://example.vercel.app npm run build
```

`PUBLIC_BASE_URL` is only for local testing; do not hard-code an unverified Vercel URL in source.

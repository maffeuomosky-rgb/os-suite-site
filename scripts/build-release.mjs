import { cp, mkdir, readFile, rm, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dist = path.join(root, "dist");
const config = JSON.parse(await readFile(path.join(root, "release-config.json"), "utf8"));

function normalizeBaseUrl(value) {
  if (!value) return "";
  const v = value.trim().replace(/\/$/, "");
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

const base = normalizeBaseUrl(
  process.env.PUBLIC_BASE_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL ||
  config.site?.public_base_url || ""
);

if (!base || !/^https:\/\/[^/]+(?:\/.*)?$/i.test(base)) {
  console.error("Missing public HTTPS URL. On Vercel enable system environment variables, or set PUBLIC_BASE_URL.");
  process.exit(2);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const excluded = new Set([
  "dist", "scripts", "release-config.json", "package.json", "package-lock.json",
  "README.md", "PLACEHOLDER_AUDIT.txt", "RELEASE_CHECKLIST.md", "PRE_GITHUB_INPUTS.md", "RELEASE_STATUS.md"
]);

for (const name of await readdir(root)) {
  if (excluded.has(name) || name.startsWith(".")) continue;
  const src = path.join(root, name);
  const dst = path.join(dist, name);
  const info = await stat(src);
  if (info.isDirectory()) await cp(src, dst, { recursive: true });
  else await cp(src, dst);
}

const indexPath = path.join(dist, "index.html");
let html = await readFile(indexPath, "utf8");
const marker = "<!-- Canonical e og:url saranno inseriti al deploy quando sarà definito il dominio pubblico definitivo di OS SUITE. Evitiamo URL inventati o temporanei. -->";
const seo = `<link rel="canonical" href="${base}/"/>\n<meta property="og:url" content="${base}/"/>`;
html = html.replace(marker, seo);
html = html.replace('content="assets/og-os-suite.jpg"', `content="${base}/assets/og-os-suite.jpg"`);
html = html.replace('name="twitter:image" content="assets/og-os-suite.jpg"', `name="twitter:image" content="${base}/assets/og-os-suite.jpg"`);
html = html.replace('"name": "OS SUITE",\n  "description":', `"name": "OS SUITE",\n  "url": "${base}/",\n  "description":`);
await writeFile(indexPath, html);

await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n  <url><loc>${base}/legal/privacy.html</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>\n  <url><loc>${base}/legal/terms.html</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>\n  <url><loc>${base}/legal/cookies.html</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>\n</urlset>\n`);

const textExt = new Set([".html", ".js", ".mjs", ".json", ".txt", ".xml", ".md"]);
const badPatterns = [/\[(?=[^\]]*[A-ZÀ-Ü])[A-ZÀ-Ü0-9 /_-]+\]/g, /example\.com/g, /__BASE_URL__/g, /TODO/g, /FIXME/g, /Versione pre-pubblicazione/g];
const issues = [];

async function walk(dir) {
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) await walk(full);
    else if (textExt.has(path.extname(name).toLowerCase())) {
      const text = await readFile(full, "utf8");
      for (const pattern of badPatterns) if (pattern.test(text)) issues.push(`${path.relative(dist, full)} :: ${pattern}`);
    }
  }
}

await walk(dist);

if (issues.length) {
  console.error("Final audit failed:\n" + issues.map(x => ` - ${x}`).join("\n"));
  process.exit(3);
}

console.log(`OS SUITE production build ready: ${dist}`);
console.log(`Public base URL: ${base}`);
console.log("Placeholder audit: OK");

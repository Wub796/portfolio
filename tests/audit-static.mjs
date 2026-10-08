/* Static audit: broken local links, dead fragments, missing assets, duplicate
   ids, and CSS/JS static integrity. Node built-ins only, no browser required.
   Usage: node tests/audit-static.mjs                                */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const rel = (p) => path.relative(root, p);

const problems = [];
const notes = [];
const fail = (kind, where, detail) => problems.push({ kind, where, detail });

/* ---------- collect source files ---------- */
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'reports' || e.name === 'prompts') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
const cssFiles = walk('css');
const jsFiles = [...walk('js'), ...walk('vendor')];

/* ---------- HTML ---------- */
const idsByPage = {};
const anchorsByPage = {};
for (const file of htmlFiles) {
  const raw = read(file);
  const src = raw.replace(/<!--[\s\S]*?-->/g, ''); // comments must not count as markup
  const ids = [...src.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
  for (const d of [...new Set(dupes)]) fail('duplicate-id', file, `id="${d}" appears ${ids.filter((x) => x === d).length} times`);
  idsByPage[file] = new Set(ids);
  anchorsByPage[file] = new Set([...src.matchAll(/\sname="([^"]+)"/g)].map((m) => m[1]));
  void raw;

  // unbalanced critical structure
  for (const tag of ['html', 'head', 'body', 'main']) {
    const open = (src.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (src.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    if (open !== close) fail('unbalanced-tag', file, `<${tag}> open=${open} close=${close}`);
  }

  for (const m of src.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|data:|mailto:|tel:|#)/.test(url) || url === '') continue;
    const [target, frag] = url.split('#');
    if (target && !exists(target)) { fail('missing-asset', file, `${url} → no such file`); continue; }
    if (frag) {
      const page = target || file;
      if (!(idsByPage[page]?.has(frag) || anchorsByPage[page]?.has(frag))) {
        // the SPA router can land a fragment on any page, so report the owner page
        const owners = htmlFiles.filter((f) => idsByPage[f].has(frag));
        if (!owners.length) fail('dead-fragment', file, `${url} → no element with id="${frag}" anywhere`);
      }
    }
  }
}

/* ---------- CSS ---------- */
const cssText = cssFiles.map((f) => ({ f, text: read(f) }));
for (const { f, text } of cssText) {
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '');
  // brace balance
  const open = (stripped.match(/\{/g) || []).length, close = (stripped.match(/\}/g) || []).length;
  if (open !== close) fail('css-brace', f, `{ ${open} vs } ${close}`);

  for (const m of stripped.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
    const u = m[2].trim();
    if (/^(https?:|data:|#)/.test(u)) continue;
    const clean = u.split('?')[0].split('#')[0];
    const from = path.dirname(f);
    if (!exists(path.normalize(path.join(from, clean)))) fail('css-missing-asset', f, `url(${u})`);
  }

  // declarations that cannot ever apply: property with obviously invalid value
  const badValues = [
    [/\b(?:top|left|right|bottom|width|height|margin[-\w]*|padding[-\w]*)\s*:\s*[^;{}]*\b(?:undefined|null|NaN)\b/g, 'undefined/null/NaN value'],
    [/\btransform\s*:\s*;/g, 'empty transform'],
    [/;{2,}/g, 'empty declaration (double semicolon)'],
  ];
  for (const [re, label] of badValues) {
    const hits = [...stripped.matchAll(re)];
    if (hits.length) fail('css-suspicious', f, `${label} ×${hits.length} (first: ${JSON.stringify(hits[0][0].slice(0, 60))})`);
  }

  // duplicate property inside the same declaration block
  for (const block of stripped.matchAll(/\{([^{}]*)\}/g)) {
    const seen = new Map();
    for (const d of block[1].split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const prop = d.slice(0, i).trim();
      if (!prop || prop.startsWith('--')) continue;
      if (seen.has(prop) && !/^--/.test(prop)) {
        const prev = seen.get(prop);
        if (prev.trim() !== d.trim() && !prev.includes('!important')) {
          notes.push({ kind: 'css-duplicate-prop', where: f, detail: `"${prop}" declared twice in one block` });
        }
      }
      seen.set(prop, d);
    }
  }
}

/* ---------- custom properties: used vs defined ---------- */
const allCss = cssText.map((c) => c.text).join('\n');
const defined = new Set([...allCss.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const inlineDefined = new Set();
const htmlJs = [...htmlFiles.map((f) => read(f)), ...jsFiles.map((f) => read(rel(f)))].join('\n');
// a var can be born in a style attribute (`--x:`) or handed over at runtime
// (`style.setProperty('--x', ...)`) — both count as definitions.
for (const m of htmlJs.matchAll(/(--[\w-]+)\s*:/g)) inlineDefined.add(m[1]);
for (const m of htmlJs.matchAll(/setProperty\(\s*['"](--[\w-]+)['"]/g)) inlineDefined.add(m[1]);
for (const m of htmlJs.matchAll(/style\.setProperty\(\s*['"](--[\w-]+)['"]/g)) inlineDefined.add(m[1]);
const used = new Set([...allCss.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
for (const m of htmlJs.matchAll(/var\((--[\w-]+)/g)) used.add(m[1]);
void defined;
// An undefined custom property is only a defect when some use of it has no
// fallback. `var(--orb-arm-angle,0deg)` is a deliberate optional knob, so it is
// a note rather than a failure.
const noFallback = new Set();
for (const src of [allCss, htmlJs]) {
  for (const m of src.matchAll(/var\((--[\w-]+)\s*([,)])/g)) if (m[2] === ')') noFallback.add(m[1]);
}
for (const u of used) {
  if (defined.has(u) || inlineDefined.has(u)) continue;
  if (noFallback.has(u)) fail('undefined-var', 'css', `var(${u}) has no definition anywhere and is used without a fallback`);
  else notes.push({ kind: 'undefined-var-fallback', where: 'css', detail: `var(${u}) is undefined but every use supplies a fallback` });
}
const unused = [...defined].filter((d) => !used.has(d) && !inlineDefined.has(d));
if (unused.length) notes.push({ kind: 'unused-var', where: 'css', detail: unused.join(', ') });

/* ---------- JS ---------- */
for (const f of jsFiles) {
  const src = read(rel(f));
  for (const m of src.matchAll(/(?:href|src)\s*[:=]\s*['"]([^'"]+\.(?:css|js|html|png|jpg|svg|woff2?))['"]/g)) {
    const u = m[1];
    if (/^https?:/.test(u)) continue;
    if (!exists(u)) fail('js-missing-asset', rel(f), `${u} → no such file`);
  }
  for (const m of src.matchAll(/querySelector(?:All)?\(\s*['"](#[\w-]+)['"]/g)) {
    const id = m[1].slice(1);
    if (!htmlFiles.some((p) => idsByPage[p].has(id))) {
      notes.push({ kind: 'js-orphan-id', where: rel(f), detail: `${m[1]} never exists in any page (dead lookup?)` });
    }
  }
}

/* ---------- package.json / vendor honesty ---------- */
const pkg = JSON.parse(read('package.json'));
const depNames = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
notes.push({ kind: 'deps', where: 'package.json', detail: depNames.join(', ') || '(none)' });
for (const f of ['vercel.json', '.gitignore', 'README.md']) if (!exists(f)) fail('missing-file', '', f);

console.log(JSON.stringify({
  pages: htmlFiles.length,
  css: cssFiles.map(rel),
  dependencies: depNames,
  problems,
  notes,
}, null, 1));
console.log(problems.length ? `\nFAIL: ${problems.length} problem(s)` : '\nOK: no static problems');
process.exit(problems.length ? 1 : 0);

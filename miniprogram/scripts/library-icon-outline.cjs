const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const shapeTags = new Set(['path', 'rect', 'circle', 'ellipse']);
const paintAttributes = new Set(['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin']);

function loadLibrary() {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'src/lib/icon-library.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const loaded = { exports: {} };
  new Function('exports', 'module', compiled)(loaded.exports, loaded);
  assert.equal(loaded.exports.iconLibrary.length, 64, 'The outline atlas follows all 64 shared library entries.');
  return loaded.exports.iconLibrary;
}

function sourceSvg(icon) {
  const directory = icon.src.startsWith('/assets/habits/')
    ? path.resolve(root, '../web/public/habit-icons')
    : path.join(root, 'icon-library');
  return fs.readFileSync(path.join(directory, `${icon.id}.svg`), 'utf8');
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

function serialize(values) {
  return Object.entries(values).map(([name, value]) => ` ${name}="${value}"`).join('');
}

/**
 * Keep the source geometry and its paint order. Later filled shapes mask lines
 * underneath them, so a camera's body stripe does not cross its lens after all
 * fills become transparent. The masks only remove hidden lines; they do not
 * introduce an opaque fill into the final artwork.
 */
function outlineBody(svg, id) {
  assert.match(svg, /viewBox="0 0 48 48"/, `${id}: expected the shared 48-unit geometry.`);
  const tokens = [...svg.matchAll(/<\/?([\w:-]+)\b[^>]*>/g)];
  const ancestors = [];
  const masks = [];
  let painted = '';
  let count = 0;
  for (const [tag, name] of tokens) {
    assert.ok(name === 'svg' || name === 'g' || shapeTags.has(name), `${id}: unsupported source element ${name}.`);
    const closing = tag.startsWith('</');
    if (name === 'svg') {
      if (!closing) ancestors.push(attributes(tag));
      continue;
    }
    if (name === 'g') {
      if (closing) ancestors.pop();
      else ancestors.push(attributes(tag));
      continue;
    }
    if (closing) continue;
    const values = attributes(tag);
    const originalFill = values.fill ?? [...ancestors].reverse().find(item => item.fill !== undefined)?.fill ?? 'black';
    const clean = Object.fromEntries(Object.entries(values).filter(([key]) => !paintAttributes.has(key)));
    const wraps = ancestors.filter(item => item.transform).map(item => item.transform);
    const wrapped = body => wraps.reduceRight((content, transform) => `<g transform="${transform}">${content}</g>`, body);
    const shape = wrapped(`<${name}${serialize(clean)}/>`);
    if (originalFill !== 'none' && painted) {
      const maskId = `outline-${id}-${count}`;
      const silhouette = wrapped(`<${name}${serialize(clean)} fill="black" stroke="none"/>`);
      masks.push(`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="-8" y="-8" width="64" height="64"><rect x="-8" y="-8" width="64" height="64" fill="white" stroke="none"/>${silhouette}</mask>`);
      painted = `<g mask="url(#${maskId})">${painted}</g>`;
    }
    painted += shape;
    count++;
  }
  assert.ok(count > 0, `${id}: source artwork must contain shapes.`);
  return `<defs>${masks.join('')}</defs>${painted}`;
}

function outlineSvg(svg, id, size = 64, strokeWidth = .65) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48"><g fill="none" stroke="#66747c" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${outlineBody(svg, id)}</g></svg>`;
}

module.exports = { loadLibrary, sourceSvg, outlineBody, outlineSvg };

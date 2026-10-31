// Count emitted bytes without relying on compression or DevTools unused-file removal.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(output, 'app.json'), 'utf8'));
const subpackages = manifest.subPackages || manifest.subpackages || [];
// Use decimal MB so the requested < 1.5 MB also holds under the stricter unit.
const mainLimitBytes = 1_500_000;
const subpackageLimitBytes = 2 * 1024 * 1024;
const packages = [{ name: 'main', root: '', bytes: 0, files: 0 }, ...subpackages.map(pkg => ({ name: pkg.root, root: `${pkg.root}/`, bytes: 0, files: 0 }))];
const timerArtwork = new Map(['tomato-focus.png', 'tomato-rest.png'].map(name => [name, []]));
// Match DevTools IMAGE_AND_AUDIO_LIMIT: combined resources across every package.
const mediaExtensions = new Set(['.jpg', '.jpeg', '.png', '.svg', '.webp', '.gif', '.flac', '.m4a', '.ogg', '.ape', '.amr', '.wma', '.wav', '.mp3', '.mp4', '.aac', '.aiff', '.caf']);
const mediaLimitBytes = 200 * 1024;
let mediaBytes = 0;
const mediaFiles = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { collect(file); continue; }
    assert.ok(entry.isFile(), `Unexpected package entry: ${file}`);
    const relative = path.relative(output, file).split(path.sep).join('/');
    if (mediaExtensions.has(path.extname(file).toLowerCase())) {
      mediaBytes += fs.statSync(file).size;
      mediaFiles.push(relative);
    }
    timerArtwork.get(entry.name)?.push(relative);
    assert.ok(!relative.endsWith('.map'), `Source maps must stay outside the upload directory: ${relative}`);
    const pkg = packages.slice(1).find(pkg => relative.startsWith(pkg.root)) || packages[0];
    pkg.bytes += fs.statSync(file).size;
    pkg.files += 1;
  }
}
collect(output);

assert.ok(manifest.pages.includes('pages/pomodoro/index'), 'Focus is a native tab in the main package');
assert.ok(!fs.existsSync(path.join(output, 'assets', 'pomodoro')), 'Timer artwork must not be duplicated in the main package');
for (const [name, locations] of timerArtwork) {
  const source = path.join(root, 'src', 'assets', 'pomodoro', name);
  const emitted = path.join(output, 'pages', 'pomodoro', 'assets', name);
  assert.ok(fs.existsSync(emitted), `${name} must be emitted alongside the focus page`);
  assert.deepEqual(locations, [`pages/pomodoro/assets/${name}`], `${name} must appear exactly once, alongside the focus page`);
  assert.ok(fs.readFileSync(source).equals(fs.readFileSync(emitted)), `${name} must retain its original image bytes`);
}
console.log('PASS pomodoro artwork: two byte-identical focus PNGs, no duplicate asset copy.');

const { loadLibrary, sourceSvg } = require('./library-icon-outline.cjs');
for (const icon of loadLibrary()) {
  const relative = icon.src.replace(/^\//, '').replace(/\.png$/, '.svg');
  const emitted = path.join(output, relative);
  assert.equal(fs.readFileSync(emitted, 'utf8'), sourceSvg(icon), `${icon.id}: package must retain original vector artwork`);
  assert.ok(!fs.existsSync(path.join(output, icon.src.replace(/^\//, ''))), `${icon.id}: do not package a duplicate colored PNG`);
}
assert.ok(mediaBytes < mediaLimitBytes, `Combined image/audio resources must be < 200 KiB; got ${mediaBytes}`);
console.log(`PASS 64 original vector icons and media budget: ${mediaBytes.toLocaleString('en-US')} / ${mediaLimitBytes.toLocaleString('en-US')} bytes, including SVG and all packages.`);

const report = {
  measurement: 'Uncompressed local dist files before WeChat packaging; includes project config and licenses.',
  mainLimitBytes,
  subpackageLimitBytes,
  mediaBytes,
  mediaLimitBytes,
  mediaFiles,
  totalBytes: packages.reduce((sum, pkg) => sum + pkg.bytes, 0),
  packages,
};
const reportPath = path.join(root, 'test-results', 'package-size.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
for (const pkg of packages) {
  console.log(`${pkg.name}: ${pkg.bytes.toLocaleString('en-US')} bytes (${(pkg.bytes / 1_000_000).toFixed(3)} MB)`);
  assert.ok(pkg.files > 0, `${pkg.name} must contain emitted files`);
  const limit = pkg.root ? subpackageLimitBytes : mainLimitBytes;
  assert.ok(pkg.bytes < limit, `${pkg.name} must remain below ${limit} bytes; got ${pkg.bytes}`);
}
console.log(`PASS package budget: main < 1.5 MB; report: ${reportPath}`);

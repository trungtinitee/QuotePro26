import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('1. Building app with Vite...');
execSync('npm run build', { stdio: 'inherit' });

console.log('2. Inlining assets into a single standalone HTML file...');
const distDir = path.resolve('dist');
const htmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const assetsDir = path.join(distDir, 'assets');
const assetFiles = fs.readdirSync(assetsDir);
const cssFile = assetFiles.find((f) => f.endsWith('.css'));
const jsFile = assetFiles.find((f) => f.endsWith('.js'));

if (!cssFile || !jsFile) {
  throw new Error(`Missing CSS or JS in ${assetsDir}`);
}

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');

// Replace external stylesheet with inline <style>
html = html.replace(
  /<link\s+rel="stylesheet"[^>]*href="\/assets\/[^"]+"[^>]*>/i,
  `<style>\n${cssContent}\n</style>`
);

// Remove modulepreload links
html = html.replace(/<link\s+rel="modulepreload"[^>]*>\s*/gi, '');

// Remove external script link
html = html.replace(/<script\s+type="module"[^>]*src="\/assets\/[^"]+"[^>]*><\/script>\s*/i, '');

// Safely escape any </script in the JS bundle
const safeJs = jsContent.replace(/<\/script/gi, '<\\/script');

// Insert inline script inside body before closing tag
const inlineScript = `<script type="module">\n${safeJs}\n</script>`;
html = html.replace('</body>', `${inlineScript}\n</body>`);

// Output files
const outputs = [
  path.join(distDir, 'QuotePro_Offline.html'),
  path.join('public', 'QuotePro_Offline.html'),
  path.join('public', 'QuotePro_v4.5.html'),
];

for (const outPath of outputs) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`✓ Generated: ${outPath} (${sizeKb} KB)`);
}

console.log('Done! Standalone single-file HTML bundle created successfully.');

const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, 'src', 'template.html');
const cssPath = path.join(__dirname, 'src', 'styles.css');
const jsPath = path.join(__dirname, 'src', 'app.js');
const outputPath = path.join(__dirname, 'index.html');

console.log('Reading source files...');
const template = fs.readFileSync(templatePath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');

const combined = template
  .replace('<!-- STYLES_PLACEHOLDER -->', `<style>\n${css}\n</style>`)
  .replace('<!-- SCRIPT_PLACEHOLDER -->', `<script>\n${js}\n</script>`);

fs.writeFileSync(outputPath, combined, 'utf8');
console.log('Successfully generated index.html! Size:', combined.length, 'bytes');

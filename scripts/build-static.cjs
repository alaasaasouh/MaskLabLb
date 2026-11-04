// Copy only storefront files. Private notes, tests and server code are not public assets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const output = path.join(root, 'public');
const defaultConfig = require('../js/meta-config.js');
const pixelId = (process.env.META_PIXEL_ID === undefined ? defaultConfig.pixelId : process.env.META_PIXEL_ID).trim();
if (pixelId && !/^\d{5,20}$/.test(pixelId)) throw new Error('META_PIXEL_ID must be the numeric Pixel ID from Meta Events Manager.');
fs.mkdirSync(output, {recursive:true});
for (const name of ['index.html','style.css','js','assets']) {
  fs.cpSync(path.join(root,name),path.join(output,name),{recursive:true});
}
fs.writeFileSync(path.join(output, 'js', 'meta-config.js'),
  'window.MASKLAB_META = ' + JSON.stringify({pixelId}) + ';\n');
if (!pixelId) console.warn('META_PIXEL_ID is missing: Meta advertising tracking is disabled.');
console.log('Built public storefront files. Order function remains server-side.');

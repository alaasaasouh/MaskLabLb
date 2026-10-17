// Copy only storefront files. Private notes, tests and server code are not public assets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const output = path.join(root, 'public');
fs.mkdirSync(output, {recursive:true});
for (const name of ['index.html','style.css','js','assets']) {
  fs.cpSync(path.join(root,name),path.join(output,name),{recursive:true});
}
console.log('Built public storefront files. Order function remains server-side.');

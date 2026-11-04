const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
const defaults = require('../js/meta-config.js');
function build(id) {
  const env = {...process.env};
  if (id === undefined) delete env.META_PIXEL_ID;
  else env.META_PIXEL_ID = id;
  return spawnSync(process.execPath,['scripts/build-static.cjs'],{cwd:root,env,encoding:'utf8'});
}
function outputId() {
  const browser = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'public/js/meta-config.js'),'utf8'),browser);
  return browser.window.MASKLAB_META.pixelId;
}
try {
  assert.equal(defaults.pixelId,'1278605057782743','Owner-supplied ID is the source default');
  assert.equal(build().status,0);
  assert.equal(outputId(),defaults.pixelId,'Vercel and source previews use the same default');
  assert.equal(build('123456789012345').status,0);
  assert.equal(outputId(),'123456789012345','Vercel variable overrides source default');
  assert.equal(build('').status,0);
  assert.equal(outputId(),'','Explicit blank disables tracking');
  assert.equal(build('not-a-pixel-id').status,1,'Invalid ID fails deployment build');
  console.log('PASS: owner default, build-time override, explicit disable and invalid-ID rejection.');
} finally {
  assert.equal(build().status,0,'Restore build with owner configuration, never test fixture ID');
}

/* Browser QA using the installed Chromium and its native DevTools protocol.
   No runtime packages or browser download required. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const chromePath = process.env.MASKLAB_CHROME || (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1228', 'chrome-win64', 'chrome.exe') : 'chromium');
const screenshotDirectory = path.join(__dirname, '..', '.local', 'qa');
fs.mkdirSync(screenshotDirectory, { recursive: true });
const delay = ms => new Promise(r => setTimeout(r, ms));
let browser, server, socket;
const orderEmails = [];
const testOrderHandler = require('../server/orders.cjs').createOrderHandler({
  env:{BREVO_API_KEY:'test-only',ORDER_FROM_EMAIL:'sender@example.com',ORDER_TO_EMAIL:'owner@example.com',ORDER_ALLOWED_ORIGINS:'http://127.0.0.1:4173'},
  fetchImpl:async (url, options) => {
    orderEmails.push(JSON.parse(options.body));
    await delay(150);
    return {ok:true,status:201,json:async()=>({messageIds:['test-customer','test-owner']})};
  }
});
(async () => {
  server = http.createServer((req,res)=>new URL(req.url,'http://localhost').pathname === '/api/order' ? testOrderHandler(req,res) : require('../preview.cjs')(req,res));
  await new Promise(r => server.listen(4173, '127.0.0.1', r));
  browser = spawn(chromePath, ['--headless=new','--no-sandbox','--disable-gpu','--remote-debugging-port=9333','--remote-allow-origins=*',`--user-data-dir=${path.join(__dirname,'.browser-profile')}`,'about:blank'], {windowsHide:true,stdio:'ignore'});
  let target;
  for (let i = 0; i < 40; i++) { try { target = (await (await fetch('http://127.0.0.1:9333/json')).json()).find(tab => tab.type === 'page' && !tab.url.startsWith('chrome-extension:')); if (target) break; } catch {} await delay(250); }
  assert.ok(target, 'Chromium started');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => socket.addEventListener('open',r,{once:true}));
  let sequence = 0; const pending = new Map(); const errors = []; const failedRequests=[];
  socket.addEventListener('message',event => {const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(m.error);else p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(m.method==='Network.responseReceived'&&m.params.response.status>=400)failedRequests.push(m.params.response.url);});
  function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
  async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
  async function viewport(width,height){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});}
  async function shot(name,full=false){await evaluate('document.fonts.ready');await delay(400);const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:full,...(full?{clip:{x:0,y:0,width:await evaluate('innerWidth'),height:await evaluate('document.documentElement.scrollHeight'),scale:1}}:{})});fs.writeFileSync(path.join(screenshotDirectory,name),Buffer.from(r.data,'base64'));}
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  await viewport(1440,1000);await send('Page.navigate',{url:'http://127.0.0.1:4173/'});await delay(1500);
  await evaluate('localStorage.clear(); location.reload()');await delay(800);
  for(let attempt=0;attempt<40;attempt++){if(await evaluate('document.querySelectorAll(".product-card").length')===11)break;await delay(150);}
  if(await evaluate('document.querySelectorAll(".product-card").length')!==11)console.log({errors,failedRequests,state:await evaluate('({url:location.href,title:document.title,body:document.body.innerText.slice(0,300)})')});
  assert.equal(await evaluate('document.querySelectorAll(".product-card").length'),11);
  assert.equal(await evaluate('document.fonts.check("16px Knewave")'),true);
  await shot('desktop-home.png');
  await evaluate('document.querySelectorAll(".reveal").forEach(e=>e.classList.remove("waiting"));document.querySelectorAll("img").forEach(img=>{img.loading="eager"})');
  await evaluate('Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))');
  await evaluate('document.documentElement.style.scrollBehavior="auto"');
  const totalHeight=await evaluate('document.documentElement.scrollHeight');
  for(let y=0;y<totalHeight;y+=750){await evaluate(`scrollTo(0,${y})`);await delay(80);}
  await evaluate('scrollTo(0,0)');await delay(300);
  await shot('desktop-full.png',true);
  await evaluate('document.querySelector("[data-add=clowbreaker]").click();document.querySelector("[data-add=bark-vader]").click();document.querySelector("[data-open-cart]").click()');
  assert.ok(await evaluate('document.querySelector("#cart-summary").textContent.includes("$35.00")'));
  await evaluate(`document.querySelector('[data-id=bark-vader][data-delta="1"]').click()`);
  assert.ok(await evaluate('document.querySelector("#cart-summary .total").textContent.includes("$52.00")'));
  assert.ok(await evaluate('document.querySelector("#cart-body").textContent.includes("$16.333")'));
  assert.equal(await evaluate('document.querySelector("#cart-drawer").open'),true);
  await shot('desktop-bag.png');
  await evaluate('document.querySelector("[data-remove=clowbreaker]").click()');
  assert.equal(await evaluate('document.querySelectorAll(".cart-item").length'),1);
  assert.ok(await evaluate('document.querySelector("#cart-summary .total").textContent.includes("$38.00")'));
  await evaluate('location.reload()');await delay(650);
  for(let attempt=0;attempt<40;attempt++){if(await evaluate('document.querySelector(".cart-count")?.textContent')==='2')break;await delay(150);}
  assert.equal(await evaluate('document.querySelector(".cart-count").textContent'),'2');
  await evaluate('document.querySelector("[data-open-cart]").click(); document.querySelector("#start-checkout").click()');
  assert.equal(await evaluate('document.querySelector("#checkout-form").checkValidity()'),false);
  await evaluate(`(()=>{const f=document.querySelector('#checkout-form');const values={name:'QA Test',phone:'invalid',area:'Beirut',address:'Sample street'};Object.entries(values).forEach(([key,value])=>f.elements[key].value=value);window.open=(url)=>{window.testWhatsappURL=url;return null};f.requestSubmit()})()`);
  assert.equal(await evaluate('document.querySelector("#checkout-form").checkValidity()'),false);
  assert.equal(await evaluate('typeof window.testWhatsappURL'),'undefined');
  await evaluate('document.querySelector("[name=phone]").dispatchEvent(new Event("input",{bubbles:true}))');
  await evaluate(`(()=>{const f=document.querySelector('#checkout-form');const values={name:'QA & Test',phone:'+961 76 123 456',area:'Beirut',address:'Sample street',notes:'<img src=x onerror=alert(1)>'};Object.entries(values).forEach(([key,value])=>f.elements[key].value=value);window.open=(url)=>{window.testWhatsappURL=url;return null};f.requestSubmit()})()`);
  const url=await evaluate('window.testWhatsappURL');assert.ok(url.startsWith('https://wa.me/96176723303?text='));assert.ok(decodeURIComponent(url).includes('Bark Vader × 2'));assert.ok(decodeURIComponent(url).includes('Merchandise total: $35.00'));
  assert.equal(await evaluate('document.querySelector("#whatsapp-fallback").hidden'),false);
  assert.ok(!(await evaluate('JSON.stringify(localStorage)')).includes('QA & Test'));
  assert.equal(await evaluate('document.querySelector(".cart-count").textContent'),'2');
  await shot('desktop-checkout.png');
  await evaluate(`document.querySelector('#checkout-dialog').close();document.querySelector('[data-open-cart]').click();document.querySelector('[data-id=bark-vader][data-delta="1"]').click();document.querySelector('[data-id=bark-vader][data-delta="1"]').click()`);
  assert.ok(await evaluate('document.querySelector("#cart-summary .total").textContent.includes("$68.33")'));
  await evaluate('document.querySelector("#start-checkout").click()');
  assert.ok(await evaluate('document.querySelector("#checkout-review .total").textContent.includes("$68.33")'));
  await evaluate('document.querySelector("#checkout-form").requestSubmit()');
  assert.ok(decodeURIComponent(await evaluate('window.testWhatsappURL')).includes('Merchandise total: $65.33'));
  await evaluate('document.querySelector("#checkout-dialog").close()');
  for(const width of [320,375,390,768,1024,1440]){
    await viewport(width,900);await delay(150);
    const dims=await evaluate('({scroll:document.documentElement.scrollWidth,viewport:innerWidth})');assert.ok(dims.scroll<=dims.viewport,`No page overflow at ${width}: ${JSON.stringify(dims)}`);
  }
  await viewport(390,844);await evaluate('scrollTo(0,0)');await delay(500);await shot('mobile-home.png');
  await evaluate('document.querySelector(".menu-toggle").click()');assert.equal(await evaluate('document.querySelector("#mobile-menu").open'),true);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate('document.querySelector("#mobile-menu").open'),false);
  await delay(100);
  assert.equal(await evaluate('document.activeElement.classList.contains("menu-toggle")'),true);
  await evaluate('document.querySelector("[data-quick=fangzilla]").click()');
  assert.equal(await evaluate('document.querySelector("#quick-view").open'),true);await shot('mobile-product.png');
  for(let i=0;i<14;i++){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.ok(await evaluate('document.querySelector("#quick-view").contains(document.activeElement) || document.activeElement === document.body'));}
  await evaluate('document.querySelector("#quick-design").value="ginger-ninja";document.querySelector("#quick-design").dispatchEvent(new Event("change",{bubbles:true}));document.querySelector("#quick-add").click()');
  assert.ok(await evaluate('document.querySelector("#cart-body").textContent.includes("Ginger Ninja")'));
  await shot('mobile-bag.png');await evaluate('document.querySelector("#cart-drawer").close();document.querySelector("#shop").scrollIntoView()');await delay(700);await shot('mobile-collection.png');
  await evaluate('document.querySelector("[data-open-cart]").click();document.querySelector("#start-checkout").click()');
  await evaluate(`(()=>{const f=document.querySelector('#checkout-form');const values={name:'Order QA',email:'',phone:'+961 76 123 456',area:'Beirut',address:'Sample street'};Object.entries(values).forEach(([key,value])=>f.elements[key].value=value);document.querySelector('#place-order').click()})()`);
  assert.equal(await evaluate('document.querySelector("[name=email]").validity.valid'),false);
  assert.equal(orderEmails.length,0);
  // WhatsApp remains usable after a missing-email validation error.
  await evaluate('document.querySelector("[value=whatsapp]").click()');
  assert.equal(await evaluate('document.querySelector("#whatsapp-fallback").hidden'),false);
  await evaluate(`document.querySelector('[name=email]').value='customer@example.com';document.querySelector('[name=email]').dispatchEvent(new Event('input',{bubbles:true}));window.originalFetch=window.fetch;window.fetch=async()=>new Response(JSON.stringify({error:'Please retry with the same details.'}),{status:503,headers:{'Content-Type':'application/json'}});document.querySelector('#place-order').click()`);
  await delay(100);
  assert.equal(await evaluate('document.querySelector("#order-success").hidden'),true);
  assert.equal(await evaluate('document.querySelector(".cart-count").textContent'),'5');
  assert.ok(await evaluate('document.querySelector("#order-status").textContent.includes("retry")'));
  assert.equal(await evaluate('document.querySelector("#checkout-fields").disabled'),false);
  await shot('mobile-order-error.png');
  await evaluate('window.fetch=window.originalFetch;document.querySelector("#place-order").click();document.querySelector("#place-order").click()');
  assert.equal(await evaluate('document.querySelector("#checkout-fields").disabled'),true);
  await delay(400);
  assert.equal(orderEmails.length,1,'Double click sends only one batch');
  assert.equal(orderEmails[0].messageVersions.length,2);
  assert.equal(orderEmails[0].messageVersions[0].to[0].email,'customer@example.com');
  assert.equal(orderEmails[0].messageVersions[1].to[0].email,'owner@example.com');
  assert.equal(await evaluate('document.querySelector("#order-success").hidden'),false);
  assert.equal(await evaluate('document.querySelector(".cart-count").textContent'),'0');
  assert.ok(await evaluate('document.querySelector("#order-confirmation").textContent.includes("$84.67")'));
  assert.equal(await evaluate('location.protocol'),'http:','No email app is opened');
  assert.ok(!(await evaluate('JSON.stringify(localStorage)+JSON.stringify(sessionStorage)')).includes('customer@example.com'));
  await shot('mobile-order-success.png');
  await evaluate('document.querySelector("#checkout-dialog").close()');
  await evaluate('document.querySelectorAll("img").forEach(img=>{img.loading="eager"})');await delay(800);
  assert.deepEqual(await evaluate('[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)'),[]);
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
  console.log('PASS: desktop/mobile rendering; 11 products; mixed bundles; cart changes/removal/persistence; empty-form validation; encoded WhatsApp message; no PII storage; >3 automatic pricing; mobile menu/Escape; quick view/design switching; all images; no overflow at 320/375/390/768/1024/1440; no JS or HTTP errors.');
  fs.writeFileSync(path.join(__dirname,'qa-result.txt'),'Passed Chromium browser QA at 320, 375, 390, 768, 1024 and 1440 px. All shopping and WhatsApp preparation checks passed. No message was sent.\n');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(socket)socket.close();if(browser)browser.kill();if(server){server.closeAllConnections();server.close();}setTimeout(()=>process.exit(process.exitCode||0),500);});

const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {createOrderHandler, validateOrder, emailPayload} = require('../server/orders.cjs');
const now = Date.now();
const env = {BREVO_API_KEY:'test-only-key',ORDER_FROM_EMAIL:'sender@example.com',ORDER_TO_EMAIL:'owner@example.com',ORDER_ALLOWED_ORIGINS:'https://shop.example.com,https://owner.github.io'};
const body = () => ({requestId:randomUUID(),startedAt:now,payment:'cod',cart:[{id:'clowbreaker',quantity:1},{id:'bark-vader',quantity:2}],customer:{name:'QA & Test',email:'customer@example.com',phone:'+961 76 123 456',area:'Beirut',address:'Test street',notes:'<img src=x onerror=alert(1)>'}});
function invoke(handler, data, overrides = {}) {
  const req = {method:'POST',headers:{origin:'https://shop.example.com','content-type':'application/json'},body:data,socket:{remoteAddress:'127.0.0.1'},...overrides};
  return new Promise((resolve,reject) => {
    const headers = {};
    const res = {statusCode:200,setHeader:(key,value)=>headers[key]=value,end(raw){resolve({status:this.statusCode,headers,body:raw ? JSON.parse(raw) : null});}};
    handler(req,res).catch(reject);
  });
}
(async () => {
  const sample = body();
  const order = validateOrder({...sample,total:1},now);
  assert.equal(order.price.grandTotal,5300);
  const payload = emailPayload(order,env);
  assert.equal(payload.messageVersions.length,2);
  assert.equal(payload.messageVersions[0].to[0].email,'customer@example.com');
  assert.equal(payload.messageVersions[1].to[0].email,'owner@example.com');
  assert.ok(payload.messageVersions.every(v=>v.textContent.includes('Total due on delivery: $53.00')));
  assert.ok(payload.messageVersions.every(v=>v.textContent.includes('Cash on delivery (unpaid)')));
  assert.ok(payload.messageVersions.every(v=>!v.htmlContent.includes('<img')));
  assert.ok(payload.messageVersions[0].htmlContent.includes('&lt;img'));
  assert.equal(validateOrder(sample,now).key,order.key);
  assert.notEqual(validateOrder({...sample,customer:{...sample.customer,email:'another@example.com'}},now).key,order.key);
  for (const bad of [null,{}, {...sample,cart:[]},{...sample,cart:[{id:'fake',quantity:1}]},{...sample,cart:[{id:'clowbreaker',quantity:1.5}]},{...sample,cart:[{id:'clowbreaker',quantity:100}]},{...sample,cart:[sample.cart[0],sample.cart[0]]},{...sample,customer:{...sample.customer,email:'bad'}},{...sample,customer:{...sample.customer,phone:'bad'}},{...sample,startedAt:now-11*60000},{...sample,website:'spam'},{...sample,payment:'paid'}]) assert.throws(()=>validateOrder(bad,now));
  let calls = 0;
  const seen = new Set();
  const handler = createOrderHandler({env,now:()=>now,fetchImpl:async (url,options)=>{
    calls++;
    assert.equal(url,'https://api.brevo.com/v3/smtp/email');
    assert.equal(options.headers['api-key'],'test-only-key');
    const sent = JSON.parse(options.body);
    if (seen.has(sent.headers.idempotencyKey)) return {ok:false,status:400,json:async()=>({code:'duplicate_parameter',message:'idempotencyKey already used'})};
    seen.add(sent.headers.idempotencyKey);
    return {ok:true,status:201,json:async()=>({messageIds:['customer-id','owner-id']})};
  }});
  const first = await invoke(handler,sample);
  assert.equal(first.status,200);assert.equal(first.body.grandTotal,5300);
  assert.equal(first.headers['Cache-Control'],'no-store');
  assert.equal((await invoke(handler,sample)).body.orderId,first.body.orderId);
  assert.equal(seen.size,1,'Retries produce one email batch');
  assert.equal((await invoke(handler,sample,{method:'GET'})).status,405);
  assert.equal((await invoke(handler,sample,{method:'OPTIONS'})).status,204);
  assert.equal((await invoke(handler,sample,{headers:{origin:'https://evil.example'}})).status,403);
  assert.equal((await invoke(handler,sample,{headers:{origin:'https://shop.example.com','content-type':'text/plain'}})).status,415);
  assert.equal((await invoke(handler,'not JSON')).status,400);
  assert.equal((await invoke(handler,'x'.repeat(16001))).status,413);
  assert.equal(calls,2,'Rejected requests never send email');
  const unconfigured = createOrderHandler({env:{ORDER_ALLOWED_ORIGINS:env.ORDER_ALLOWED_ORIGINS},fetchImpl:()=>{throw Error('must not send');}});
  assert.equal((await invoke(unconfigured,sample)).status,503);
  for (const result of [{ok:false,status:401,json:async()=>({message:'secret provider detail'})},{ok:true,status:201,json:async()=>({messageIds:['only-one']})},{ok:false,status:400,json:async()=>({code:'duplicate_parameter',message:'another duplicate field'})}]) {
    const broken=createOrderHandler({env,fetchImpl:async()=>result});
    const reply=await invoke(broken,sample);assert.equal(reply.status,502);assert.ok(!JSON.stringify(reply).includes('secret provider detail'));
  }
  const timeout=createOrderHandler({env,fetchImpl:async()=>{throw new Error('timeout');}});
  assert.equal((await invoke(timeout,sample)).status,502);
  let last;
  for(let i=0;i<11;i++) last=await invoke(handler,sample);
  assert.equal(last.status,429);
  console.log('PASS: server-calculated totals; separate merchant/customer emails; COD; validation; HTML escaping; retry deduplication; origin checks; limits; missing configuration; provider failure and timeout. No real emails sent.');
})().catch(error=>{console.error(error);process.exitCode=1;});

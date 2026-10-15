import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const registrySource=readFileSync("data/products.js","utf8");
const sandbox={window:{}};
vm.runInNewContext(registrySource,sandbox,{timeout:1500});
const products=sandbox.window.OS_SUITE_PRODUCTS;
assert.ok(Array.isArray(products));
assert.equal(new Set(products.map(p=>p.id)).size,products.length);

const sheet=products.find(p=>p.id==="seller-os");
const web=products.find(p=>p.id==="seller-os-web");
const host=products.find(p=>p.id==="host-os");
assert.ok(sheet&&web&&host);
assert.equal(sheet.status,"available");
assert.equal(sheet.edition,"Sheet Edition");
assert.equal(sheet.website,"https://seller-os-site-eight.vercel.app/");
assert.equal(host.website,"https://host-os-site.vercel.app/");
assert.equal(web.edition,"SaaS");
assert.equal(web.status,"coming-soon");
assert.equal(web.stage,"in-development");
assert.equal(web.website,undefined,"Unreleased SaaS must not link to a production signup, QA demo or checkout");
assert.equal(web.package,undefined,"Do not substitute an unrelated box image");

const html=readFileSync("index.html","utf8");
assert.match(html,/"numberOfItems": 3/);
assert.match(html,/Seller OS Sheet Edition/);
assert.match(html,/Seller OS Web/);
assert.match(html,/p\.stage==='in-development'\?'In sviluppo'/);
assert.match(html,/SAAS IN SVILUPPO/);
assert.match(html,/p\.edition==='Sheet Edition'/);

let count=0;
for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
 if(/application\/ld\+json/i.test(match[1])||!match[2].trim())continue;
 new vm.Script(match[2],{filename:"index.html (inline script "+(++count)+")"});
}
console.log("OS SUITE ecosystem registry and inline scripts verified");

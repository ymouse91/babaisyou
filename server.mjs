import http from 'node:http';
import os from 'node:os';
import {build,PUBLIC_FILES} from './build.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
build();let rebuild;fs.watch(root,{recursive:true},(_event,name)=>{name=String(name??'').replaceAll('\\','/');if(!['index.html','app.mjs','engine.mjs','style.css','ai.mjs','ai-worker.mjs','manifest.webmanifest','sw-template.js'].includes(name)&&!name.startsWith('assets/'))return;clearTimeout(rebuild);rebuild=setTimeout(()=>{try{build();}catch(e){console.error(e.message);}},150);});
const port=Number(process.env.BABA_PORT??4173);
const lanAddresses=Object.values(os.networkInterfaces()).flat().filter(info=>info&&info.family==='IPv4'&&!info.internal&&/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(info.address)).map(info=>info.address);
const host=process.env.BABA_HOST??(process.argv.includes('--lan')?lanAddresses[0]:'127.0.0.1');
if(!host)throw Error('Lähiverkon IPv4-osoitetta ei löytynyt.');
const publicFiles=new Set(PUBLIC_FILES.map(file=>'/'+file));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}if(pathname==='/')pathname='/index.html';if(!publicFiles.has(pathname)){res.writeHead(404).end();return;}const p=path.resolve(root,'.'+pathname);if(!p.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(p,(e,b)=>{if(e)res.writeHead(404).end();else{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(b);}});}).listen(port,host,()=>{
 console.log(`Peli tällä PC:llä: http://127.0.0.1:${port}`);
 if(host!=='127.0.0.1')console.log(`Lähiverkko / iPad: http://${host}:${port}`);
 console.log('Lopeta: Ctrl+C');
});

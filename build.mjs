import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/^\uFEFF/,'');
export const PUBLIC_FILES=Object.freeze([
 'index.html','peli.html','style.css','app.mjs','engine.mjs','ai.mjs','ai-worker.mjs','manifest.webmanifest','sw.js',
 'assets/icons/icon.svg','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/icon-maskable-512.png','assets/icons/apple-touch-icon.png',
 'assets/fonts/dm-sans.ttf','assets/fonts/space-grotesk.ttf','assets/fonts/OFL-DMSans.txt','assets/fonts/OFL-SpaceGrotesk.txt'
]);
export function build({check=false,dist=false}={}){
 const html=read('index.html'),css=read('style.css'),engine=read('engine.mjs').replace(/\bexport\s+/g,''),app=read('app.mjs').replace(/^import[^\n]*\n/,'');
 const ai=read('ai.mjs').replace(/^import[^\n]*\n/,'').replace(/\bexport\s+/g,''),worker=read('ai-worker.mjs').replace(/^import[^\n]*\n/,'');
 const workerSource=(engine+'\n'+ai+'\n'+worker).replace(/<\/script/gi,'<\\/script');
 const result=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>').replace('<script type="module" src="app.mjs"></script>',()=>'<script id="ai-worker-source" type="text/plain">'+workerSource+'</script><script type="module">'+engine+'\n'+app+'</script>');
 const version=read('engine.mjs').match(/APP_VERSION='([^']+)'/)?.[1];if(!version)throw Error('APP_VERSION puuttuu.');
 const precache=['./',...PUBLIC_FILES.filter(file=>file!=='sw.js').map(file=>'./'+file)];
 const digest=crypto.createHash('sha256');digest.update(read('sw-template.js'));
 for(const file of PUBLIC_FILES.filter(file=>file!=='sw.js')){digest.update(file);digest.update(file==='peli.html'?result:fs.readFileSync(path.join(root,file)));}
 const revision=version+'-'+digest.digest('hex').slice(0,12);
 const sw=read('sw-template.js').replace('__CACHE_VERSION__',JSON.stringify(revision)).replace('__PRECACHE_FILES__',JSON.stringify(precache,null,1));
 for(const [file,content]of [['peli.html',result],['sw.js',sw]]){
  if(check){if(read(file)!==content)throw Error(file+' ei vastaa lähdekoodia. Suorita node build.mjs.');}
  else fs.writeFileSync(path.join(root,file),content);
 }
 if(dist){
  const target=path.resolve(root,'dist');
  if(path.dirname(target)!==root||path.basename(target)!=='dist')throw Error('Julkaisukansion polku ei ole sallittu.');
  // The checked absolute target is always this project's generated dist folder.
  fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target);
  for(const file of PUBLIC_FILES){const output=path.join(target,file);fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(path.join(root,file),output);}
  fs.writeFileSync(path.join(target,'.nojekyll'),'');
 }
 console.log(check?'peli.html ja sw.js vastaavat lähdekoodia.':'Versio '+version+' generoitu'+(dist?' dist-julkaisukansioon.':'.'));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))build({check:process.argv.includes('--check'),dist:process.argv.includes('--dist')});

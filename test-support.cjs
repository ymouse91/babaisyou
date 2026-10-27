const path=require('node:path'),os=require('node:os');
try{module.exports=require('playwright');}
catch{module.exports=require(path.join(os.homedir(),'Documents','codex-tools','node_modules','playwright'));}

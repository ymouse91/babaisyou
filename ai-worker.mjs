import {chooseAI} from './ai.mjs';
self.onmessage=event=>{
 try{const result=chooseAI(event.data.state,event.data.options);self.postMessage({id:event.data.id,result});}
 catch(error){self.postMessage({id:event.data.id,error:error.message??String(error)});}
};

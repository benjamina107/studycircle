import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
async function main() {
 const {workerTick}=await import('../src/lib/knowledge/worker');
 let stop=false;
 process.on('SIGINT',()=>{stop=true;});process.on('SIGTERM',()=>{stop=true;});
 if(!process.env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY in .env.local before starting the worker.');
 console.log('StudyCircle worker started. Uploads and @AI requests use independent queue consumers.');
 if(process.argv.includes('--once')) {await workerTick();return;}
 async function loop(lane:'assets'|'questions') {
  while(!stop){
   try {const worked=await workerTick(lane);if(!worked)await new Promise(r=>setTimeout(r,3000));}
   catch(error){console.error('Worker connection failed:',error instanceof Error?error.name:'Error');await new Promise(r=>setTimeout(r,10000));}
  }
 }
 await Promise.all([loop('assets'),loop('questions')]);
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Worker failed');process.exitCode=1;});

// Optional demo narration; no SDK or package installation. Never prints the API key.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
process.loadEnvFile();
if(!process.env.OPENAI_API_KEY)throw Error('OPENAI_API_KEY is required.');
const root='.semvod/demo/voice-openai';await fs.mkdir(root,{recursive:true,mode:0o700});
const narration=JSON.parse(await fs.readFile('docs/demo-narration.json','utf8'));
const manifest=[];
for(const segment of narration){
 const body={model:'gpt-4o-mini-tts',voice:'marin',response_format:'wav',speed:1.1,input:segment.text,instructions:'Read exactly the provided text. Warm, clear, confident technical demo narration, approximately 175 words per minute. No music or additional sounds.'};
 const hash=createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0,20),file=`${root}/${segment.id}-${hash}.wav`;
 let cached=true;
 try{await fs.access(file);}catch{
  cached=false;const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error(`Narration request failed (${response.status}); no automatic retry.`);
  await fs.writeFile(file,Buffer.from(await response.arrayBuffer()),{mode:0o600});
 }
 manifest.push({id:segment.id,file,text:segment.text});console.log(JSON.stringify({id:segment.id,cached}));
}
await fs.writeFile(`${root}/manifest.json`,JSON.stringify(manifest,null,2));
console.log('Narration ready. Disclose AI-generated voice in the video and description.');

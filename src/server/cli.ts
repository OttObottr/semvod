#!/usr/bin/env node
import { buildSheets } from './indexer.js';
import { Recorder } from './recorder.js';
const [command='serve',...args]=process.argv.slice(2);
try {
 if(command==='record'){
  const recorder=new Recorder();const session=await recorder.start(!args.includes('--no-chat'));console.log(`Recording ${session.id}. Press Ctrl+C to save and index.`);
  let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;await recorder.stop();await buildSheets(session.id);console.log(`Saved ${session.frames.length} frames to sessions/${session.id}`);process.exit(0);};process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
 }else if(command==='index'){if(!args[0])throw new Error('Usage: npm run semvod -- index <session-id>');console.log(`Built ${(await buildSheets(args[0])).length} sheets`);}
 else if(command==='serve'||command==='demo'){const {startServer}=await import('./server.js');await startServer(args.includes('--dev'),command==='demo');}
 else console.log('SemVOD — Ctrl+F for your stream\n\nCommands: demo [--dev], serve [--dev], record [--no-chat], index <session-id>\nUse: npm run semvod -- <command>');
}catch(error){console.error((error as Error).message);process.exitCode=1;}

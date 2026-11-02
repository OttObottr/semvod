// Disposable test infrastructure: fixed-destination relay, no host mounts or credentials.
import http from 'node:http';
import net from 'node:net';
import { resolve4 } from 'node:dns/promises';
const allowed=new Set(['api.twitch.tv','id.twitch.tv','api.openai.com','eventsub.wss.twitch.tv']);
function publicIPv4(ip){const n=ip.split('.').map(Number);return net.isIPv4(ip)&&![0,10,127].includes(n[0])&&n[0]<224&&!(n[0]===169&&n[1]===254)&&!(n[0]===172&&n[1]>=16&&n[1]<=31)&&!(n[0]===192&&n[1]===168)&&!(n[0]===100&&n[1]>=64&&n[1]<=127);}
function pipe(client,ip,port,head){
 if(!publicIPv4(ip)){client.destroy();return;}
 const upstream=net.connect({host:ip,port},()=>{if(head!==undefined){client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);}client.pipe(upstream);upstream.pipe(client);});
 upstream.setTimeout(120000,()=>upstream.destroy());client.on('error',()=>upstream.destroy());upstream.on('error',()=>client.destroy());client.on('close',()=>upstream.destroy());upstream.on('close',()=>client.destroy());
}
const proxy=http.createServer((req,res)=>{res.writeHead(403);res.end('Only approved HTTPS destinations are allowed.');});
proxy.on('connect',(req,client,head)=>{void(async()=>{const [host,port]=String(req.url).split(':');if(!allowed.has(host)||port!=='443'){client.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}const ip=(await resolve4(host)).find(publicIPv4);if(!ip)throw new Error('No public upstream');pipe(client,ip,443,head);})().catch(()=>client.destroy());});
proxy.listen(8080,'0.0.0.0');
for(const [port,ip,upstreamPort] of [[443,process.env.WS_UPSTREAM_IP,443],[1935,process.env.RTMP_UPSTREAM_IP,1935]]){
 if(!publicIPv4(ip||''))throw new Error('Relay requires an approved public upstream IPv4 address.');
 net.createServer(client=>pipe(client,ip,upstreamPort)).listen(port,'0.0.0.0');
}
console.log('Fixed-destination Twitch/OpenAI test relay ready.');
net.createServer(client=>{const upstream=net.connect({host:'semvod-live',port:5180},()=>{client.pipe(upstream);upstream.pipe(client);});client.on('error',()=>upstream.destroy());upstream.on('error',()=>client.destroy());client.on('close',()=>upstream.destroy());upstream.on('close',()=>client.destroy());}).listen(5180,'0.0.0.0');

// Fixed 0–10 scale, actual release-engine scores. Rebuild without API calls.
import fs from 'node:fs/promises';
import sharp from 'sharp';
const base='docs/verification/',data=JSON.parse(await fs.readFile(base+'semantic-series.json','utf8'));
const colors=['#a78bfa','#fb923c','#22d3ee'],W=1500,H=1000,x=170,width=1240,duration=126;
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="1500" height="1000" fill="#0c1020"/><style>text{font-family:Arial,sans-serif;fill:#e2e8f0} .muted{fill:#94a3b8}</style><text x="70" y="80" font-size="42" font-weight="bold">SemVOD · one stream, three searches</text><text x="70" y="120" font-size="22" class="muted">Real OBS captures · shared timeline · fixed relevance scale, never stretched per query</text>`;
const text=(a,b,s,size=18,cls='')=>`<text x="${a}" y="${b}" font-size="${size}" class="${cls}">${s}</text>`;
for(let row=0;row<3;row++){
 const y=190+row*160,h=100,series=data.series[row];svg+=text(70,y+48,series.query,22);
 for(const v of [0,5,10]){const yy=y+h-v/10*h;svg+=`<path d="M${x} ${yy}H1410" stroke="#26324a"/>`+text(1420,yy+5,String(v),14,'muted');}
 series.scores.forEach((s,i)=>{const t=data.times[i],next=data.times[i+1]??duration;svg+=`<rect x="${x+t/duration*width}" y="${y+h-s/10*h}" width="${Math.max(1,(next-t)/duration*width)}" height="${s/10*h}" fill="${colors[row]}" opacity=".85"/>`;});
}
svg+=text(70,718,'Stacked',22)+text(170,682,'Sum of relevance / 10; components are not probabilities',18,'muted');
const sy=720,sh=125;data.times.forEach((t,i)=>{let sum=0;data.series.forEach((s,j)=>{const v=s.scores[i]/10,next=data.times[i+1]??duration;svg+=`<rect x="${x+t/duration*width}" y="${sy+sh-(sum+v)*sh/3}" width="${Math.max(1,(next-t)/duration*width)}" height="${v*sh/3}" fill="${colors[j]}"/>`;sum+=v;});});
for(const t of [0,30,60,90,120])svg+=text(x+t/duration*width,880,`${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`,18,'muted');
svg+=text(70,930,'Owned illustrated test broadcast · 63 frames / 8 unique images · cat: no returned hits',20)+text(70,963,'gpt-4.1-mini + refinement · relative visual relevance, not calibrated confidence · data and renderer in repo',18,'muted')+'</svg>';
await fs.writeFile(base+'semantic-comparison.svg',svg);await sharp(Buffer.from(svg)).png().toFile(base+'semantic-comparison.png');

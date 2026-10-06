(()=>{
const $=q=>document.querySelector(q),cv=$('#cv'),ctx=cv.getContext('2d'),css=getComputedStyle(document.documentElement),V=n=>css.getPropertyValue(n).trim();
const S={mode:'dice',nc:1,nd:2,sd:6,unit:'pct'};
let counts=[],labels=[],theo=[],lo=0,total=0,sumV=0,mean0=0,lastTxt='',lastK=-1,streak=0,longest=0,running=false,remaining=0,acc=0,tPrev=0,rate=26,hover=-1,W=0,H=0,dpr=1;
const pf=v=>+(v*100).toPrecision(3)+'%';

function setup(){
  running=false;remaining=0;acc=0;total=0;sumV=0;lastTxt='';lastK=-1;streak=0;longest=0;hover=-1;
  if(S.mode==='coin'){
    const n=S.nc;let row=[1];
    for(let i=0;i<n;i++){const nx=[1];for(let j=1;j<row.length;j++)nx.push(row[j-1]+row[j]);nx.push(1);row=nx}
    theo=row.map(c=>c/2**n);lo=0;labels=n===1?['Tails','Heads']:row.map((_,k)=>String(k));
  }else{
    let d=[1];
    for(let i=0;i<S.nd;i++){const nx=new Array(d.length+S.sd).fill(0);d.forEach((c,j)=>{for(let f=1;f<=S.sd;f++)nx[j+f]+=c});d=nx}
    lo=S.nd;const tot=S.sd**S.nd;theo=d.slice(lo).map(c=>c/tot);labels=theo.map((_,k)=>String(lo+k));
  }
  counts=new Array(theo.length).fill(0);
  mean0=theo.reduce((a,p,k)=>a+p*(k+lo),0);
  ui();draw();
}
function sample(keep){
  const parts=keep?[]:null;let v=0;
  if(S.mode==='coin'){for(let i=0;i<S.nc;i++){const h=Math.random()<.5;if(h)v++;if(keep)parts.push(h?'H':'T')}}
  else{for(let i=0;i<S.nd;i++){const f=1+Math.floor(Math.random()*S.sd);v+=f;if(keep)parts.push(f)}}
  if(keep)lastTxt=S.mode==='coin'?(S.nc===1?(parts[0]==='H'?'Heads':'Tails'):parts.join(' ')+' = '+v+' heads'):(S.nd===1?'Rolled '+v:parts.join(' + ')+' = '+v);
  return v-lo;
}
function runBatch(k){
  for(let i=0;i<k;i++){
    const idx=sample(i===k-1);counts[idx]++;total++;sumV+=idx+lo;
    streak=idx===lastK?streak+1:1;lastK=idx;if(streak>longest)longest=streak;
  }
}
const readN=()=>Math.max(1,Math.min(1e6,Math.floor(+$('#tn').value)||1));
function ui(){
  $('#sn').textContent=total.toLocaleString();
  $('#sm').textContent=total?(sumV/total).toFixed(2):'\u2013';
  $('#sml').textContent='Mean (theory '+(+mean0.toFixed(2))+')';
  let gap=0;if(total)counts.forEach((c,i)=>{gap=Math.max(gap,Math.abs(c/total-theo[i]))});
  $('#sg').textContent=total?(gap*100).toFixed(1)+' pts':'\u2013';
  $('#ss').textContent=longest;
  $('#go').textContent=running?'Pause':remaining>0?'Resume':'Run';
  $('#left').textContent=remaining>0?remaining.toLocaleString()+' trials left':total?'Done. Run again to add more trials.':'';
  const t0=+$('#pb').dataset.t||0;
  $('#pb').style.width=(remaining>0&&t0?100*(1-remaining/t0):total?100:0)+'%';
  $('#hint').textContent=!total?'Before you run: which outcome do you expect to be most common?'
    :total<30?'Few trials: bars are lumpy and can stray far from theory. That is normal.'
    :total<1000?'More trials: the bars drift toward the theoretical marks.'
    :'Law of large numbers: percentages settle near theory, while raw counts keep wobbling.';
}
function tick(t){
  if(!running)return;
  acc+=rate*Math.min(.1,(t-tPrev)/1000);tPrev=t;
  let k=Math.floor(acc);acc-=k;k=Math.min(k,remaining,5000);
  if(k>0){runBatch(k);remaining-=k}
  if(remaining<=0){running=false;remaining=0}
  ui();draw();
  if(running)requestAnimationFrame(tick);
}
function start(){running=true;acc=0;tPrev=performance.now();requestAnimationFrame(tick)}
$('#go').addEventListener('click',()=>{
  if(running){running=false}
  else{if(remaining<=0){remaining=readN();$('#pb').dataset.t=remaining}start()}
  ui();
});
$('#step').addEventListener('click',()=>{running=false;runBatch(1);ui();draw()});
$('#fin').addEventListener('click',()=>{
  running=false;let k=remaining>0?remaining:readN();
  while(k>0){const b=Math.min(k,50000);runBatch(b);k-=b}
  remaining=0;ui();draw();
});
$('#rst').addEventListener('click',()=>{$('#pb').dataset.t=0;setup()});
[10,100,1000,10000,100000].forEach(n=>{
  const b=document.createElement('button');b.className='chip';b.textContent=n.toLocaleString();
  b.addEventListener('click',()=>{$('#tn').value=n});$('#presets').append(b);
});
function setMode(m){
  S.mode=m;$('#mdice').setAttribute('aria-pressed',String(m==='dice'));$('#mcoin').setAttribute('aria-pressed',String(m==='coin'));
  $('#fd').hidden=m!=='dice';$('#fc').hidden=m!=='coin';$('#pb').dataset.t=0;setup();
}
$('#mdice').addEventListener('click',()=>setMode('dice'));
$('#mcoin').addEventListener('click',()=>setMode('coin'));
[['nd','nd'],['sd','sd'],['nc','nc']].forEach(([id,k])=>$('#'+id).addEventListener('change',e=>{S[k]=+e.target.value;$('#pb').dataset.t=0;setup()}));
$('#un').addEventListener('change',e=>{S.unit=e.target.value;draw()});
function setSpeed(){const v=+$('#sp').value;rate=Math.round(10**(.3+v*.045));$('#spl').textContent=rate>=1000?(rate/1000).toFixed(rate>=10000?0:1)+'k/s':rate+'/s'}
$('#sp').addEventListener('input',setSpeed);

/* chart */
const nice=v=>{const e=10**Math.floor(Math.log10(v)),f=v/e;return(f<=1?1:f<=2?2:f<=5?5:10)*e};
const geo=()=>{const L=48,R=10,T=10,B=34;return{L,R,T,B,pw:W-L-R,ph:H-T-B,bw:(W-L-R)/Math.max(1,counts.length)}};
function draw(){
  if(!W||!H)return;
  const {L,T,B,pw,ph,bw}=geo(),m=counts.length,pct=S.unit==='pct';
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=V('--cv');ctx.fillRect(0,0,W,H);
  const ov=i=>pct?(total?counts[i]/total*100:0):counts[i],tv=i=>pct?theo[i]*100:theo[i]*total;
  let ym=0;for(let i=0;i<m;i++)ym=Math.max(ym,ov(i),tv(i));
  if(ym<=0)ym=1;
  let step=nice(ym*1.12/4);if(!pct)step=Math.max(1,step);
  const top=Math.ceil(ym*1.05/step)*step,Y=v=>T+ph-v/top*ph;
  ctx.font='12px ui-sans-serif,system-ui,sans-serif';ctx.textBaseline='middle';ctx.lineWidth=1;
  for(let t=0;t<=top+1e-9;t+=step){
    const y=Math.round(Y(t))+.5;ctx.strokeStyle=V('--gm');ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(W-10,y);ctx.stroke();
    ctx.fillStyle=V('--mute');ctx.textAlign='right';ctx.fillText(+t.toFixed(2)+(pct?'%':''),L-6,y);
  }
  if(hover>=0){ctx.fillStyle=V('--gm');ctx.fillRect(L+hover*bw,T,bw,ph)}
  ctx.fillStyle=V('--obs');
  for(let i=0;i<m;i++){const h=ov(i)/top*ph;if(h>0)ctx.fillRect(L+i*bw+bw*.12,T+ph-h,bw*.76,h)}
  ctx.strokeStyle=V('--th');ctx.fillStyle=V('--th');ctx.lineWidth=1.5;ctx.globalAlpha=.8;
  if(m>1){ctx.beginPath();for(let i=0;i<m;i++){const x=L+(i+.5)*bw,y=Y(tv(i));i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
  ctx.globalAlpha=1;
  for(let i=0;i<m;i++){ctx.beginPath();ctx.arc(L+(i+.5)*bw,Y(tv(i)),Math.min(5,Math.max(2.5,bw/5)),0,7);ctx.fill()}
  ctx.fillStyle=V('--mute');ctx.textAlign='center';ctx.textBaseline='top';
  const every=Math.ceil(m/Math.max(1,Math.floor(pw/(labels[0].length>3?52:26))));
  for(let i=0;i<m;i+=every)ctx.fillText(labels[i],L+(i+.5)*bw,T+ph+6);
  ctx.fillText(S.mode==='coin'?(S.nc===1?'Outcome of one flip':'Number of heads'):(S.nd===1?'Face rolled':'Sum of dice'),L+pw/2,T+ph+B-14);
  $('#info').textContent=hover>=0&&hover<m
    ?labels[hover]+': '+counts[hover].toLocaleString()+' of '+total.toLocaleString()+' ('+(total?pf(counts[hover]/total):'0%')+') vs theory '+pf(theo[hover])
    :lastTxt?'Last trial: '+lastTxt:'Tap or hover a bar to compare it with theory.';
}
function aim(e){const {L,bw}=geo(),i=Math.floor((e.offsetX-L)/bw);hover=i>=0&&i<counts.length?i:-1;draw()}
cv.addEventListener('pointermove',aim);cv.addEventListener('pointerdown',aim);
cv.addEventListener('pointerleave',()=>{hover=-1;draw()});
new ResizeObserver(()=>{
  const r=cv.getBoundingClientRect();W=r.width;H=r.height;dpr=window.devicePixelRatio||1;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);draw();
}).observe(cv);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',draw);
setSpeed();setup();
})();
(()=>{
const $=q=>document.querySelector(q),cv=$('#cv'),ctx=cv.getContext('2d'),off=document.createElement('canvas'),octx=off.getContext('2d');
const MAPS={
  Ocean:[[0,'#02101f'],[.35,'#0a3d6b'],[.55,'#1b86b5'],[.8,'#7fd6e8'],[1,'#ffffff']],
  Ember:[[0,'#0a0203'],[.35,'#5a0f0a'],[.6,'#d2481a'],[.85,'#ffb347'],[1,'#fff6d6']],
  Aurora:[[0,'#07051a'],[.4,'#2b1a6b'],[.6,'#1f9d8f'],[.85,'#7dff9b'],[1,'#f2fff0']],
  Mono:[[0,'#0b0b0e'],[.5,'#5d6068'],[1,'#f4f4f6']]
};
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function lut(st){
  const L=new Uint32Array(256);
  for(let i=0;i<256;i++){
    const t=i/255;let k=1;while(k<st.length-1&&st[k][0]<t)k++;
    const a=st[k-1],b=st[k],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0]))),A=hex(a[1]),B=hex(b[1]);
    const c=A.map((v,j)=>Math.round(v+(B[j]-v)*u));
    L[i]=((255<<24)|(c[2]<<16)|(c[1]<<8)|c[0])>>>0;
  }
  return L;
}
let w=0,h=0,cur,prev,img,px,r=5,L=lut(MAPS.Ocean),damp=.99,amp=60,rain=false;
function alloc(){
  const gw=Math.min(380,Math.ceil(innerWidth/3)),gh=Math.max(40,Math.round(innerHeight*gw/innerWidth));
  if(cur&&gw===w&&Math.abs(gh-h)<h*.1)return;
  w=gw;h=gh;cur=new Float32Array(w*h);prev=new Float32Array(w*h);
  off.width=w;off.height=h;img=octx.createImageData(w,h);px=new Uint32Array(img.data.buffer);px.fill(L[128]);
  r=Math.max(2,Math.ceil(15/(innerWidth/w)));
}
function sizeCanvas(){const d=Math.min(devicePixelRatio||1,2);cv.width=Math.round(innerWidth*d);cv.height=Math.round(innerHeight*d)}
function resize(){alloc();sizeCanvas()}
addEventListener('resize',resize);resize();

function stamp(gx,gy,a){
  const cx=Math.round(gx),cy=Math.round(gy);
  for(let dy=-r;dy<=r;dy++){
    const y=cy+dy;if(y<1||y>=h-1)continue;
    for(let dx=-r;dx<=r;dx++){
      const x=cx+dx;if(x<1||x>=w-1)continue;
      const d=Math.hypot(dx,dy);if(d>=r)continue;
      const i=y*w+x,v=cur[i]+a*(.5+.5*Math.cos(Math.PI*d/r));
      cur[i]=v>600?600:v<-600?-600:v;
    }
  }
}
function step(){
  for(let y=1;y<h-1;y++){
    let i=y*w+1;
    for(let x=1;x<w-1;x++,i++)prev[i]=((cur[i-1]+cur[i+1]+cur[i-w]+cur[i+w])*.5-prev[i])*damp;
  }
  const t=cur;cur=prev;prev=t;
}
function render(){
  for(let y=1;y<h-1;y++){
    let i=y*w+1;
    for(let x=1;x<w-1;x++,i++){
      const s=(cur[i-1]-cur[i+1]+cur[i-w]-cur[i+w])*1.2;
      let t=128+cur[i]*.25+s;
      px[i]=L[t<0?0:t>255?255:t|0];
    }
  }
  octx.putImageData(img,0,0);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(off,0,0,cv.width,cv.height);
}
let last=0,acc=0;
function frame(t){
  const dt=Math.min(.05,(t-last)/1000||0);last=t;acc+=dt;
  if(rain&&Math.random()<.05)stamp(Math.random()*w,Math.random()*h,amp*1.3);
  let n=0;while(acc>=1/120&&n<4){step();acc-=1/120;n++}
  if(n===4)acc=0;
  render();requestAnimationFrame(frame);
}

/* pointers */
const ptr=new Map();
const gp=e=>[e.clientX/innerWidth*w,e.clientY/innerHeight*h];
function hideHint(){$('#hint').classList.add('off')}
cv.addEventListener('pointerdown',e=>{
  cv.setPointerCapture(e.pointerId);const p=gp(e);ptr.set(e.pointerId,p);
  stamp(p[0],p[1],amp*1.5);hideHint();
});
cv.addEventListener('pointermove',e=>{
  const o=ptr.get(e.pointerId);if(!o)return;
  const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];
  for(const ev of (evs.length?evs:[e])){
    const p=gp(ev),dx=p[0]-o[0],dy=p[1]-o[1],dist=Math.hypot(dx,dy);
    if(dist<.05)continue;
    const n=Math.ceil(dist/(r*.5)),wt=Math.min(1,dist/(r*.5)/n);
    for(let k=1;k<=n;k++)stamp(o[0]+dx*k/n,o[1]+dy*k/n,amp*wt*.6);
    o[0]=p[0];o[1]=p[1];
  }
});
const up=e=>ptr.delete(e.pointerId);
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);

/* controls */
const setDamp=()=>{damp=.9992-.045*($('#vi').value/100)};
const setAmp=()=>{amp=$('#st').value*1.2};
$('#vi').addEventListener('input',setDamp);$('#st').addEventListener('input',setAmp);setDamp();setAmp();
Object.keys(MAPS).forEach((name,i)=>{
  const b=document.createElement('button'),l=lut(MAPS[name]);
  b.innerHTML='<span></span>';b.firstChild.textContent=name;b.setAttribute('aria-pressed',String(i===0));
  b.style.background='linear-gradient(90deg,'+MAPS[name].map(s=>s[1]+' '+s[0]*100+'%').join(',')+')';
  b.addEventListener('click',()=>{
    L=lut(MAPS[name]);px.fill(L[128]);
    document.querySelectorAll('#maps button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  });
  $('#maps').append(b);
});
$('#clr').addEventListener('click',()=>{cur.fill(0);prev.fill(0)});
$('#rain').addEventListener('change',e=>{rain=e.target.checked;if(rain)hideHint()});
$('#tg').addEventListener('click',()=>{
  const p=$('#panel'),m=p.classList.toggle('min');
  $('#tg').textContent=m?'Controls':'Hide';$('#tg').setAttribute('aria-expanded',String(!m));
});
requestAnimationFrame(frame);
})();
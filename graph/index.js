(()=>{
const $=q=>document.querySelector(q);
const cv=$('#cv'),ctx=cv.getContext('2d'),stage=$('#stage'),R=$('#read'),list=$('#list');
const css=getComputedStyle(document.documentElement),V=n=>css.getPropertyValue(n).trim();
let W=0,H=0,dpr=1,cx=0,cy=0,s=60,cur=null,grid=true,raf=0,first=true;
const funcs=[];
const CONST={pi:Math.PI,e:Math.E,tau:2*Math.PI};
const FN={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sinh:Math.sinh,cosh:Math.cosh,tanh:Math.tanh,sqrt:Math.sqrt,cbrt:Math.cbrt,abs:Math.abs,ln:Math.log,log:Math.log10,exp:Math.exp,floor:Math.floor,ceil:Math.ceil,round:Math.round,sign:Math.sign};
const EX=['sin(x)','x^2 - 4','1/x','tan(x)','sqrt(x)','e^(-x^2)','sin(x)/x','ln(x)','abs(x)','x^3 - 3x','2sin(3x) + cos(x)'];

/* parser[no eval] */
function tokenize(str){
  const t=[];let i=0,m;
  while(i<str.length){
    const c=str[i],rest=str.slice(i);
    if(/\s/.test(c)){i++;continue}
    if(m=/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(rest)){t.push({t:'num',v:parseFloat(m[0])});i+=m[0].length;continue}
    if(m=/^[a-z_]+/i.exec(rest)){t.push({t:'id',v:m[0].toLowerCase()});i+=m[0].length;continue}
    if('+-*/^()'.includes(c)){t.push({t:'op',v:c});i++;continue}
    if(c==='\u00d7'||c==='\u00b7'){t.push({t:'op',v:'*'});i++;continue}
    if(c==='\u2212'){t.push({t:'op',v:'-'});i++;continue}
    throw new Error('Unexpected "'+c+'"');
  }
  return t;
}
const RO={num:v=>v,add:(a,b)=>a+b,sub:(a,b)=>a-b,mul:(a,b)=>a*b,div:(a,b)=>a/b,pow:Math.pow,neg:a=>-a,C:CONST,F:FN};
const cmul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
const cdiv=(a,b)=>{const d=b[0]*b[0]+b[1]*b[1];return[(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d]};
const cexp=a=>{const m=Math.exp(a[0]);return[m*Math.cos(a[1]),m*Math.sin(a[1])]};
const cln=a=>[Math.log(Math.hypot(a[0],a[1])),Math.atan2(a[1],a[0])];
const cpow=(a,b)=>a[0]===0&&a[1]===0?(b[0]>0?[0,0]:[NaN,NaN]):cexp(cmul(b,cln(a)));
const CF={exp:cexp,ln:cln,log:a=>{const l=cln(a);return[l[0]/Math.LN10,l[1]/Math.LN10]},sqrt:a=>cpow(a,[.5,0]),
sin:a=>[Math.sin(a[0])*Math.cosh(a[1]),Math.cos(a[0])*Math.sinh(a[1])],cos:a=>[Math.cos(a[0])*Math.cosh(a[1]),-Math.sin(a[0])*Math.sinh(a[1])],
sinh:a=>[Math.sinh(a[0])*Math.cos(a[1]),Math.cosh(a[0])*Math.sin(a[1])],cosh:a=>[Math.cosh(a[0])*Math.cos(a[1]),Math.sinh(a[0])*Math.sin(a[1])],
abs:a=>[Math.hypot(a[0],a[1]),0],re:a=>[a[0],0],im:a=>[a[1],0],conj:a=>[a[0],-a[1]],arg:a=>[Math.atan2(a[1],a[0]),0]};
CF.tan=a=>cdiv(CF.sin(a),CF.cos(a));CF.tanh=a=>cdiv(CF.sinh(a),CF.cosh(a));
const CO={num:v=>[v,0],add:(a,b)=>[a[0]+b[0],a[1]+b[1]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1]],mul:cmul,div:cdiv,pow:cpow,neg:a=>[-a[0],-a[1]],C:{pi:[Math.PI,0],e:[Math.E,0],tau:[2*Math.PI,0],i:[0,1]},F:CF};
let mode3=false,yaw=-.6,pitch=.6,zoom3=1,R3=4,dirty3=true,mesh3=[];
function compile(src,O){
  src=src.trim().replace(/^(y|f\(z\)|f\(x\))\s*=\s*/i,'').replace(/\u03c0/g,'pi');
  if(!src)throw new Error('Enter an equation');
  const T=tokenize(src);let p=0;
  const isOp=o=>T[p]&&T[p].t==='op'&&T[p].v===o;
  const close=()=>{if(!isOp(')'))throw new Error('Missing closing parenthesis');p++};
  function expr(){let l=term();while(isOp('+')||isOp('-')){const g=T[p++].v==='+'?O.add:O.sub,r=term(),a=l;l=x=>g(a(x),r(x))}return l}
  function term(){
    let l=unary();
    for(;;){
      const k=T[p];if(!k)break;
      let g,r;
      if(k.t==='op'&&(k.v==='*'||k.v==='/')){p++;g=k.v==='/'?O.div:O.mul;r=unary()}
      else if(k.t==='num'||k.t==='id'||(k.t==='op'&&k.v==='(')){g=O.mul;r=power()}
      else break;
      const a=l,b=r;l=x=>g(a(x),b(x));
    }
    return l;
  }
  function unary(){
    if(isOp('-')){p++;const a=unary();return x=>O.neg(a(x))}
    if(isOp('+')){p++;return unary()}
    return power();
  }
  function power(){const b=primary();if(isOp('^')){p++;const e=unary();return x=>O.pow(b(x),e(x))}return b}
  function primary(){
    const k=T[p++];
    if(!k)throw new Error('The equation ends too soon');
    if(k.t==='num'){const v=O.num(k.v);return()=>v}
    if(k.t==='id'){
      if(k.v==='x'||k.v==='z')return x=>x;
      if(k.v in O.C){const v=O.C[k.v];return()=>v}
      if(k.v in O.F){
        if(!isOp('('))throw new Error('Put the argument in parentheses, like '+k.v+'(x)');
        p++;const a=expr();close();const f=O.F[k.v];return x=>f(a(x));
      }
      if(k.v==='i')throw new Error('i is imaginary. Switch to 3D complex mode to use it');
      throw new Error('Unknown name "'+k.v+'". '+(O===CO?'Use z, i, pi, e or a function like sin(z)':'Use x, pi, e or a function like sin(x)'));
    }
    if(k.v==='('){const a=expr();close();return a}
    throw new Error('Unexpected "'+k.v+'"');
  }
  const f=expr();
  if(p<T.length)throw new Error('Unexpected "'+T[p].v+'"');
  return f;
}

/* view math */
const toX=px=>(px-W/2)/s+cx, toY=py=>cy-(py-H/2)/s;
const fromX=x=>(x-cx)*s+W/2, fromY=y=>H/2-(y-cy)*s;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function zoomAt(px,py,k){if(mode3){zoom3=clamp(zoom3*k,.3,6);kick();return}const wx=toX(px),wy=toY(py);s=clamp(s*k,0.01,1e7);cx=wx-(px-W/2)/s;cy=wy+(py-H/2)/s;kick()}
function resetView(){if(mode3){yaw=-.6;pitch=.6;zoom3=1;kick();return}s=Math.max(20,Math.min(W,H)/13);cx=0;cy=0;kick()}
const kick=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;draw()})};

/* formatting */
const fmt=v=>{const a=Math.abs(v);if(v===0)return'0';if(a>=1e7||a<1e-4)return v.toExponential(1).replace('e+','e');return String(+v.toPrecision(10))};
const fmt5=v=>{const a=Math.abs(v);if(a!==0&&(a>=1e7||a<1e-4))return v.toExponential(3);return String(+v.toPrecision(6))};
const fixed=(v,d)=>(+v.toFixed(d)).toFixed(d);

/* drawing */
function niceStep(){const raw=80/s,m=10**Math.floor(Math.log10(raw)),r=raw/m,k=r<=1.5?1:r<=3.5?2:r<=7.5?5:10;return{step:k*m,div:k===2?4:5}}
function label(txt,x,y,align){ctx.textAlign=align;ctx.strokeText(txt,x,y);ctx.fillText(txt,x,y)}
function draw(){
  if(!W||!H)return;
  if(mode3){draw3();return}
  const cvc=V('--cv');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle=cvc;ctx.fillRect(0,0,W,H);
  const {step,div}=niceStep(),minor=step/div;
  const x0=toX(0),x1=toX(W),y1=toY(0),y0=toY(H);
  ctx.lineWidth=1;
  if(grid){
    const pm=new Path2D(),pM=new Path2D();
    for(let k=Math.ceil(x0/minor);k<=Math.floor(x1/minor);k++){const px=Math.round(fromX(k*minor))+.5,P=k%div===0?pM:pm;P.moveTo(px,0);P.lineTo(px,H)}
    for(let k=Math.ceil(y0/minor);k<=Math.floor(y1/minor);k++){const py=Math.round(fromY(k*minor))+.5,P=k%div===0?pM:pm;P.moveTo(0,py);P.lineTo(W,py)}
    ctx.strokeStyle=V('--gm');ctx.stroke(pm);ctx.strokeStyle=V('--gM');ctx.stroke(pM);
  }
  const ax=fromX(0),ay=fromY(0);
  ctx.strokeStyle=V('--ax');ctx.lineWidth=1.5;ctx.beginPath();
  if(ay>=0&&ay<=H){ctx.moveTo(0,ay);ctx.lineTo(W,ay)}
  if(ax>=0&&ax<=W){ctx.moveTo(ax,0);ctx.lineTo(ax,H)}
  ctx.stroke();
  // tick labels
  ctx.font='12px ui-sans-serif,system-ui,sans-serif';ctx.lineJoin='round';ctx.lineWidth=3;
  ctx.strokeStyle=cvc;ctx.fillStyle=V('--mute');
  const ly=clamp(ay+15,15,H-7);
  for(let k=Math.ceil(x0/step);k<=Math.floor(x1/step);k++){
    const v=+(k*step).toPrecision(12);
    if(k===0&&ax>=0&&ax<=W){label('0',ax-5,ly,'right');continue}
    label(fmt(v),fromX(v),ly,'center');
  }
  const leftSide=ax<44,lx=leftSide?Math.max(6,ax+6):Math.min(ax-6,W-6);
  for(let k=Math.ceil(y0/step);k<=Math.floor(y1/step);k++){
    if(k===0)continue;
    const v=+(k*step).toPrecision(12);
    label(fmt(v),lx,fromY(v)+4,leftSide?'left':'right');
  }
  // axis names
  ctx.font='italic 16px Georgia,serif';ctx.fillStyle=V('--ax');
  label('x',W-14,clamp(ay,26,H-26)-9,'center');
  label('y',clamp(ax,26,W-26)+11,16,'center');
  // curves
  funcs.forEach((f,i)=>{
    f.n=0;
    if(!f.fn||!f.show){f.warn='';showMsg(f);return}
    const color=V('--c'+f.ci);
    ctx.strokeStyle=color;ctx.lineWidth=2.4;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();
    let prev=null;
    for(let px=-1;px<=W+1;px++){
      let y;try{y=f.fn(toX(px))}catch(e){y=NaN}
      if(typeof y!=='number'||!isFinite(y)){prev=null;continue}
      const py=clamp(fromY(y),-5e4,5e4);
      if(prev!==null&&Math.abs(py-prev)<H*2)ctx.lineTo(px,py);else ctx.moveTo(px,py);
      prev=py;f.n++;
    }
    ctx.stroke();
    f.warn=f.n===0?'No real values in this view. Pan or zoom out.':'';showMsg(f);
  });
  // cursor guide
  if(cur){
    ctx.setLineDash([4,4]);ctx.lineWidth=1;ctx.strokeStyle=V('--mute');
    ctx.beginPath();ctx.moveTo(cur.x+.5,0);ctx.lineTo(cur.x+.5,H);ctx.stroke();ctx.setLineDash([]);
    const x=toX(cur.x);
    funcs.forEach(f=>{
      if(!f.fn||!f.show)return;
      let v;try{v=f.fn(x)}catch(e){v=NaN}
      if(typeof v!=='number'||!isFinite(v))return;
      const py=fromY(v);if(py<-10||py>H+10)return;
      ctx.fillStyle=cvc;ctx.strokeStyle=V('--c'+f.ci);ctx.lineWidth=2.4;
      ctx.beginPath();ctx.arc(cur.x,py,5,0,7);ctx.fill();ctx.stroke();
    });
  }
  readout();
}
function line(color,txt){
  const d=document.createElement('div');
  if(color){const o=document.createElement('span');o.className='dot';o.style.background=color;d.append(o)}
  d.append(document.createTextNode(txt));return d;
}
function readout(){
  if(!cur){R.hidden=true;return}
  R.hidden=false;R.replaceChildren();
  const d=clamp(Math.ceil(Math.log10(s))+1,0,8),x=toX(cur.x),y=toY(cur.y);
  R.append(line(null,'x = '+fixed(x,d)+'   y = '+fixed(y,d)));
  funcs.forEach(f=>{
    if(!f.fn||!f.show)return;
    let v;try{v=f.fn(x)}catch(e){v=NaN}
    const name=f.src.trim().replace(/^y\s*=\s*/i,'');
    R.append(line(V('--c'+f.ci),(name.length>22?name.slice(0,21)+'\u2026':name)+' = '+(typeof v==='number'&&isFinite(v)?fmt5(v):'undefined')));
  });
}

/* equation list */
function showMsg(f){
  const t=f.err||f.warn;
  if(f.msg.textContent!==t)f.msg.textContent=t;
  f.msg.className='msg'+(f.err?'':' warn');
}
function setSrc(f,v){
  f.src=v;
  if(!v.trim()){f.fn=null;f.err=''}
  else try{f.fn=compile(v,mode3?CO:RO);f.err=''}catch(e){f.fn=null;f.err=e.message}
  f.inp.setAttribute('aria-invalid',f.err?'true':'false');
  f.warn='';showMsg(f);dirty3=true;kick();
}
function addFunc(src){
  if(funcs.length>=6)return null;
  const used=new Set(funcs.map(f=>f.ci));let ci=0;while(used.has(ci))ci++;
  const f={src:'',fn:null,err:'',warn:'',show:true,ci,n:0};
  const w=document.createElement('div');w.className='fn';
  w.innerHTML='<div class="row"><button class="sw" style="--c:var(--c'+ci+')" aria-pressed="true" aria-label="Show or hide this curve"></button><span class="y">'+(mode3?'f(z) =':'y =')+'</span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="e.g. sin(x)/x" aria-label="Equation"><button class="del" aria-label="Remove equation">&times;</button></div><div class="msg" role="status"></div>';
  f.inp=w.querySelector('input');f.msg=w.querySelector('.msg');f.sw=w.querySelector('.sw');
  f.inp.addEventListener('input',()=>setSrc(f,f.inp.value));
  f.sw.addEventListener('click',()=>{f.show=!f.show;f.sw.setAttribute('aria-pressed',String(f.show));dirty3=true;kick()});
  w.querySelector('.del').addEventListener('click',()=>{funcs.splice(funcs.indexOf(f),1);w.remove();upd();dirty3=true;kick()});
  funcs.push(f);list.append(w);
  if(src){f.inp.value=src;setSrc(f,src)}
  upd();return f;
}
const upd=()=>{$('#add').disabled=funcs.length>=6};
$('#add').addEventListener('click',()=>{const f=addFunc('');if(f)f.inp.focus()});
/* 3D complex surface */
const cstr=(a,b)=>fmt5(a)+(b<0?' \u2212 ':' + ')+fmt5(Math.abs(b))+'i';
function draw3(){
  const N=44,Rr=R3,hm=+$('#hm').value,fl=hm===0?0:-Rr;
  if(dirty3){
    mesh3=funcs.map(f=>{
      if(!f.fn||!f.show)return null;
      const g=[];
      for(let i=0;i<=N;i++){g[i]=[];for(let j=0;j<=N;j++){
        const re=-Rr+2*Rr*i/N,im=-Rr+2*Rr*j/N;let w;
        try{w=f.fn([re,im])}catch(e){w=[NaN,NaN]}
        const h=hm===0?Math.hypot(w[0],w[1]):hm===1?w[0]:w[1];
        g[i][j]={re,im,w,h:isFinite(h)?clamp(h,-Rr,Rr):NaN,hue:(Math.atan2(w[1],w[0])*57.2958+360)%360};
      }}
      return g;
    });dirty3=false;
  }
  const cyw=Math.cos(yaw),syw=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),sc=Math.min(W,H)/(Rr*3.4)*zoom3,Zc=hm===0?Rr/2:0;
  const P=(X,Y,Z)=>{const x1=X*cyw-Y*syw,y1=X*syw+Y*cyw,u=(Z-Zc)*cp+y1*sp;return[W/2+x1*sc,H/2-u*sc,y1*cp-(Z-Zc)*sp]};
  const cvc=V('--cv');
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=cvc;ctx.fillRect(0,0,W,H);
  ctx.lineWidth=1;ctx.strokeStyle=V('--gM');ctx.beginPath();
  if(grid)for(let k=-Rr;k<=Rr;k+=Rr/4){const a1=P(k,-Rr,fl),b1=P(k,Rr,fl),a2=P(-Rr,k,fl),b2=P(Rr,k,fl);ctx.moveTo(a1[0],a1[1]);ctx.lineTo(b1[0],b1[1]);ctx.moveTo(a2[0],a2[1]);ctx.lineTo(b2[0],b2[1])}
  ctx.stroke();
  ctx.strokeStyle=V('--ax');ctx.lineWidth=1.5;ctx.beginPath();
  let a=P(-Rr,0,fl),b=P(Rr,0,fl);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
  a=P(0,-Rr,fl);b=P(0,Rr,fl);ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();
  const fc=funcs.map(f=>V('--c'+f.ci)),multi=funcs.filter(f=>f.fn&&f.show).length>1,quads=[],pts=[];
  mesh3.forEach((g,fi)=>{
    if(!g)return;
    const pp=g.map(row=>row.map(c=>isNaN(c.h)||isNaN(c.hue)?null:P(c.re,c.im,c.h))),st=2*Rr/N;
    g.forEach((row,i)=>row.forEach((c,j)=>{if(pp[i][j])pts.push({p:pp[i][j],c,fi})}));
    for(let i=0;i<N;i++)for(let j=0;j<N;j++){
      const A=g[i][j],B=g[i+1][j],C=g[i+1][j+1],D=g[i][j+1],q=[pp[i][j],pp[i+1][j],pp[i+1][j+1],pp[i][j+1]];
      if(q.some(v=>!v))continue;
      const sl=((B.h+C.h)-(A.h+D.h)+((D.h+C.h)-(A.h+B.h))*.5)/(4*st);
      quads.push({q,d:q[0][2]+q[1][2]+q[2][2]+q[3][2],hue:A.hue,L:clamp(54-sl*14,28,76),fi});
    }
  });
  quads.sort((u,v)=>v.d-u.d);
  ctx.lineWidth=.8;ctx.lineJoin='round';
  for(const k of quads){
    const col='hsl('+k.hue.toFixed(0)+' 70% '+k.L.toFixed(0)+'%)';
    ctx.fillStyle=col;ctx.strokeStyle=multi?fc[k.fi]:col;
    ctx.beginPath();ctx.moveTo(k.q[0][0],k.q[0][1]);
    for(let m=1;m<4;m++)ctx.lineTo(k.q[m][0],k.q[m][1]);
    ctx.closePath();ctx.fill();ctx.stroke();
  }
  ctx.font='italic 15px Georgia,serif';ctx.lineWidth=3;ctx.strokeStyle=cvc;ctx.fillStyle=V('--ax');
  a=P(Rr*1.14,0,fl);label('Re z',a[0],a[1]+5,'center');
  a=P(0,Rr*1.14,fl);label('Im z',a[0],a[1]+5,'center');
  R.replaceChildren();R.hidden=true;
  if(cur){
    let best=null,bk=1e9;
    for(const t of pts){const dx=t.p[0]-cur.x,dy=t.p[1]-cur.y,d2=dx*dx+dy*dy;if(d2<484){const k=d2+8*t.p[2];if(k<bk){bk=k;best=t}}}
    if(best){
      const c=best.c,w=c.w;
      ctx.fillStyle=cvc;ctx.strokeStyle=V('--ax');ctx.lineWidth=2;ctx.beginPath();ctx.arc(best.p[0],best.p[1],5,0,7);ctx.fill();ctx.stroke();
      R.hidden=false;
      R.append(line(null,'z = '+cstr(c.re,c.im)),line(fc[best.fi],'f(z) = '+cstr(w[0],w[1])),line(null,'|f(z)| = '+fmt5(Math.hypot(w[0],w[1]))));
    }
  }
}
const EX3=['z^2','z^3 - 1','1/z','exp(z)','sin(z)','(z^2 - 1)/(z^2 + 1)','sqrt(z)','ln(z)','abs(z)','z^2 + i'];
function chips(){
  const c=$('#chips');c.replaceChildren();
  (mode3?EX3:EX).forEach(t=>{
    const b=document.createElement('button');b.className='chip';b.textContent=t;
    b.addEventListener('click',()=>{
      const f=funcs.find(f=>!f.src.trim())||addFunc('')||funcs[funcs.length-1];
      f.inp.value=t;setSrc(f,t);
    });
    c.append(b);
  });
}
function setMode(m){
  mode3=m;dirty3=true;cur=null;
  $('#m2').setAttribute('aria-pressed',String(!m));$('#m3').setAttribute('aria-pressed',String(m));
  $('#c3').hidden=!m;cv.style.cursor=m?'grab':'crosshair';
  $('#hint').textContent=m?'Drag to rotate, scroll or pinch to zoom. Hover or tap the surface to read values. Color shows the phase of f(z), height shows the value you pick.':'Drag to pan, scroll or pinch to zoom. Hover or tap the graph to read values.';
  document.querySelectorAll('.y').forEach(e=>e.textContent=m?'f(z) =':'y =');
  funcs.forEach(f=>{f.inp.placeholder=m?'e.g. z^2 + 1':'e.g. sin(x)/x';setSrc(f,f.src)});
  chips();R.hidden=true;kick();
}
$('#m2').addEventListener('click',()=>setMode(false));
$('#m3').addEventListener('click',()=>setMode(true));
$('#hm').addEventListener('change',()=>{dirty3=true;kick()});
$('#rg').addEventListener('change',e=>{R3=+e.target.value;dirty3=true;kick()});
chips();

/* interaction */
const ptrs=new Map();
cv.addEventListener('pointerdown',e=>{
  cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  cur={x:e.offsetX,y:e.offsetY};kick();
});
cv.addEventListener('pointermove',e=>{
  const nx=e.offsetX,ny=e.offsetY,p=ptrs.get(e.pointerId);
  if(!p){if(e.pointerType==='mouse'){cur={x:nx,y:ny};kick()}return}
  if(ptrs.size===1){if(mode3){yaw-=(nx-p.x)*.009;pitch=clamp(pitch+(ny-p.y)*.009,.05,1.55)}else{cx-=(nx-p.x)/s;cy+=(ny-p.y)/s}cur={x:nx,y:ny};kick()}
  else if(ptrs.size===2){
    const o=[...ptrs.values()].find(q=>q!==p),d0=Math.hypot(p.x-o.x,p.y-o.y),d1=Math.hypot(nx-o.x,ny-o.y);
    if(d0>0)zoomAt((nx+o.x)/2,(ny+o.y)/2,d1/d0);
  }
  p.x=nx;p.y=ny;
});
const end=e=>ptrs.delete(e.pointerId);
cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
cv.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!ptrs.size){cur=null;kick()}});
cv.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.offsetX,e.offsetY,Math.exp(-e.deltaY*(e.deltaMode?0.05:0.0015)))},{passive:false});
cv.addEventListener('dblclick',e=>zoomAt(e.offsetX,e.offsetY,2));
cv.addEventListener('keydown',e=>{
  const k=e.key,m=40;let h=true;
  if(k==='ArrowLeft')cx-=m/s;else if(k==='ArrowRight')cx+=m/s;
  else if(k==='ArrowUp')cy+=m/s;else if(k==='ArrowDown')cy-=m/s;
  else if(k==='+'||k==='=')zoomAt(W/2,H/2,1.3);else if(k==='-')zoomAt(W/2,H/2,1/1.3);
  else if(k==='0')resetView();else h=false;
  if(h){e.preventDefault();kick()}
});
$('#zi').addEventListener('click',()=>zoomAt(W/2,H/2,1.4));
$('#zo').addEventListener('click',()=>zoomAt(W/2,H/2,1/1.4));
$('#rs').addEventListener('click',resetView);
$('#gr').addEventListener('change',e=>{grid=e.target.checked;kick()});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',kick);

new ResizeObserver(()=>{
  const r=stage.getBoundingClientRect();W=r.width;H=r.height;dpr=window.devicePixelRatio||1;
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  if(first&&W){first=false;s=Math.max(20,Math.min(W,H)/13)}
  draw();
}).observe(stage);

addFunc('sin(x)');addFunc('x^2/4 - 2');
})();
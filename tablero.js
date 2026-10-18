// Tablero del barrio en 3D (isométrico). Dibuja el escenario y mueve las fichas.
window.Tablero = (function () {
const C=0.866,S=80;
const P=(x,y,z=0)=>[(x-y)*C*S,(x+y)*0.5*S-z*S];
const pts=a=>a.map(p=>P(...p).map(v=>v.toFixed(1)).join(',')).join(' ');
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const m=v=>Math.max(0,Math.min(255,Math.round(f<0?v*(1+f):v+(255-v)*f)));return `rgb(${m(r)},${m(g)},${m(b)})`}
const items=[];const add=(depth,svg)=>items.push({depth,svg});
const poly=(a,fill,extra='')=>`<polygon points="${pts(a)}" fill="${fill}" ${extra}/>`;
function prism(x,y,w,d,h,col,z0=0){const t=z0+h;
  return poly([[x,y+d,t],[x+w,y+d,t],[x+w,y+d,z0],[x,y+d,z0]],shade(col,-.18))+poly([[x+w,y,t],[x+w,y+d,t],[x+w,y+d,z0],[x+w,y,z0]],shade(col,-.34))+poly([[x,y,t],[x+w,y,t],[x+w,y+d,t],[x,y+d,t]],col);}
const Z=0.22; // ground top

// ---------- roads ----------
function cr(p,n=12){const o=[];for(let i=0;i<p.length-1;i++){const p0=p[Math.max(0,i-1)],p1=p[i],p2=p[i+1],p3=p[Math.min(p.length-1,i+2)];for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;o.push([0,1].map(j=>.5*((2*p1[j])+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3)))}}o.push(p[p.length-1]);return o}
function offs(s,off){return s.map((p,i)=>{const a=s[Math.max(0,i-1)],b=s[Math.min(s.length-1,i+1)];let tx=b[0]-a[0],ty=b[1]-a[1];const l=Math.hypot(tx,ty)||1;return [p[0]-ty/l*off,p[1]+tx/l*off]})}
function band(s,w,col,z){const L=offs(s,w/2),R=offs(s,-w/2).reverse();return poly([...L,...R].map(([x,y])=>[x,y,z]),col)}
const line=(s,off,z,col,wd,dash='')=>`<polyline points="${pts(offs(s,off).map(([x,y])=>[x,y,z]))}" fill="none" stroke="${col}" stroke-width="${wd}" stroke-linecap="round" stroke-dasharray="${dash}"/>`;
const roads={
  main:cr([[-0.4,3],[1.0,3],[2.2,3]]),
  mesa:cr([[2.2,3],[3.0,1.6],[3.8,1.3],[6.0,1.3],[7.6,1.3],[8.3,1.65],[8.9,3]]),
  casa:cr([[2.2,3],[3.0,4.4],[3.8,4.7],[6.0,4.7],[7.6,4.7],[8.3,4.35],[8.9,3]]),
  end:cr([[8.9,3],[10.3,3],[11.6,3],[12.4,3.0]])};
let R1='',R2='',R3='';
for(const k in roads){R1+=band(roads[k],1.12,'#A9784C',Z+.005);}
for(const k in roads){R2+=band(roads[k],0.98,'#C99A68',Z+.01);}
for(const k in roads){R3+=line(roads[k],.2,Z+.012,'#B88757',3,'14 9')+line(roads[k],-.2,Z+.012,'#B88757',3,'10 12');}
// lane tint stripes (thin colored edge so the carriles se distinguen)
R3+=line(roads.mesa.slice(10),.6,Z+.01,'#2FAC66',5)+line(roads.casa.slice(10),-.6,Z+.01,'#E8A912',5);

// ---------- ground ----------
add(-200,`<g filter="url(#sh)">${prism(-0.9,-1.0,15.0,7.6,Z,'#E7D3AE',0)}</g>`);
// grass patches
let G='';[[0.2,0.6,.7],[1.6,5.8,.8],[3.0,6.4,.5],[6.9,-0.3,.6],[-0.4,4.6,.6],[12.3,1.6,1.9],[12.3,4.9,1.3],[9.4,5.8,.6]].forEach(([x,y,r])=>{const[cx,cy]=P(x,y,Z);G+=`<ellipse cx="${cx}" cy="${cy}" rx="${r*S*1.22}" ry="${r*S*.7}" fill="#B9CF83" opacity=".75"/>`});
add(-150,G+R1+R2+R3);

// ---------- helpers ----------
function disk(x,y,r,h,col,z0){const[cx,cy]=P(x,y,z0);const rx=r*S*1.2247,ry=r*S*.7071,hh=h*S;
  return `<path d="M${cx-rx},${cy} L${cx-rx},${cy-hh} A${rx},${ry} 0 0 0 ${cx+rx},${cy-hh} L${cx+rx},${cy} A${rx},${ry} 0 0 1 ${cx-rx},${cy} Z" fill="${shade(col,-.3)}"/><ellipse cx="${cx}" cy="${cy-hh}" rx="${rx}" ry="${ry}" fill="${col}"/><ellipse cx="${cx}" cy="${cy-hh}" rx="${rx*.78}" ry="${ry*.78}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"/>`}
function tree(x,y){const[cx,cy]=P(x,y,Z);return `<ellipse cx="${cx}" cy="${cy}" rx="16" ry="8" fill="rgba(80,50,20,.18)"/><rect x="${cx-3}" y="${cy-20}" width="6" height="20" fill="#7a5a3a"/><circle cx="${cx}" cy="${cy-36}" r="19" fill="#2E9E5B"/><circle cx="${cx-6}" cy="${cy-42}" r="8" fill="#5fcf8c"/><circle cx="${cx+9}" cy="${cy-30}" r="9" fill="#258a4d"/>`}
function person(x,y,shirt,skin='#c98e63',hair='#2a1c14'){const[cx,cy]=P(x,y,Z);return `<ellipse cx="${cx}" cy="${cy}" rx="7" ry="3.5" fill="rgba(0,0,0,.2)"/><rect x="${cx-4}" y="${cy-12}" width="8" height="12" rx="3" fill="#3b3f5c"/><rect x="${cx-6}" y="${cy-25}" width="12" height="15" rx="5" fill="${shirt}"/><circle cx="${cx}" cy="${cy-31}" r="6" fill="${skin}"/><path d="M${cx-6},${cy-32} a6,6 0 0 1 12,0 z" fill="${hair}"/>`}
const WOOD='#C68A4E',CHAPA='#B8C2CC';
function planks(face,n,col){ // face: 4 corners [a,b,c,d] in 3D: top-left, top-right, bottom-right, bottom-left
  let s='';for(let i=1;i<n;i++){const t=i/n;const l=[0,1,2].map(j=>face[0][j]+(face[3][j]-face[0][j])*t),r=[0,1,2].map(j=>face[1][j]+(face[2][j]-face[1][j])*t);const A=P(...l),B=P(...r);s+=`<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="${col}" stroke-width="1.6" opacity=".7"/>`}return s}
// TECHO-style wooden house on stilts, single-slope chapa roof. stage 0 posts, 1 floor, 2 half walls, 3 full
function woodHouse(x,y,w,d,h,stage,door='#0092DD'){
  const z0=Z,pz=z0+.2;let s='';
  [[x+w-.05,y],[x,y+d-.05],[x+w-.05,y+d-.05],[x+w*.5,y+d-.05]].forEach(([px,py])=>s+=prism(px,py,.06,.06,.2,'#8a5a32',z0));
  if(stage===0){s+=prism(x-.05,y+.1,.07,.07,.2,'#8a5a32',z0)+prism(x+.1,y-.05,.07,.07,.2,'#8a5a32',z0);return s}
  s+=prism(x-.04,y-.04,w+.08,d+.08,.05,'#A86F3B',pz);
  const fz=pz+.05;
  if(stage===1){ // lumber pile on the floor
    for(let i=0;i<4;i++)s+=prism(x+.15,y+.15+i*.09,w*.6,.07,.03,'#D9A066',fz+i*.0);return s}
  const hh=stage===2?h*.5:h, rh=.22;
  const back=stage===3?hh+rh:hh;
  // right wall (trapezoid if roofed)
  const Rw=[[x+w,y,fz+back],[x+w,y+d,fz+hh],[x+w,y+d,fz],[x+w,y,fz]];
  s+=poly(Rw,shade(WOOD,-.3))+planks([[x+w,y,fz+hh],[x+w,y+d,fz+hh],[x+w,y+d,fz],[x+w,y,fz]],6,'#7d4f28');
  const F=[[x,y+d,fz+hh],[x+w,y+d,fz+hh],[x+w,y+d,fz],[x,y+d,fz]];
  s+=poly(F,shade(WOOD,-.08))+planks(F,6,'#8a5a32');
  if(stage===2){s+=poly([[x,y,fz+hh],[x+w,y,fz+hh],[x+w,y+d,fz+hh],[x,y+d,fz+hh]],'rgba(0,0,0,0)','stroke="#8a5a32" stroke-width="2"');
    // studs sticking up
    [[x,y+d],[x+w*.5,y+d],[x+w,y+d],[x+w,y+d*.5],[x+w,y]].forEach(([sx,sy])=>{const a=P(sx,sy,fz+hh),b=P(sx,sy,fz+h);s+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#A86F3B" stroke-width="4"/>`});
    const a=P(x,y+d,fz+h),b=P(x+w,y+d,fz+h),c=P(x+w,y,fz+h);s+=`<polyline points="${a} ${b} ${c}" fill="none" stroke="#A86F3B" stroke-width="4"/>`;return s}
  // door & window on front
  s+=poly([[x+w*.58,y+d,fz],[x+w*.82,y+d,fz],[x+w*.82,y+d,fz+h*.78],[x+w*.58,y+d,fz+h*.78]],door);
  s+=poly([[x+w*.14,y+d,fz+h*.38],[x+w*.42,y+d,fz+h*.38],[x+w*.42,y+d,fz+h*.75],[x+w*.14,y+d,fz+h*.75]],'#9fd6f5','stroke="#8a5a32" stroke-width="2"');
  // steps
  s+=prism(x+w*.6,y+d+.02,w*.2,.14,.08,'#A86F3B',z0)+prism(x+w*.6,y+d+.02,w*.2,.07,.16,'#A86F3B',z0);
  // roof (single slope, back high)
  const o=.08,rf=[[x-o,y-o,fz+back+.02],[x+w+o,y-o,fz+back+.02],[x+w+o,y+d+o+.05,fz+hh-.03],[x-o,y+d+o+.05,fz+hh-.03]];
  s+=poly([rf[3],rf[2],[rf[2][0],rf[2][1],rf[2][2]-.04],[rf[3][0],rf[3][1],rf[3][2]-.04]],'#8f9aa5');
  s+=poly([rf[1],rf[2],[rf[2][0],rf[2][1],rf[2][2]-.04],[rf[1][0],rf[1][1],rf[1][2]-.04]],'#7d8893');
  s+=poly(rf,CHAPA);
  for(let i=1;i<9;i++){const t=i/9;const a=P(rf[0][0]+(rf[1][0]-rf[0][0])*t,rf[0][1],rf[0][2]),b=P(rf[3][0]+(rf[2][0]-rf[3][0])*t,rf[3][1],rf[3][2]);s+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#9aa6b1" stroke-width="1.6"/>`}
  return s}
// barrio houses: block walls + chapa
function barrioHouse(x,y,w,d,h,col,tank){let s=prism(x,y,w,d,h,col,Z);
  s+=poly([[x-.05,y-.05,Z+h+.12],[x+w+.05,y-.05,Z+h+.12],[x+w+.05,y+d+.05,Z+h+.02],[x-.05,y+d+.05,Z+h+.02]],'#A9B3BC');
  s+=poly([[x+w*.3,y+d,Z],[x+w*.5,y+d,Z],[x+w*.5,y+d,Z+h*.75],[x+w*.3,y+d,Z+h*.75]],'#5a4a3a');
  if(tank){s+=disk(x+w*.7,y+d*.4,.14,.26,'#2b2b2b',Z+h+.08)}return s}
function precario(x,y){ // chapa y madera vieja
  let s=prism(x,y,.8,.7,.42,'#9a8a7a',Z);
  s+=poly([[x,y+.7,Z+.42],[x+.35,y+.7,Z+.42],[x+.35,y+.7,Z],[x,y+.7,Z]],'#7f8d99');
  s+=poly([[x-.05,y-.05,Z+.5],[x+.86,y-.05,Z+.5],[x+.86,y+.76,Z+.44],[x-.05,y+.76,Z+.44]],'#8d969e');
  s+=poly([[x+.45,y+.7,Z],[x+.62,y+.7,Z],[x+.62,y+.7,Z+.3],[x+.45,y+.7,Z+.3]],'#3b2f26');return s}
function pole(x,y){const a=P(x,y,Z),b=P(x,y,Z+1.5);return {s:`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#7a5a3a" stroke-width="5"/><line x1="${b[0]-10}" y1="${b[1]+6}" x2="${b[0]+10}" y2="${b[1]+6}" stroke="#7a5a3a" stroke-width="4"/>`,top:b}}
function pawn(x,y,z0,col,n){const[cx,cy]=P(x,y,z0);const rx=.19*S*1.22,ry=.19*S*.7,h=12;
  return `<ellipse cx="${cx}" cy="${cy+3}" rx="${rx+4}" ry="${ry+3}" fill="rgba(0,0,0,.25)"/><path d="M${cx-rx},${cy} L${cx-rx},${cy-h} A${rx},${ry} 0 0 0 ${cx+rx},${cy-h} L${cx+rx},${cy} A${rx},${ry} 0 0 1 ${cx-rx},${cy} Z" fill="${shade(col,-.3)}"/><ellipse cx="${cx}" cy="${cy-h}" rx="${rx}" ry="${ry}" fill="${col}"/><path d="M${cx-8},${cy-h} L${cx-5},${cy-h-30} L${cx+5},${cy-h-30} L${cx+8},${cy-h} Z" fill="${shade(col,-.12)}"/><circle cx="${cx}" cy="${cy-h-45}" r="19" fill="url(#g${n})" stroke="#fff" stroke-width="2.5"/><text x="${cx}" y="${cy-h-38}" text-anchor="middle" font-family="Fredoka One" font-size="20" fill="${n==3?'#231837':'#fff'}">${n}</text>`}
function pill(x,y,txt,bg,fg){const[cx,cy]=P(x,y,Z);const w=txt.length*10.6+30;return `<rect x="${cx-w/2}" y="${cy-18}" width="${w}" height="36" rx="18" fill="${bg}" stroke="rgba(0,0,0,.1)"/><text x="${cx}" y="${cy+5}" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="17.5" fill="${fg}">${txt}</text>`}

// ---------- casilleros (stops on the road) ----------
const stops=[
 {x:0.3,y:3,c:'#0092DD',n:'0',name:'Salida'},{x:1.5,y:3,c:'#0092DD',n:'1',name:'Inicio'},
 {x:3.9,y:1.3,c:'#2FAC66',n:'2',name:'Diagnóstico'},{x:5.0,y:1.3,c:'#2FAC66',n:'3',name:'Mesa de trabajo'},{x:6.1,y:1.3,c:'#2FAC66',n:'!',name:'¡Trampa!'},{x:7.25,y:1.3,c:'#2FAC66',n:'5',name:'Plan + puente'},
 {x:3.9,y:4.7,c:'#FDC533',n:'2',name:'Encuesta'},{x:5.0,y:4.7,c:'#FDC533',n:'3',name:'Planificación'},{x:6.1,y:4.7,c:'#FDC533',n:'4',name:'Construcción'},{x:7.25,y:4.7,c:'#FDC533',n:'!',name:'¡Trampa!'},
 {x:9.0,y:3,c:'#0092DD',n:'6',name:'Evaluación'},{x:11.8,y:3,c:'#231837',n:'7',name:'Llegada'}];
// puddles under trampas
[stops[4],stops[9]].forEach(o=>{const[cx,cy]=P(o.x,o.y,Z+.012);add(-140,`<ellipse cx="${cx+6}" cy="${cy+2}" rx="${.55*S*1.22}" ry="${.5*S*.7}" fill="#8a6a4a" opacity=".55"/><ellipse cx="${cx-4}" cy="${cy}" rx="${.42*S*1.22}" ry="${.36*S*.7}" fill="#9fb8c8" opacity=".55"/>`)});
stops.forEach(o=>{
  add(o.x+o.y,disk(o.x,o.y,.36,.09,o.c,Z+.01));
  const[cx,cy]=P(o.x,o.y,Z+.1);
  add(o.x+o.y+.01,`<text x="${cx}" y="${cy+8}" text-anchor="middle" font-family="Fredoka One" font-size="26" fill="${o.c=='#FDC533'?'#231837':'#fff'}" transform="translate(${cx} ${cy}) scale(1 .62) translate(${-cx} ${-cy})">${o.n}</text>`);
});
// warning signs at trampas
[stops[4],stops[9]].forEach(o=>{const a=P(o.x+.42,o.y-.32,Z),b=P(o.x+.42,o.y-.32,Z+.7);add(o.x+o.y-.1,`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#7a5a3a" stroke-width="4"/><path d="M${b[0]},${b[1]-22} l16,26 h-32 z" fill="${o.c}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><text x="${b[0]}" y="${b[1]+1}" text-anchor="middle" font-family="Fredoka One" font-size="15" fill="${o.c=='#FDC533'?'#231837':'#fff'}">!</text>`)});

// ---------- pasillos (puentes) between lanes ----------
[5.0,7.25].forEach(px=>{let s='';for(let yy=1.95;yy<4.1;yy+=.16)s+=prism(px-.16,yy,.32,.11,.03,'#B57D47',Z);add(1.95+px-.3,s);const A=P(px,3.55,Z+.1);false&&add(290,`<rect x="${A[0]-46}" y="${A[1]-13}" width="92" height="30" rx="15" fill="#231837"/><text x="${A[0]}" y="${A[1]+6}" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="15" fill="#fff">pasillo</text>`)});

// ---------- scenery: carril de la mesa ----------
add(4.6+-.5+.8,woodHouse(4.25,-0.55,1.25,.8,.55,3,'#2FAC66')); // salón comunitario
(()=>{const x=5.55,y=0.1;let s=prism(x,y,.5,.32,.05,'#C68A4E',Z+.2)+prism(x+.05,y+.05,.05,.05,.2,'#8a5a32',Z)+prism(x+.4,y+.22,.05,.05,.2,'#8a5a32',Z);add(x+y+.4,s);
 [[x-.15,y+.15,'#0092DD'],[x+.62,y+.12,'#F088B6'],[x+.2,y+.52,'#2FAC66'],[x+.5,y+.5,'#FDC533'],[x+.25,y-.22,'#ECF4F9']].forEach(([px,py,c])=>add(px+py+.2,person(px,py,c)))})();
[[3.6,0.2,'#0092DD'],[3.85,0.35,'#ffffff']].forEach(([x,y,c])=>add(x+y,person(x,y,c)));

// ---------- scenery: carril de la casa (house in stages) ----------
add(3.6+5.6+.4,precario(3.5,5.45));
add(4.7+5.6+.4,woodHouse(4.65,5.45,.9,.7,.5,1));
add(5.8+5.6+.4,woodHouse(5.75,5.45,.9,.7,.5,2));
[[5.55,6.35,'#0092DD'],[6.75,6.0,'#F088B6'],[6.0,6.4,'#ffffff']].forEach(([x,y,c])=>add(x+y+.3,person(x,y,c)));
[[4.0,6.35,'#FDC533',],[3.75,6.4,'#7FB7E0']].forEach(([x,y,c])=>add(x+y+.3,person(x,y,c)));
add(1.0+5.6,barrioHouse(0.6,5.3,.9,.7,.5,'#7FB7E0',true));
// ---------- Llegada: lo que construimos juntos ----------
(()=>{const x=10.9,y=0.15,w=2.2,d=1.9;let g=poly([[x-.1,y-.1,Z+.004],[x+w+.1,y-.1,Z+.004],[x+w+.1,y+d+.1,Z+.004],[x-.1,y+d+.1,Z+.004]],'#9CC46E');
 g+=poly([[x,y,Z+.006],[x+w,y,Z+.006],[x+w,y+d,Z+.006],[x,y+d,Z+.006]],'#86B85A','stroke="#fff" stroke-width="3"');
 const m1=P(x+w/2,y,Z+.007),m2=P(x+w/2,y+d,Z+.007);g+=`<line x1="${m1[0]}" y1="${m1[1]}" x2="${m2[0]}" y2="${m2[1]}" stroke="#fff" stroke-width="3"/>`;
 const c=P(x+w/2,y+d/2,Z+.007);g+=`<ellipse cx="${c[0]}" cy="${c[1]}" rx="${.32*S*1.22}" ry="${.32*S*.7}" fill="none" stroke="#fff" stroke-width="3"/>`;
 add(-100,g);
 [[x,y+d/2-.3],[x+w,y+d/2-.3]].forEach(([gx,gy])=>{const a=P(gx,gy,Z),b=P(gx,gy+.6,Z),a2=P(gx,gy,Z+.32),b2=P(gx,gy+.6,Z+.32);add(gx+gy+.3,`<polyline points="${a} ${a2} ${b2} ${b}" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>`)});
 const ball=P(x+1.3,y+.8,Z);add(x+y+2.1,`<circle cx="${ball[0]}" cy="${ball[1]-5}" r="6" fill="#fff" stroke="#231837" stroke-width="1.5"/>`);
 [[x+.6,y+.6,'#FDC533'],[x+1.6,y+.5,'#F088B6'],[x+1.1,y+1.3,'#7FB7E0'],[x+.4,y+1.4,'#ffffff'],[x+1.8,y+1.3,'#2FAC66']].forEach(([px,py,c])=>add(px+py,person(px,py,c)));
})();
add(11.0+4.4+.7,woodHouse(10.9,4.15,1.3,.95,.62,3,'#0092DD'));
[[12.5,4.6,'#0092DD'],[12.55,4.95,'#F088B6'],[12.2,5.3,'#cc9966'],[12.8,4.35,'#ffffff'],[10.7,5.4,'#2FAC66'],[11.05,5.5,'#FDC533']].forEach(([x,y,c])=>add(x+y+.5,person(x,y,c)));
function farola(x,y){const a=P(x,y,Z),b=P(x,y,Z+1.35);const hx=b[0]+16,hy=b[1]+4;
 return `<ellipse cx="${a[0]}" cy="${a[1]}" rx="9" ry="4" fill="rgba(0,0,0,.2)"/><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#3b3f5c" stroke-width="5" stroke-linecap="round"/><path d="M${b[0]},${b[1]} q8,-8 16,4" fill="none" stroke="#3b3f5c" stroke-width="4"/><circle cx="${hx}" cy="${hy+10}" r="34" fill="url(#glow)"/><path d="M${hx-10},${hy} h20 l-4,9 h-12 z" fill="#3b3f5c"/><ellipse cx="${hx}" cy="${hy+9}" rx="6" ry="3" fill="#FFF3B0"/><rect x="${b[0]-12}" y="${b[1]-8}" width="16" height="10" rx="1" fill="#2a4f7a" stroke="#cfe3f3" stroke-width="1"/>`}
[[9.7,2.25],[11.1,2.3],[13.2,2.4],[9.7,3.75],[13.3,3.9],[13.3,1.0]].forEach(([x,y])=>add(x+y,farola(x,y)));
const tag=(x,y,z,txt,bg,fg)=>{const[cx,cy]=P(x,y,z);const w=txt.length*15+44;add(380,`<g><rect x="${cx-w/2}" y="${cy-20}" width="${w}" height="40" rx="20" fill="${bg}" stroke="#fff" stroke-width="3"/><text x="${cx}" y="${cy+6}" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="20" letter-spacing="2" fill="${fg}">${txt}</text></g>`)};


tag(-0.1,2.5,1.5,'SALIDA','#0092DD','#fff');tag(11.95,2.85,1.15,'LLEGADA','#231837','#fff');
// trees
[[-0.5,1.0],[0.9,0.9],[-0.6,5.8],[2.6,6.3],[8.1,0.2],[9.6,0.6],[9.6,6.0],[6.1,3.0],[7.4,6.5],[13.6,5.9],[13.9,-0.4]].forEach(([x,y])=>add(x+y,tree(x,y)));
// lane labels
const lane=(x,y,txt,col,tc)=>{const[cx,cy]=P(x,y,Z);add(350,`<g><rect x="${cx-118}" y="${cy-22}" width="236" height="44" rx="22" fill="${col}" stroke="#fff" stroke-width="3"/><text x="${cx}" y="${cy+7}" text-anchor="middle" font-family="Fredoka One" font-size="21" fill="${tc}">${txt}</text></g>`)};
lane(2.4,-0.2,'Carril de la mesa','#2FAC66','#fff');
lane(2.8,6.9,'Carril de la casa','#FDC533','#231837');


const COLORES={1:'#2FAC66',2:'#F088B6',3:'#FDC533',4:'#0092DD',5:'#231837',6:'#F39A3D',7:'#8E6CC9',8:'#2BB5B0'};
const OSCUROS=[3];
function fichaSVG(col,n){ // dibujada en (0,0)
  const rx=.19*S*1.22,ry=.19*S*.7,h=12;
  return `<ellipse cx="0" cy="3" rx="${rx+4}" ry="${ry+3}" fill="rgba(0,0,0,.28)"/><path d="M${-rx},0 L${-rx},${-h} A${rx},${ry} 0 0 0 ${rx},${-h} L${rx},0 A${rx},${ry} 0 0 1 ${-rx},0 Z" fill="${shade(col,-.3)}"/><ellipse cx="0" cy="${-h}" rx="${rx}" ry="${ry}" fill="${col}"/><path d="M-8,${-h} L-5,${-h-30} L5,${-h-30} L8,${-h} Z" fill="${shade(col,-.12)}"/><circle cx="0" cy="${-h-45}" r="21" fill="url(#g${n})" stroke="#fff" stroke-width="3"/><text x="0" y="${-h-37}" text-anchor="middle" font-family="Fredoka One" font-size="22" fill="${OSCUROS.includes(n)?'#231837':'#fff'}">${n}</text>`;
}
// índice en "stops" según posición y carril
function idx(pos,carril){ if(pos<=1)return pos; if(pos===6)return 10; if(pos>=7)return 11; return carril==='mesa'?pos:pos+4; }
const OFF=[[0,0],[.34,-.34],[-.34,.34],[.68,-.68],[-.68,.68],[-.13,-.47],[-.47,-.13],[.21,-.81]];

function crear(svg){
  items.sort((a,b)=>a.depth-b.depth);
  const defs=`<defs><radialGradient id="glow"><stop offset="0" stop-color="#FFE680" stop-opacity=".9"/><stop offset="1" stop-color="#FFE680" stop-opacity="0"/></radialGradient><filter id="sh" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="22" stdDeviation="18" flood-color="#0a3d66" flood-opacity=".45"/></filter>${Object.entries(COLORES).map(([n,c])=>`<radialGradient id="g${n}" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="${shade(c,.45)}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${shade(c,-.3)}"/></radialGradient>`).join('')}</defs>`;
  svg.innerHTML=defs+'<g id="escena">'+items.map(i=>i.svg).join('')+'</g><g id="fichas"></g>';
  const bb=svg.querySelector('#escena').getBBox();const pad=10;
  svg.setAttribute('viewBox',`${bb.x-pad} ${bb.y-60} ${bb.width+2*pad} ${bb.height+70}`);
  const capa=svg.querySelector('#fichas');
  const fichas={}, mostrada={}, colas={};

  function xy(pos,carril,slot){const o=stops[idx(pos,carril)];const f=OFF[slot%OFF.length];return P(o.x+.05+f[0],o.y+.05+f[1],Z+.1);}
  function ubicar(el,[x,y]){el.style.transform=`translate(${x}px,${y}px)`;el.dataset.y=y;}
  function ordenar(){[...capa.children].sort((a,b)=>a.dataset.y-b.dataset.y).forEach(e=>capa.appendChild(e));}
  function saltar(el){const s=el.firstChild;s.classList.remove('hop');void s.getBoundingClientRect();s.classList.add('hop');}

  function actualizar(grupos,alLlegar){
    // sacar fichas de grupos que ya no están
    Object.keys(fichas).forEach(id=>{if(!grupos.find(g=>g.id==id)){fichas[id].remove();delete fichas[id];delete mostrada[id];}});
    const enCasillero={};
    grupos.forEach(g=>{const k=idx(g.pos,g.carril);(enCasillero[k]=enCasillero[k]||[]).push(g.id);});
    grupos.forEach(g=>{
      const slot=enCasillero[idx(g.pos,g.carril)].indexOf(g.id);
      let el=fichas[g.id];
      if(!el){
        el=document.createElementNS('http://www.w3.org/2000/svg','g');el.setAttribute('class','ficha');
        el.innerHTML=`<g class="salto">${fichaSVG(g.color,g.id)}</g>`;capa.appendChild(el);fichas[g.id]=el;
        el.style.transition='none';ubicar(el,xy(g.pos,g.carril,slot));void el.getBoundingClientRect();el.style.transition='';
        mostrada[g.id]=g.pos;return;
      }
      const desde=mostrada[g.id];
      if(desde===g.pos){ubicar(el,xy(g.pos,g.carril,slot));return;}
      // camino casillero por casillero
      const pasos=[];const dir=g.pos>desde?1:-1;for(let p=desde+dir;dir>0?p<=g.pos:p>=g.pos;p+=dir)pasos.push(p);
      mostrada[g.id]=g.pos;
      clearTimeout(colas[g.id]);
      const correr=i=>{if(i>=pasos.length){if(g.pos>=7&&alLlegar)alLlegar(g);return;}
        const p=pasos[i];const ultimo=i===pasos.length-1;
        ubicar(el,xy(p,g.carril,ultimo?slot:0));saltar(el);ordenar();
        colas[g.id]=setTimeout(()=>correr(i+1),dir>0?520:330);};
      colas[g.id]=setTimeout(()=>correr(0),150);
    });
    ordenar();
  }
  function puntoEnPantalla(pos,carril){ // para confeti
    const [x,y]=xy(pos,carril,0);const pt=svg.createSVGPoint();pt.x=x;pt.y=y;const m=svg.getScreenCTM();const r=pt.matrixTransform(m);return {x:r.x,y:r.y};
  }
  return {actualizar,puntoEnPantalla};
}
return {crear,COLORES};
})();

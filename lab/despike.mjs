// despike.mjs — final conviction pass. If the theory is right, removing the
// one-lap ±omega·DT spikes must collapse EVERY experiment's stamp slope to
// the same number:  true(+42.8)  +  scheduleBias(−omega·timingSlope ≈ −124.7)
//  ≈ −81.9 ″/cy, at every DT, both rosters.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// re-run the battery in-process by importing the boot machinery would be nicer,
// but keeping this a standalone second witness: re-implement only the analysis.
// (Runs the lab with a flag would over-couple; instead re-run boots here.)
import { computeAccelerations, leapfrogStep, PN1 } from './physics.mjs';
const data = JSON.parse(readFileSync(new URL('../data/bodies.json', import.meta.url), 'utf8'));
const G = data._meta.G_au3_msun_day2;
const ARCSEC = 206264.8, CY = 36525;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const make = two => (two ? data.bodies.filter(b => ['Sun','Mercury'].includes(b.name)) : data.bodies)
  .map(b => ({name:b.name, mass:b.mass_msun, radius_km:b.radius_km,
              pos:[...b.position_au], vel:[...b.velocity_au_day], acc:[0,0,0]}));

function boot(two, pn1, DT, maxLaps){
  const bodies = make(two), sun = bodies.find(b=>b.name==='Sun'), mrc = bodies.find(b=>b.name==='Mercury');
  PN1.on = pn1; computeAccelerations(bodies, G);
  let t=0,r2=Infinity,r1=Infinity,angLast=null,drift=0,laps=0;
  const ring=[null,null,null], rows=[];
  const cap = Math.ceil((maxLaps+3)*88.5/DT);
  for(let n=0;n<cap&&laps<maxLaps;n++){
    leapfrogStep(bodies,DT,G); t+=DT;
    const rx=mrc.pos[0]-sun.pos[0],ry=mrc.pos[1]-sun.pos[1],rz=mrc.pos[2]-sun.pos[2];
    const r=Math.hypot(rx,ry,rz);
    ring[0]=ring[1];ring[1]=ring[2];ring[2]={t,rel:[rx,ry,rz],r};
    if(Number.isFinite(r2)&&r2>r1&&r1<=r){
      const ang=Math.atan2(ry,rx);
      const [q0,q1,q2]=ring; let tS=null,lS=null;
      if(q0){const den=q0.r-2*q1.r+q2.r; const s=den?((q0.r-q2.r)/(2*den)):0; tS=q1.t+s*DT;
        const ip=k=>{const a=(q0.rel[k]-2*q1.rel[k]+q2.rel[k])/2,b=(q2.rel[k]-q0.rel[k])/2;return q1.rel[k]+b*s+a*s*s;};
        lS=Math.atan2(ip(1),ip(0));}
      if(angLast!==null){drift+=wrap(ang-angLast);laps++;}
      angLast=ang; rows.push({lap:laps,tStamp:t,angle:ang,drift,tS,lS});
    }
    r2=r1;r1=r;
  }
  return rows;
}
const lsq=(xs,ys)=>{const n=xs.length;let sx=0,sy=0,sxx=0,sxy=0;
  for(let i=0;i<n;i++){sx+=xs[i];sy+=ys[i];sxx+=xs[i]*xs[i];sxy+=xs[i]*ys[i];}
  return (n*sxy-sx*sy)/(n*sxx-sx*sx);};

function robustSlope(xs,ys){          // trim spike rows: 3 rounds of MAD gating
  let keep=xs.map((_,i)=>i);
  for(let round=0;round<3;round++){
    const s=lsq(keep.map(i=>xs[i]),keep.map(i=>ys[i]));
    const b=(()=>{const kx=keep.map(i=>xs[i]),ky=keep.map(i=>ys[i]);
      const mx=kx.reduce((a,v)=>a+v)/kx.length,my=ky.reduce((a,v)=>a+v)/ky.length;return my-s*mx;})();
    const res=keep.map(i=>Math.abs(ys[i]-(s*xs[i]+b)));
    const sorted=[...res].sort((a,c)=>a-c); const mad=sorted[Math.floor(sorted.length/2)]||1e-9;
    keep=keep.filter((i,j)=>res[j]<Math.max(8*mad,1));   // spikes are ~1138″, signal res ≪ 1″
  }
  return {slope:lsq(keep.map(i=>xs[i]),keep.map(i=>ys[i])), kept:keep.length};
}

const LO=25,HI=175,MAX=178;
console.log('exp                      DT     cleanStamp   oracle   LRL-frame-corrected   pred(true+bias)  kept');
for(const ex of [
  {l:'nine-body (M8c cond.)',two:false,DT:0.05},
  {l:'two-body            ',two:true, DT:0.05},
  {l:'two-body            ',two:true, DT:0.5},
  {l:'two-body            ',two:true, DT:0.1},
  {l:'two-body            ',two:true, DT:0.025},
]){
  const A=boot(ex.two,false,ex.DT,MAX), B=boot(ex.two,true,ex.DT,MAX);
  const el=[],dS=[],dI=[],dT=[];
  const tele=R=>{const o=[0];let a=0;for(let i=1;i<R.length;i++){a+=wrap(R[i].lS-R[i-1].lS);o.push(a);}return o;};
  const tA=tele(A),tB=tele(B);
  for(let k=LO;k<=HI;k++){
    el.push(A[k].tStamp-A[0].tStamp);
    dS.push((B[k].drift-A[k].drift)*ARCSEC);
    dI.push((tB[k]-tA[k])*ARCSEC);
    dT.push(B[k].tS-A[k].tS);
  }
  // omega from run A: stamp lag vs oracle
  let om=0,n=0; for(let k=LO;k<=HI;k++){const lag=A[k].tStamp-A[k].tS;
    if(A[k].tS!==null&&lag>1e-4){om+=wrap(A[k].angle-A[k].lS)/lag;n++;}}
  om/=n;
  const {slope:clean,kept}=robustSlope(el,dS);
  const oracle=lsq(el,dI)*CY, timing=lsq(el,dT), pred=oracle - om*timing*ARCSEC*CY;
  console.log(`${ex.l}  ${String(ex.DT).padEnd(5)}  ${(clean*CY).toFixed(1).padStart(8)} ″/cy  ${oracle.toFixed(1).padStart(5)} ″/cy       (bias ${(clean*CY-oracle).toFixed(1)})        ${pred.toFixed(1).padStart(6)} ″/cy   ${kept}/151`);
}

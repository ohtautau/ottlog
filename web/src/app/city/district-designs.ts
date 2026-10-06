import { insideCoast } from "./city-layout";
import { drawBuilding } from "./building-designs";
type Block=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{rotation:{x:number;y:number;z:number}};
const palettes=[
  ["#476b78","#69c5d0","#e0cfaa","#c69a6f","#87b6a1"],
  ["#765e50","#efb579","#e9d4a3","#ca8c69","#aac080"],
  ["#3f627a","#77adfa","#bddbe2","#6b97cf","#73b9b0"],
  ["#76545c","#eeab9c","#edcfb5","#d49382","#a0b88b"],
  ["#635879","#bc9aee","#dfcce2","#a58ec1","#94bdb0"],
  ["#466c60","#98cda8","#e0d7ac","#92b393","#bed59e"],
  ["#705e45","#e8c774","#e8dbb6","#c3a26c","#99b57e"],
  ["#4c6079","#91bfe6","#d5dae1","#839ab8","#8fc0b0"],
  ["#5c657f","#adbcf0","#dce2c1","#94a8d2","#97c394"],
  ["#655e55","#d9bfa0","#e3d8bd","#ab947c","#b4c699"]
];
const outlines=[
  [[-7,-6],[2,-7],[7,-4],[7,3],[3,3],[3,7],[-5,6],[-7,2]],
  [[-6,-7],[6,-5],[7,0],[5,7],[-1,6],[-1,3],[-7,3]],
  [[-7,-4],[-3,-7],[6,-6],[7,4],[2,7],[-6,5]],
  [[-6,-6],[1,-7],[1,-4],[7,-4],[6,6],[-3,7],[-7,1]],
  [[-7,-3],[-4,-7],[4,-7],[7,-1],[4,6],[-2,7],[-7,3]],
  [[-7,-6],[5,-7],[7,-2],[4,1],[7,5],[-5,7],[-7,1]],
  [[-6,-7],[6,-6],[6,2],[3,2],[3,7],[-6,6],[-7,-1]],
  [[-7,-5],[-1,-7],[7,-3],[5,5],[0,7],[-7,4]],
  [[-7,-6],[3,-7],[7,-3],[7,5],[-1,7],[-1,4],[-7,4]],
  [[-6,-7],[0,-5],[5,-7],[7,1],[3,7],[-5,6],[-7,0]]
];
export function districtOutline(index:number):number[][] { return outlines[index%outlines.length]; }
export function drawDistrict(style:string,index:number,raw:Block,surface:(points:number[][],color:string)=>void,entrance?:number[]) {
  const [ground,accent,path,wall,leaf]=palettes[index%palettes.length];
  const polygon=districtOutline(index);surface(polygon,ground);
  const segment=(ax:number,az:number,bx:number,bz:number,width:number,color:string,y=.39)=>{
    const dx=bx-ax,dz=bz-az;raw((ax+bx)/2,y,(az+bz)/2,width,.12,Math.hypot(dx,dz)+.16,color).rotation.y=Math.atan2(dx,dz);
  };
  polygon.forEach(([x,z],i)=>{
    const next=polygon[(i+1)%polygon.length],length=Math.hypot(next[0]-x,next[1]-z);
    segment(x,z,next[0],next[1],.3,wall,.3);segment(x,z,next[0],next[1],.1,accent,.4);
    for(let t=.6;t<length;t+=1.3){const px=x+(next[0]-x)*t/length,pz=z+(next[1]-z)*t/length;
      if(entrance&&Math.hypot(px-entrance[0],pz-entrance[1])<1.6)continue;
      raw(px,.44,pz,.22,.18,.22,path);
    }
  });
  const layouts=[[-2,-1,4,-1],[1,-2,-4,1],[-2,1,3,-3],[0,-2,3,3],[-2,0,3,1],[0,1,2,-4],[-2,-2,1,3],[1,-1,-3,2],[-2,-1,4,0],[0,-1,-3,3]];
  const [mx,mz,decorX,decorZ]=layouts[index%layouts.length];
  // Recessed paving, raised entrance apron and a quieter base for the landmark.
  for(let gx=-6;gx<=6;gx+=1.15)for(let gz=-6;gz<=6;gz+=1.15){
    if(!insideCoast(gx,gz,polygon)||!insideCoast(gx+.4,gz+.4,polygon)||!insideCoast(gx-.4,gz-.4,polygon))continue;
    raw(gx,.342,gz,.98,.018,.98,(Math.round((gx+gz)*10)+index)%4===0?ground:wall);
  }
  raw(mx,.42,mz,5.8,.16,4.8,ground);
  for(let i=0;i<3;i++)raw(mx,.42+i*.07,mz+3.05-i*.28,2.4-i*.12,.13,.62,path);
  const mainScale=1.18;
  drawBuilding(style,(x,y,z,w,h,d,color)=>raw(x*mainScale+mx,y*mainScale+.35,z*mainScale+mz,w*mainScale,h*mainScale,d*mainScale,color==="#e7d7b4"?path:color==="#628fce"?accent:color));
  // Each garden routes around its landmark; no shared cross-shaped template.
  const entry=entrance??polygon.reduce((a,p)=>p[1]>a[1]?p:a,polygon[0]);
  const approach={x:mx,z:mz+3.3};
  segment(entry[0],entry[1],approach.x+2,approach.z,1,path,.41);
  segment(approach.x+2,approach.z,approach.x,approach.z,.75,path);
  segment(approach.x+2,approach.z,decorX,decorZ,.55,path);
  // Low courtyard plinths make each theme read as a designed outdoor room.
  raw(decorX,.43,decorZ,3.5,.16,4.8,ground);
  for(let i=0;i<6;i++)raw(decorX-1.5+i*.6,.525,decorZ,.04,.02,4.4,path);
  const b:Block=(x,y,z,w,h,d,color)=>raw((x-4)*.75+decorX,y,z*.75+decorZ,w*.75,h,d*.75,color);
  const bench=(x:number,z:number)=>{b(x,.78,z,1.6,.16,.5,wall);b(x,1,z-.24,1.6,.45,.12,path);for(const dx of [-.55,.55])b(x+dx,.5,z,.12,.5,.14,ground);};
  for(let i=0;i<polygon.length;i++){
    if((i+index)%3===0)continue;
    const [px,pz]=polygon[i],x=px*.77,z=pz*.77;
    if(Math.hypot(x-mx,z-mz)<3.5||Math.hypot(x-decorX,z-decorZ)<2.6)continue;
    raw(x,.5,z,1.45,.32,1.35,wall);raw(x,.68,z,1.2,.06,1.1,"#406655");
    raw(x,1.1,z,.16,1,.16,wall);raw(x,1.85+(i%2)*.2,z,.95,1.1,.95,leaf);
    raw(x-.1,2.42+(i%2)*.2,z,.62,.42,.62,i%2?leaf:accent);
    for(const dx of [-.4,.4]){raw(x+dx,.85,z+.35,.09,.3,.09,leaf);raw(x+dx,1,z+.35,.24,.14,.24,["#e0b27d","#d99bac","#cbd796"][i%3]);}

  }
  bench(4,2.5);
  // Warm entrance lights and a small directory totem frame the actual street approach.
  const entryAngle=Math.atan2(entry[1],entry[0]),sideX=-Math.sin(entryAngle),sideZ=Math.cos(entryAngle);
  for(const side of [-1,1]){const x=entry[0]+sideX*1.05*side,z=entry[1]+sideZ*1.05*side;
    raw(x,.9,z,.18,1.05,.18,wall);raw(x,1.5,z,.38,.22,.38,"#f2d8a1");raw(x,1.68,z,.5,.12,.5,ground);
  }

  raw(entry[0]*.85,.9,entry[1]*.85,.1,1.3,.1,path);raw(entry[0]*.85+.4,1.5,entry[1]*.85,.8,.4,.1,accent);
  if(style==="library"){
    for(let i=0;i<4;i++){b(3+i*.65,.95,-2.8,.48,1.2+i%2*.35,1.1,[accent,path,wall,leaf][i]);}
    b(4,.85,.5,2.7,.14,1.6,path);b(4,.58,.5,.35,.55,.7,wall);
    for(const x of [3.1,4.9])b(x,.99,.5,.65,.1,.85,accent).rotation.z=x<4?.15:-.15;
  }else if(style==="lab"){
    for(let i=0;i<3;i++){b(3+i*.8,.7,-2.5,.12,1,.12,wall);b(3+i*.8,1.3,-2.5,.7,.12,2,"#477ac2").rotation.z=.25;}
    b(4,1.2,1.4,.14,1.8,.14,path);b(4,2.2,1.4,1.5,.12,1.1,accent).rotation.z=.3;
  }else if(style==="cafe"){
    for(const z of [-2.6,.5]){b(4,.95,z,1.3,.15,1.3,path);b(4,.6,z,.15,.7,.15,wall);b(4,1.6,z,.1,1.5,.1,wall);b(4,2.4,z,2.1,.16,2.1,accent);for(const x of [2.8,5.2])b(x,.65,z,.6,.55,.6,wall);}
  }else if(style==="studio"){
    for(let i=0;i<3;i++){b(3.3+i*.85,1.25,-2.5,.1,1.7,.12,wall);b(3.3+i*.85,1.65,-2.5,.75,1,.12,path);b(3.3+i*.85,1.65,-2.41,.53,.72,.05,[accent,leaf,wall][i]);}
    b(4,.55,1.2,2.5,.2,1.7,wall);b(4,1.1,1.2,.8,.9,.8,accent).rotation.y=.4;
  }else if(style==="station"){
    for(const x of [2.7,5.3])b(x,1.25,-2.5,.13,1.8,.13,path);
    b(4,2.2,-2.5,3.2,.16,1.8,accent).rotation.z=.1;bench(4,-2.5);
    b(4,.65,1.4,2.5,.45,.9,wall);b(4,1,1.4,1.8,.35,.85,path);
  }else if(style==="gallery"){
    for(let i=0;i<3;i++){b(4,.65,-3+i*2,1.4,.5,1.4,path);b(4,1.4,-3+i*2,.8,1,.8,[accent,wall,leaf][i]).rotation.z=(i-1)*.4;}
  }else if(style==="workshop"){
    b(4,.9,-2,2.8,.2,1.6,path);for(const x of [3,5])b(x,.55,-2,.16,.6,1.2,wall);
    for(let i=0;i<3;i++)b(3.2+i*.7,1.15,-2,.45,.3,.65,accent);
    for(let i=0;i<3;i++)b(3+i,.65,1.2, .75,.6,.9,i%2?path:wall);
  }else if(style==="academy"){
    b(4,1.4,-2.8,2.8,1.5,.18,wall);b(4,1.4,-2.68,2.45,1.15,.08,"#385e58");
    for(let i=0;i<3;i++)b(4,.5+i*.2,.5-i*.6,2.8,.25,.55,path);
  }else if(style==="clock"){
    b(4,.55,-2.5,2.5,.2,2.5,path);b(4,1.2,-2.5,.15,1.3,.15,accent);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;b(4+Math.cos(a),.72,-2.5+Math.sin(a),.2,.15,.2,wall);}
    b(4,.7,1.2,2.7,.3,1.2,wall);b(4,.92,1.2,2.3,.15,.8,leaf);
  }else{
    for(const x of [2.8,5.2])b(x,1.2,-1.5,.14,1.8,.14,wall);
    for(let i=0;i<6;i++)b(2.7+i*.5,2.2,-1.5,.13,.14,3,path);
    for(let i=0;i<5;i++){b(3+i*.5,.6,1.5,.3,.4,.3,leaf);b(3+i*.5,.85,1.5,.35,.15,.35,accent);}
  }
  if(style==="library"){
    for(const x of [2.2,5.8])b(x,1.3,1,.12,1.8,.12,wall);
    for(let i=0;i<7;i++)b(2.1+i*.63,2.25,1,.16,.13,2.1,path);
    b(4,.6,-3.8,2.8,.28,.75,wall);for(let i=0;i<7;i++)b(2.9+i*.35,.96,-3.8,.22,.5,.4,i%2?accent:leaf);
  }else if(style==="lab"){
    for(let i=0;i<3;i++){b(2.5+i*1.4,.58,3.4,.8,.25,.8,wall);b(2.5+i*1.4,1,3.4,.48,.55,.48,accent);}
    b(4,.54,2.2,4,.03,.08,accent);b(4,.54,.8,.08,.03,2.8,accent);
  }else if(style==="cafe"){
    for(let i=0;i<5;i++)b(2.4+i*.8,.65,3.1,.6,.5,.7,i%2?wall:accent);
    b(4,.93,3.1,4,.12,.8,path);b(3.2,1.2,3.1,.32,.45,.32,accent);b(4.6,1.1,3.1,.6,.25,.5,leaf);
  }else if(style==="studio"){
    b(4,.7,3.3,2.6,.32,.8,wall);b(4,1.3,3.3,.09,1.1,.09,path);b(4,1.9,3.3,.7,.45,.35,ground);b(4,1.9,3.54,.35,.28,.2,accent);
  }else if(style==="station"){
    b(4,.7,3.5,2.8,.45,1,path);b(4,1.12,3.5,2.4,.45,.9,accent);for(const x of [3.1,4.9])b(x,.52,3.5,.4,.35,1.15,ground);
  }else if(style==="gallery"){
    for(const x of [2.2,5.8])b(x,1.5,0,.16,2.4,.16,wall);b(4,2.8,0,3.8,.18,.18,accent);
  }else if(style==="workshop"){
    for(let i=0;i<3;i++){b(3+i,.6,3.4,.8,.18,.8,wall);b(3+i,.85,3.4,.7,.3,.7,path);b(3+i,1.15,3.4,.55,.25,.6,accent);}
  }else if(style==="academy"){
    for(let i=0;i<5;i++){const angle=(i/4)*Math.PI;b(4+Math.cos(angle)*1.7,.7,2.4+Math.sin(angle),.6,.55,.6,i%2?wall:accent);}
  }else if(style==="clock"){
    for(let i=0;i<5;i++)b(2.4+i*.8,.65,3.3,.45,.45,.45,i%2?accent:wall);
  }else{
    b(4,.52,3.3,3.4,.2,1.3,wall);b(4,.64,3.3,3.1,.04,1,"#629da5");for(const x of [3.2,4.5])b(x,.7,3.3,.4,.07,.35,leaf);
  }

}

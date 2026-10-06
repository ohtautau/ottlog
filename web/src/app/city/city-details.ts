type Block = (x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{rotation:{x:number;y:number;z:number}};
type Road = {ax:number;az:number;bx:number;bz:number};
type Lake = {x:number;z:number;rx:number;rz:number};
type Options = {
  block:Block; roads:Road[]; lakes:Lake[];
  free:(x:number,z:number,radius:number)=>boolean;
  water:(x:number,z:number)=>boolean;
  roadDistance:(x:number,z:number)=>number;
};

/** Small street scenes use reserved footprints and the existing instanced cube batch. */
export function drawCityDetails({block,roads,lakes,free,water,roadDistance}:Options) {
  const occupied:{x:number;z:number;r:number}[]=[];
  const counts={walkways:0,crossings:0,benches:0,flowerbeds:0,stops:0,people:0,docks:0,boats:0,reeds:0};
  const clear=(x:number,z:number,r:number)=>free(x,z,r)&&occupied.every(p=>Math.hypot(x-p.x,z-p.z)>p.r+r+.35);
  const frame=(x:number,z:number,yaw:number):Block=>(dx,y,dz,w,h,d,color)=>{
    const mesh=block(x+dx*Math.cos(yaw)+dz*Math.sin(yaw),y,z-dx*Math.sin(yaw)+dz*Math.cos(yaw),w,h,d,color);
    mesh.rotation.y=yaw;return mesh;
  };
  const person=(b:Block,x:number,z:number,index:number)=>{
    const coat=["#d8b897","#9fbfb0","#c998aa","#88aeda"][index%4];
    for(const dx of [-.075,.075])b(x+dx,.43,z,.1,.35,.13,"#34485d");
    b(x,.75,z,.28,.35,.22,coat);b(x,1.02,z,.2,.21,.2,"#d9bda2");
    b(x,1.15,z,.23,.07,.23,"#43556a");
    b(x+.2,.66,z,.12,.23,.18,"#b89c71");counts.people++;
  };
  roads.forEach((road,index)=>{
    const dx=road.bx-road.ax,dz=road.bz-road.az,len=Math.hypot(dx,dz);
    if(len<5)return;
    const yaw=Math.atan2(dx,dz),mx=(road.ax+road.bx)/2,mz=(road.az+road.bz)/2;
    if(index%7===0&&len>9&&!water(road.ax+dx*2.4/len,road.az+dz*2.4/len)){
      const b=frame(road.ax+dx*2.4/len,road.az+dz*2.4/len,yaw);
      for(let i=0;i<5;i++)b(0,.415,(i-2)*.3,1.15,.025,.17,"#d0dacd");
      counts.crossings++;
    }
    if(index%2!==0||counts.walkways>=32)return;
    const side=index%4===0?1:-1,px=mx+dz/len*1.6*side,pz=mz-dx/len*1.6*side;
    const length=Math.min(5,len-2);
    // Check the whole sidewalk, including corners near bends and junctions.
    for(let t=-length/2;t<=length/2+.01;t+=length/4){
      const x=px+dx/len*t,z=pz+dz/len*t;
      if(!clear(x,z,.55)||roadDistance(x,z)<1.15)return;
    }
    const b=frame(px,pz,yaw);
    b(0,.17,0,.9,.18,length,"#839ba1");
    for(let t=-length/2+.22;t<length/2;t+=.65)b(0,.275,t,.82,.025,.035,"#b7c5bb");
    occupied.push({x:px,z:pz,r:1});counts.walkways++;
    if(index%6===0)person(b,0,-.5,index);
    const fx=px+dz/len*2.3*side,fz=pz-dx/len*2.3*side;
    if(!clear(fx,fz,.8))return;
    const f=frame(fx,fz,yaw);occupied.push({x:fx,z:fz,r:.8});
    const kind=counts.walkways%3;
    if(kind===0){
      // Bus shelter, route board and low bench.
      f(0,.12,0,1.4,.16,1.8,"#799097");
      for(const z of [-.7,.7])f(-.5,1.05,z,.1,1.9,.1,"#526f81");
      f(-.53,1.1,0,.06,1.2,1.5,"#90b7ba");f(0,2.05,0,1.5,.15,1.9,"#b7c8b9");
      f(0,.55,0,.45,.12,1.1,"#d7c3a2");f(.55,1.4,-.7,.08,2.3,.08,"#59758b");
      f(.55,2.35,-.7,.48,.52,.12,"#8eb3cc");f(.55,2.36,-.62,.3,.07,.02,"#ecdfbf");
      counts.stops++;
    }else if(kind===1){
      for(const z of [-.45,.45])f(0,.35,z,.4,.4,.12,"#455d6b");
      f(0,.59,0,.55,.12,1.25,"#c7ad8a");f(-.25,.84,0,.1,.48,1.25,"#c7ad8a");
      f(.48,.43,.65,.3,.65,.3,"#779c8d");counts.benches++;
    }else{
      f(0,.28,0,1.1,.35,1.3,"#b6b79c");f(0,.49,0,.94,.08,1.1,"#577c68");
      for(let i=0;i<6;i++){const x=(i%2-.5)*.5,z=(Math.floor(i/2)-1)*.35;f(x,.62,z,.05,.25,.05,"#719774");f(x,.78,z,.23,.18,.23,["#e1c080","#c995ae","#b8cdae"][i%3]);}
      counts.flowerbeds++;
    }
  });
  lakes.forEach((lake,index)=>{
    // One dock per lake, anchored on dry shore with an unobstructed approach.
    for(let attempt=0;attempt<16;attempt++){
      const angle=(attempt/16+index*.13)*Math.PI*2;
      const x=lake.x+Math.cos(angle)*lake.rx*1.2,z=lake.z+Math.sin(angle)*lake.rz*1.2;
      if(!clear(x,z,1)||roadDistance(x,z)<2.4)continue;
      const yaw=Math.atan2(lake.x-x,lake.z-z),ux=Math.sin(yaw),uz=Math.cos(yaw);
      if([0,1,2,3,4].some(t=>roadDistance(x+ux*t,z+uz*t)<1.4))continue;
      const b=frame(x,z,yaw);
      for(let i=0;i<12;i++)b(0,.36,i*.34,1.35,.15,.3,i%3?"#bba181":"#d1b998");
      for(const dx of [-.59,.59])for(const dz of [0,1.7,3.7])b(dx,.16,dz,.15,.75,.15,"#66767b");
      b(0,.36,3.8,2.1,.16,.65,"#c3ac8c");
      occupied.push({x,z,r:1.5});counts.docks++;
      break;
    }
    const bx=lake.x+1.5,bz=lake.z-.7;
    if(roadDistance(bx,bz)>3){
      const b=frame(bx,bz,index*.85);
      b(0,.35,0,.9,.3,2,"#b7806d");b(0,.52,0,.68,.1,1.65,"#e1c9a2");
      b(0,.43,-1,.55,.2,.55,"#b7806d");b(0,1.35,0,.08,1.8,.08,"#d7d2b8");
      for(let i=0;i<4;i++)b(.18+i*.065,1.75-i*.27,0,.25+i*.13,.27,.055,index%2?"#a4c5bd":"#e2c58e");
      b(-.8,.18,-.3,.07,.02,1.5,"#9dc9c7");b(.8,.18,.15,.07,.02,1,"#9dc9c7");counts.boats++;
    }
    for(let i=0;i<20;i++){
      const a=i/20*Math.PI*2,x=lake.x+Math.cos(a)*lake.rx*.97,z=lake.z+Math.sin(a)*lake.rz*.97;
      if(roadDistance(x,z)<1.6||occupied.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+1))continue;
      for(let j=0;j<3;j++){block(x+j*.16,.46+j*.06,z,.045,.6+j*.12,.045,"#9daf85");block(x+j*.16,.78+j*.12,z,.09,.19,.09,"#b5a785");}
      counts.reeds++;
    }
  });
  return counts;
}

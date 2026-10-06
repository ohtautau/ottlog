import { drawBeachDetails } from "./beach-details";
import { createTerrainPlan, nearPolygon } from "./city-terrain";
type Block=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{rotation:{x:number;y:number;z:number}};
export function drawTerrainDetails(plan:ReturnType<typeof createTerrainPlan>,block:Block) {
  const counts={rocks:0,shrubs:0,logs:0,sand:0,shore:0};
  const contained=(points:number[][],x:number,z:number,r:number)=>[[x-r,z-r],[x+r,z-r],[x+r,z+r],[x-r,z+r]].every(([px,pz])=>nearPolygon(px,pz,points));
  plan.zones.forEach((zone,index)=>{
    for(let i=0;i<25;i++){
      const a=i*2.4+index,r=.74+(i%3)*.035,x=zone.x+Math.cos(a)*zone.rx*r,z=zone.z+Math.sin(a)*zone.rz*r;
      if(!contained(zone.points,x,z,.65))continue;
      if(zone.kind==="mountain"){
        const h=.35+(i%4)*.22;
        block(x,h/2+.15,z,.8,h,.6,["#9faeab","#8b9290","#bdbaa6"][i%3]).rotation.y=a;
        block(x,.22+h*.4,z,.84,.08,.64,"#586c6c").rotation.y=a;
        if(i%3===0)block(x+.3,.16,z+.4,.4,.13,.35,"#88a18b");
        counts.rocks++;
      }else if(zone.kind==="hill"){
        block(x,.18,z,.9,.15,.7,"#7d9d76");
        block(x,.43,z,.6,.45,.55,["#9bb283","#7d9f7c","#b1bc89"][i%3]);
        if(i%2===0)block(x+.1,.7,z,.16,.16,.16,"#d3b180");
        counts.shrubs++;
      }else{
        if(i%4===0){block(x,.3,z,1,.25,.25,"#987b60").rotation.y=a;counts.logs++;}
        else {block(x,.22,z,.1,.25,.1,"#d1c6a4");block(x,.38,z,.3,.12,.3,i%2?"#b88b7e":"#d1b993");}
      }
    }
  });
  counts.sand=drawBeachDetails(plan.beaches,block).length;
  plan.lakes.forEach((lake,index)=>{
    lake.points.forEach(([x,z],i)=>{
      // Nest stones inside this lake's reserved shoreline, away from dry land.
      const px=lake.x+(x-lake.x)*.965,pz=lake.z+(z-lake.z)*.965;
      if(i%3||!contained(lake.points,px,pz,.25))return;
      block(px,.22,pz,.42,.25,.35,["#a8b5ac","#c7c6ad","#819b94"][(index+i)%3]).rotation.y=i;
      counts.shore++;
    });
  });
  return counts;
}

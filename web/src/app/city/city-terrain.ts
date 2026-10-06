import { insideCoast } from "./city-layout";
export const terrainNames = ["沙滩", "山地", "丘陵", "森林", "河谷", "湖泊"] as const;
export const natureZones = [
  {kind:"mountain",x:-65,z:-15,rx:12,rz:15},
  {kind:"hill",x:47,z:12,rx:10,rz:12},
  {kind:"forest",x:-19,z:-61,rx:13,rz:10},
  {kind:"forest",x:66,z:3,rx:9,rz:12},
] as const;
export function inNature(x:number,z:number,margin=0) {
  return natureZones.some(p=>Math.hypot((x-p.x)/(p.rx+margin),(z-p.z)/(p.rz+margin))<1);
}

type Polygon = number[][];
export function pointEdgeDistance(x:number,z:number,a:number[],b:number[]) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
}
export function nearPolygon(x:number,z:number,polygon:Polygon,margin=0) {
  return insideCoast(x,z,polygon)||polygon.some((a,i)=>pointEdgeDistance(x,z,a,polygon[(i+1)%polygon.length])<=margin);
}
export function polygonsOverlap(a:Polygon,b:Polygon,gap=0) {
  if(a.some(([x,z])=>nearPolygon(x,z,b,gap))||b.some(([x,z])=>nearPolygon(x,z,a,gap)))return true;
  const cross=(p:number[],q:number[],r:number[])=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  return a.some((p,i)=>b.some((r,j)=>{
    const q=a[(i+1)%a.length],s=b[(j+1)%b.length];
    return cross(p,q,r)*cross(p,q,s)<0&&cross(r,s,p)*cross(r,s,q)<0;
  }));
}
export function createTerrainPlan(coast:Polygon) {
  const riverX=(z:number)=>9+Math.sin(z*.052)*13+Math.sin(z*.12)*3;
  const left:number[][]=[],right:number[][]=[],waterLeft:number[][]=[],waterRight:number[][]=[];
  for(let z=-106;z<=106;z+=1){
    if(![-4.3,0,4.3].every(dx=>insideCoast(riverX(z)+dx,z,coast)))continue;
    left.push([riverX(z)-4.3,z]);right.push([riverX(z)+4.3,z]);
    waterLeft.push([riverX(z)-2.7,z]);waterRight.push([riverX(z)+2.7,z]);
  }
  const river=[...left,...right.reverse()],riverWater=[...waterLeft,...waterRight.reverse()];
  const regions:{kind:string;points:Polygon}[]=[{kind:"river",points:river}];
  const ellipse=(x:number,z:number,rx:number,rz:number,index:number)=>Array.from({length:32},(_,i)=>{
    const a=i/32*Math.PI*2,r=.96+.04*Math.sin(i*1.7+index);
    return [x+Math.cos(a)*rx*r,z+Math.sin(a)*rz*r];
  });
  const fits=(points:Polygon)=>points.every(([x,z])=>insideCoast(x,z,coast)&&!coast.some((a,i)=>pointEdgeDistance(x,z,a,coast[(i+1)%coast.length])<2))
    &&regions.every(r=>!polygonsOverlap(points,r.points,2.5));
  const place=(x:number,z:number,rx:number,rz:number,index:number)=>{
    for(let attempt=0;attempt<200;attempt++){
      const angle=attempt*2.4,radius=attempt===0?0:2+Math.sqrt(attempt)*1.8;
      const cx=x+Math.cos(angle)*radius,cz=z+Math.sin(angle)*radius,points=ellipse(cx,cz,rx,rz,index);
      if(fits(points))return {x:cx,z:cz,points};
    }
    throw new Error("No non-overlapping terrain site");
  };
  const lakes=[{x:-34,z:24,rx:10,rz:7},{x:43,z:-30,rx:12,rz:8},{x:-53,z:-52,rx:7,rz:11},{x:55,z:48,rx:9,rz:6}].map((lake,i)=>{
    const site=place(lake.x,lake.z,lake.rx*1.15,lake.rz*1.15,i);
    regions.push({kind:"lake",points:site.points});
    return {...lake,...site,water:ellipse(site.x,site.z,lake.rx,lake.rz,i)};
  });
  const zones=natureZones.map((zone,i)=>{
    const site=place(zone.x,zone.z,zone.rx,zone.rz,i+4);
    regions.push({kind:zone.kind,points:site.points});return {...zone,...site};
  });
  const beaches=coast.flatMap((a,i)=>{
    const b=coast[(i+1)%coast.length],points=[a,b,[b[0]*.925,b[1]*.925],[a[0]*.925,a[1]*.925]];
    if(a[1]<=25||b[1]<=25||regions.some(r=>polygonsOverlap(points,r.points,2.5)))return [];
    return [points];
  });
  // Adjacent sand strips share an edge and together form one coastal terrain.
  const landRegions=[...regions.filter(r=>r.kind!=="river"&&r.kind!=="lake"),...beaches.map(points=>({kind:"beach",points}))];
  const allRegions=[...regions,...beaches.map(points=>({kind:"beach",points}))];
  return {river,riverWater,riverX,lakes,zones,beaches,regions:allRegions,
    reserved:(x:number,z:number,margin=0)=>landRegions.some(r=>nearPolygon(x,z,r.points,margin)),
    districtFits:(points:Polygon)=>points.every(([x,z])=>insideCoast(x,z,coast))&&allRegions.every(r=>!polygonsOverlap(points,r.points,2)),
  };
}

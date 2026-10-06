import { insideCoast } from "./city-layout";
import { polygonsOverlap } from "./city-terrain";

type Polygon=number[][];
type Site={x:number;z:number};
type Road={ax:number;az:number;bx:number;bz:number};
type Patch={points:Polygon;color:string;kind:"garden"|"paving"};
export function createGroundCover(coast:Polygon,terrain:Polygon[],districts:Polygon[],buildings:Site[],roads:Road[]) {
  const square=(x:number,z:number,r:number):Polygon=>[[x-r,z-r],[x+r,z-r],[x+r,z+r],[x-r,z+r]];
  const streets=roads.map(r=>{
    const dx=r.bx-r.ax,dz=r.bz-r.az,len=Math.hypot(dx,dz)||1,nx=dz/len*1.15,nz=-dx/len*1.15;
    return [[r.ax+nx,r.az+nz],[r.bx+nx,r.bz+nz],[r.bx-nx,r.bz-nz],[r.ax-nx,r.az-nz]];
  });
  const barriers=[...terrain,...districts,...streets];
  const fits=(points:Polygon)=>points.every(([x,z])=>insideCoast(x,z,coast))&&barriers.every(p=>!polygonsOverlap(points,p,.25));
  const patches:Patch[]=[];
  // Small paved forecourts beneath ordinary buildings, with room for the approach roads.
  buildings.forEach((s,i)=>{
    const color=["#737d78","#837d70","#736e70","#78877e"][i%4];
    const full=square(s.x,s.z,3.2);
    if(fits(full)){patches.push({points:full,color,kind:"paving"});return;}
    // Leave an opening wherever a driveway meets the building.
    for(const dx of [-1.7,1.7])for(const dz of [-1.7,1.7]){
      const points=square(s.x+dx,s.z+dz,1.45);
      if(fits(points))patches.push({points,color,kind:"paving"});
    }
  });
  return patches;
}

/** Partition the complete island into shared-edge cells, clipped to coast triangles. */
export function createGroundMosaic(coast:Polygon,triangles:number[][]) {
  const seeds:Site[]=[];
  for(let x=-90;x<=90;x+=30)for(let z=-90;z<=90;z+=30){
    const px=x+Math.sin(x*.13+z*.17)*9,pz=z+Math.cos(x*.11-z*.19)*9;
    if(insideCoast(px,pz,coast))seeds.push({x:px,z:pz});
  }
  const clip=(points:Polygon,nx:number,nz:number,limit:number)=>{
    const result:Polygon=[];
    points.forEach((a,i)=>{
      const b=points[(i+1)%points.length],da=a[0]*nx+a[1]*nz-limit,db=b[0]*nx+b[1]*nz-limit;
      if(da<=0)result.push(a);
      if((da<0&&db>0)||(da>0&&db<0)){const t=da/(da-db);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    });
    return result;
  };
  const palette=["#5b7769","#667f70","#758477","#697b70","#7d8275","#637a70","#798579"];
  const result:{points:Polygon;color:string}[]=[];
  seeds.forEach((s,index)=>{
    triangles.forEach(triangle=>{
      let points=triangle.map(i=>coast[i]);
      for(const other of seeds){
        if(other===s)continue;
        points=clip(points,other.x-s.x,other.z-s.z,(other.x*other.x+other.z*other.z-s.x*s.x-s.z*s.z)/2);
        if(points.length<3)break;
      }
      if(points.length>=3)result.push({points,color:palette[(index*3+Math.floor(s.z/30)+7*10)%palette.length]});
    });
  });
  return result;
}

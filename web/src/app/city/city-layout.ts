export type Point={x:number;z:number;clearance?:number};
export function insideCoast(x:number,z:number,coast:number[][]) {
  let inside=false;
  for(let i=0,j=coast.length-1;i<coast.length;j=i++){
    const [ax,az]=coast[i],[bx,bz]=coast[j];
    if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
  }
  return inside;
}

/** Grow a tree from entrances: each new route joins the existing network once. */
export function connectEntrances(lots:Point[],coast:number[][],water:(x:number,z:number)=>boolean, reserved:(x:number,z:number)=>boolean=()=>false) {
  const size=111,step=2,offset=110,key=(x:number,z:number)=>z*size+x;
  const point=(id:number)=>({x:(id%size)*step-offset,z:Math.floor(id/size)*step-offset});
  const blocked=new Uint8Array(size*size);
  for(let id=0;id<blocked.length;id++){const p=point(id);blocked[id]=!insideCoast(p.x,p.z,coast)||reserved(p.x,p.z)||lots.some(l=>Math.hypot(l.x-p.x,l.z-p.z)<(l.clearance??3.6))?1:0;}
  // Choose entrances in the connected street space, outside enclosed pockets.
  const components=new Int32Array(blocked.length).fill(-1);let component=0,largest=-1,largestSize=0;
  for(let start=0;start<blocked.length;start++){
    if(blocked[start]||components[start]>=0)continue;
    const queue=[start];components[start]=component;
    for(let cursor=0;cursor<queue.length;cursor++){const id=queue[cursor],x=id%size,z=Math.floor(id/size);for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=size||nz>=size)continue;const next=key(nx,nz);if(!blocked[next]&&components[next]<0){components[next]=component;queue.push(next);}}}
    if(queue.length>largestSize){largest=component;largestSize=queue.length;}component++;
  }
  for(let id=0;id<blocked.length;id++)if(components[id]!==largest)blocked[id]=1;
  const ports=lots.map(l=>{
    let best=-1,distance=Infinity;
    const gx=Math.round((l.x+offset)/step),gz=Math.round((l.z+offset)/step);
    for(let dz=-7;dz<=7;dz++)for(let dx=-7;dx<=7;dx++){
      const x=gx+dx,z=gz+dz;if(x<0||z<0||x>=size||z>=size)continue;
      const id=key(x,z),p=point(id),d=Math.hypot(l.x-p.x,l.z-p.z);
      if(!blocked[id]&&!water(p.x,p.z)&&d<distance){best=id;distance=d;}
    }
    return best;
  });
  if(ports.some(id=>id<0))throw new Error("No reachable entrance for city lot");
  const network=new Set<number>(ports.slice(0,1)),edges:[number,number][]=[];
  const directions=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for(const start of ports.slice(1)){
    if(network.has(start))continue;
    const cost=new Float64Array(blocked.length).fill(Infinity),previous=new Int32Array(blocked.length).fill(-1);
    const heap:{id:number;cost:number}[]=[];
    function push(id:number,value:number){let i=heap.length;heap.push({id,cost:value});while(i>0){const parent=(i-1)>>1;if(heap[parent].cost<=value)break;heap[i]=heap[parent];i=parent;}heap[i]={id,cost:value};}
    function pop(){const top=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].cost<heap[child].cost)child++;if(heap[child].cost>=last.cost)break;heap[i]=heap[child];i=child;}heap[i]=last;}return top;}
    cost[start]=0;push(start,0);let end=-1;
    while(heap.length){const current=pop();if(current.cost!==cost[current.id])continue;if(network.has(current.id)){end=current.id;break;}
      const x=current.id%size,z=Math.floor(current.id/size);
      for(const [dx,dz] of directions){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=size||nz>=size)continue;const next=key(nx,nz);if(blocked[next]||(dx&&dz&&(blocked[key(nx,z)]||blocked[key(x,nz)])))continue;const p=point(next),value=current.cost+Math.hypot(dx,dz)*(water(p.x,p.z)?5:1);if(value<cost[next]){cost[next]=value;previous[next]=current.id;push(next,value);}}
    }
    if(end<0)throw new Error("City entrance cannot reach road network");
    while(end!==start){const before=previous[end];edges.push([before,end]);network.add(before);end=before;}
  }
  // Merge straight runs, retaining all junctions and entrances.
  const adjacency=new Map<number,number[]>();edges.forEach(([a,b])=>{adjacency.set(a,[...(adjacency.get(a)??[]),b]);adjacency.set(b,[...(adjacency.get(b)??[]),a]);});
  const anchors=new Set(ports);adjacency.forEach((neighbors,id)=>{if(neighbors.length!==2||neighbors[0]+neighbors[1]!==2*id)anchors.add(id);});
  const visited=new Set<string>(),roads:{ax:number;az:number;bx:number;bz:number}[]=[];
  const edgeKey=(a:number,b:number)=>a<b?`${a}:${b}`:`${b}:${a}`;
  for(const start of anchors)for(const neighbor of adjacency.get(start)??[]){if(visited.has(edgeKey(start,neighbor)))continue;let before=start,end=neighbor;visited.add(edgeKey(before,end));while(!anchors.has(end)){const next=adjacency.get(end)!.find(id=>id!==before)!;before=end;end=next;visited.add(edgeKey(before,end));}const a=point(start),b=point(end);roads.push({ax:a.x,az:a.z,bx:b.x,bz:b.z});}
  return {roads,accesses:ports.map((id,index)=>({lot:lots[index],point:point(id)})),entrances:ports.length,nodes:network.size,edges:edges.length};
}

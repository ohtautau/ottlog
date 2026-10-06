type Block = (x:number,y:number,z:number,w:number,h:number,d:number,color:string) => {rotation:{x:number;y:number;z:number}};

/** Decorative landmarks have no category or navigation target. */
export function drawScenery(kind:string,b:Block) {
  const stone="#79909c", cream="#d2c7a8", green="#527d68", water="#62becd", dark="#293b4c";
  const tree=(x:number,z:number)=>{b(x,.65,z,.18,1.2,.18,"#70665a");b(x,1.6,z,1.1,1.4,1.1,"#73977d");};
  const bench=(x:number,z:number)=>{b(x,.5,z,1.2,.15,.4,cream);b(x,.75,z-.2,1.2,.55,.12,cream);for(const dx of [-.4,.4])b(x+dx,.25,z,.1,.5,.1,dark);};
  if(kind==="park"||kind==="fountain") {
    b(0,.12,0,5,.18,4.5,green);b(0,.23,0,5,.08,.65,stone);b(0,.23,0,.65,.08,4.5,stone);
    if(kind==="fountain") {b(0,.4,0,2.6,.35,2.6,cream);b(0,.6,0,2.25,.08,2.25,water);b(0,.95,0,.6,.7,.6,stone);b(0,1.3,0,1.5,.18,1.5,cream);b(0,1.42,0,1.3,.08,1.3,water);b(0,1.9,0,.14,.9,.14,"#bbeced");for(const x of [-.65,.65])b(x,1.05,0,.1,.65,.1,water);}
    else {b(0,.5,0,1.5,.8,1.5,stone);b(0,1.35,0,.8,1.2,.8,"#b79b86").rotation.z=.35;}
    tree(-1.8,-1.5);tree(1.7,1.5);bench(-1.5,1.3);bench(1.5,-1.3);return;
  }
  if(kind==="stadium") {
    b(0,.15,0,6,.25,4.8,stone);b(0,.3,0,5,.15,3.8,"#b18373");b(0,.4,0,3.8,.08,2.6,green);
    for(const x of [-1.85,1.85]){b(x,.47,0,.05,.03,2.6,cream);for(const z of [-.48,.48])b(x,.8,z,.06,.65,.06,cream);b(x,1.12,0,.07,.07,1,cream);}
    for(const z of [-1.28,1.28])b(0,.47,z,3.8,.03,.05,cream);b(0,.47,0,.05,.03,2.6,cream);
    for(const z of [-2.05,2.05])for(let i=0;i<3;i++)b(0,.5+i*.25,z+(z>0?1:-1)*i*.18,4.8,.25,.25,i%2?cream:"#6e8ba5");
    for(const x of [-2.6,2.6]){b(x,1.5,-1.9,.1,3,.1,dark);b(x,3,-1.9,.8,.25,.25,cream);}return;
  }
  if(kind==="construction") {
    b(0,.15,0,4.5,.2,4,"#9a8b71");for(const x of [-1.2,1.2])for(const z of [-1,1])b(x,1.1,z,.2,2,.2,stone);b(0,2.1,0,2.8,.18,2.5,stone);
    b(1.7,2.4,-1.5,.18,4.6,.18,"#c8a564");b(.3,4.7,-1.5,3.8,.18,.25,"#c8a564");b(-1.4,3.6,-1.5,.06,2,.06,dark);b(-1.4,2.7,-1.5,.4,.2,.3,cream);
    for(let i=0;i<8;i++)b(-1.9+i*.55,.5,1.9,.48,.7,.15,i%2?dark:"#c8a564");for(let i=0;i<3;i++)b(-1+i*.55,.4,1,.45,.5,.55,"#ab7864");return;
  }
  if(kind==="mountain") {
    for(let i=0;i<4;i++){const h=2.6+i*.75;const x=(i-1.5)*1.2,z=(i%2)*1.1;for(let j=0;j<4;j++){const w=2.7-j*.6;b(x+j*.13,h*(j+.5)/4,z,w,h/4,w,j===3?"#a2b9b5":["#536c70","#607c7b","#77908b"][j]);}}
    tree(-2,2);tree(1.6,2);return;
  }
  if(kind==="greenhouse") {b(0,.2,0,4,.25,3,stone);b(0,1.2,0,3.5,1.7,2.5,"#7eafa6");for(let i=0;i<5;i++)b(-1.5+i*.75,1.3,1.29,.09,1.7,.08,cream);b(-.8,2.3,0,1.9,.15,2.8,cream).rotation.z=.3;b(.8,2.3,0,1.9,.15,2.8,cream).rotation.z=-.3;return;}
  if(kind==="pagoda") {for(let i=0;i<3;i++){b(0,.8+i*1.15,0,2.2-i*.5,1,2.2-i*.5,"#a78d79");b(0,1.4+i*1.15,0,3-i*.6,.22,3-i*.6,"#547980");}b(0,4.3,0,.1,.8,.1,cream);return;}
  if(kind==="market") {for(let i=0;i<3;i++){const x=(i-1)*1.5;b(x,.7,0,1.2,1.1,1.5,"#9e9885");for(let j=0;j<4;j++)b(x-.45+j*.3,1.5,.3,.3,.15,2,j%2?cream:["#a47c76","#6d9298","#929379"][i]);}return;}
  if(kind==="apartments") {for(let i=0;i<2;i++){const x=i*1.9-.95,h=2.8+i*1.2;b(x,h/2+.2,0,1.7,h,2,"#8b8d9a");for(let j=0;j<3+i;j++){b(x,.8+j*.8,1.03,1.45,.25,.1,"#99b9c8");b(x,.62+j*.8,1.17,1.6,.12,.45,stone);}}return;}
  if(kind==="cinema") {b(0,1.3,0,3.3,2.3,2.6,"#8d798a");b(0,2.2,1.4,3,.7,.15,cream);for(let i=0;i<5;i++)b(-1.1+i*.55,2.2,1.51,.3,.38,.05,"#8b6770");b(0,1.1,1.65,3.6,.18,1,stone);b(0,.6,1.34,.9,1,.1,dark);return;}
  // Terraced homes with offset roofs and a planted courtyard.
  for(let i=0;i<3;i++){b(-1.2+i*1.1,.85+i*.2,(i%2)*.5,1.25,1.4+i*.4,2,["#9a9f8c","#a79483","#84999e"][i]);b(-1.2+i*1.1,1.65+i*.4,(i%2)*.5,1.5,.17,2.3,cream).rotation.z=.15;}
  tree(1.6,-1.4);
}

/** Each address gets its own massing, facade rhythm, roof and courtyard. */
export function drawUniqueBuilding(id:number,b:Block) {
  let seed=Math.imul(id+31,2654435761)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const colors=["#779fd0","#cd9872","#69aa9e","#c38b9b","#a6b978","#d0b990","#6689c1","#ab93ca"];
  const color=colors[id%8],roof=colors[(id+3)%8],glass="#a3cbd2",cream="#d7ceaf";
  // Grow connected floor plans, not a repeated main box with a different scale.
  const cells=[{x:1,z:1}],occupied=new Set([4]),count=3+id%6;
  while(cells.length<count){const parent=cells[Math.floor(random()*cells.length)];const [dx,dz]=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(random()*4)];const x=parent.x+dx,z=parent.z+dz,key=z*3+x;if(x<0||z<0||x>2||z>2||occupied.has(key))continue;cells.push({x,z});occupied.add(key);}
  const family=id%9;
  cells.forEach((cell,i)=>{
    const x=(cell.x-1)*1.1,z=(cell.z-1)*1.05;
    const floors=family===0?1+i%2+(id>>5)%2:family===1?1+i%3+(id>>4)%2:family===2?3+(id>>5)%3-i%3:1+Math.floor(random()*4);
    const h=.6+floors*.65;
    const elevated=family===4&&i%2===0;
    b(x,h/2+.15+(elevated?.55:0),z,1.08,h,1.02,i%3===0?roof:color);
    if(elevated)for(const dx of [-.35,.35])b(x+dx,.4,z,.13,.8,.7,"#52697b");
    const top=h+.2+(elevated?.55:0);
    if(family===3){b(x-.28,top+.15,z,.65,.13,1.15,cream).rotation.z=.4;b(x+.28,top+.15,z,.65,.13,1.15,cream).rotation.z=-.4;}
    else if(family===5){b(x,top+.25,z,.8,.4,.8,cream);b(x,top+.6,z,.45,.3,.45,roof);}
    else if(family===6)b(x,top+.1,z,1.25,.16,1.25,"#638a77");
    else if(family===7)b(x+.13,top+.15,z,1.2,.2,1.15,cream).rotation.z=.2;
    else b(x,top,z,1.15,.12,1.1,roof);
    for(let floor=0;floor<floors;floor++){
      const y=.65+floor*.65+(elevated?.55:0);
      if(!occupied.has((cell.z+1)*3+cell.x)||cell.z===2){b(x,y,z+.53,.6,.28,.05,glass);if(family===1||family===8)b(x,y-.2,z+.65,.88,.09,.35,cream);}
      if(!occupied.has(cell.z*3+cell.x+1)||cell.x===2)b(x+.56,y,z,.06,.32,.56,glass);
    }
    if(i===0&&family===2){b(x,top+.6,z,.08,1.1,.08,cream);b(x,top+.7,z,.7,.08,.08,cream);}
  });
  const front=cells.reduce((best,c)=>c.z>best.z?c:best,cells[0]);
  b((front.x-1)*1.1,.5,(front.z-1)*1.05+.55,.4,.7,.08,"#253c50");
  if(family===0){b(0,1.5,1.9,3.1,.16,.65,cream);for(const x of [-1.3,1.3])b(x,.75,1.9,.12,1.5,.12,color);}
  if(family===8){b(-1.9,.45,0,.8,.7,2.7,"#617f69");b(-1.9,.85,0,.7,.1,2.5,"#9bbe94");}
}

export function drawMountain(id:number,b:Block) {
  const palettes=[["#557477","#72928b","#a8bdb0"],["#82746a","#a58f79","#c8b294"],["#637c91","#91a7b4","#e2e8df"],["#537767","#73947b","#a3b38d"]];
  const colors=palettes[id%4];
  const peaks=2+id%3;
  for(let peak=0;peak<peaks;peak++){
    const height=2.6+(id%7)*.43+peak*.5;
    for(let level=0;level<4;level++){
      const size=2.6-level*.5;
      b((peak-(peaks-1)/2)*1.1+level*.13,height*(level+.5)/4,(peak%2)*.8,size,height/4,size,colors[level===3?2:level>0?1:0]).rotation.y=(id%5)*.1;
    }
  }
  if(id%4===0){b(.2,1.2,1.5,.5,2.2,.15,"#75cbd5");b(.2,.16,1.9,1.5,.15,1.2,"#409fad");}
}

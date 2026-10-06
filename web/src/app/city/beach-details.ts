import { nearPolygon, polygonsOverlap } from "./city-terrain";
type Block=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{rotation:{x:number;y:number;z:number}};
export const beachItems=[
  {kind:"volleyball",name:"沙滩排球场",w:5.8,d:3.8,lane:.5},
  {kind:"tower",name:"救生塔",w:2.2,d:2.8,lane:.73},
  {kind:"walkway",name:"木栈道",w:1.6,d:4.4,lane:.5},
  {kind:"umbrella",name:"遮阳伞",w:2.7,d:2.7,lane:.55},
  {kind:"chair",name:"躺椅",w:1.2,d:2.4,lane:.6},
  {kind:"castle",name:"沙堡",w:2,d:1.9,lane:.45},
  {kind:"shells",name:"贝壳",w:1.3,d:1.2,lane:.22},
  {kind:"rocks",name:"礁石",w:2.5,d:2,lane:.2},
  {kind:"ring",name:"救生圈",w:1.2,d:1,lane:.73},
  {kind:"surfboard",name:"冲浪板",w:1.4,d:1.2,lane:.7},
] as const;
export function drawBeachDetails(beaches:number[][][],block:Block) {
  const placed:{kind:string;name:string;points:number[][]}[]=[];
  const land=(x:number,z:number)=>beaches.some(p=>nearPolygon(x,z,p));
  for(const [index,item]of beachItems.entries()){
    for(let attempt=0;attempt<beaches.length;attempt++){
      const points=beaches[(index*7+attempt)%beaches.length],outer=[(points[0][0]+points[1][0])/2,(points[0][1]+points[1][1])/2],inner=[(points[2][0]+points[3][0])/2,(points[2][1]+points[3][1])/2];
      const x=outer[0]+(inner[0]-outer[0])*item.lane,z=outer[1]+(inner[1]-outer[1])*item.lane,yaw=Math.atan2(inner[0]-outer[0],inner[1]-outer[1]);
      const world=(dx:number,dz:number)=>[x+dx*Math.cos(yaw)+dz*Math.sin(yaw),z-dx*Math.sin(yaw)+dz*Math.cos(yaw)];
      const footprint=[world(-item.w/2,-item.d/2),world(item.w/2,-item.d/2),world(item.w/2,item.d/2),world(-item.w/2,item.d/2)];
      let fits=true;
      for(let dx=-item.w/2;dx<=item.w/2+.01;dx+=item.w/8)for(let dz=-item.d/2;dz<=item.d/2+.01;dz+=item.d/8){const [px,pz]=world(dx,dz);if(!land(px,pz))fits=false;}
      if(!fits||placed.some(p=>polygonsOverlap(footprint,p.points,1.3)))continue;
      const b:Block=(dx,y,dz,w,h,d,color)=>{const [px,pz]=world(dx,dz);const mesh=block(px,y,pz,w,h,d,color);mesh.rotation.y=yaw;return mesh;};
      const cream="#ebd7ac",wood="#b0916d",coral="#d98a77",blue="#79b4c0",dark="#566b73";
      switch(item.kind){
        case "umbrella":
          b(0,1.1,0,.1,2,.1,wood);
          for(const side of [-1,1]){b(side*.55,2.05,0,1.2,.13,2.3,side>0?cream:coral).rotation.z=-side*.22;}
          b(0,2.26,0,.25,.2,.25,cream);break;
        case "chair":
          b(0,.45,0,.85,.16,1.85,cream);
          b(0,.76,.58,.85,.13,.8,blue).rotation.x=-.55;
          for(const x of [-.36,.36])for(const z of [-.65,.65])b(x,.25,z,.09,.4,.09,wood);
          for(const x of [-.48,.48])b(x,.68,0,.08,.1,1.1,wood);break;
        case "castle":
          b(0,.32,0,1.45,.45,1.25,"#cfb383");
          for(const x of [-.58,.58])for(const z of [-.5,.5]){
            b(x,.62,z,.43,.95,.43,"#e0c596");
            for(const dx of [-.13,.13])b(x+dx,1.15,z,.13,.18,.43,"#e0c596");
          }
          b(0,.45,-.64,.3,.5,.04,"#a58c63");b(0,1.2,0,.04,1.2,.04,wood);b(.23,1.7,0,.45,.27,.035,coral);break;
        case "shells":
          for(let i=0;i<3;i++){const x=(i-1)*.38,z=(i%2)*.35-.2;
            for(let j=0;j<3;j++)b(x+(j-1)*.09,.15+j%2*.035,z,.08,.07,.22+(.1-Math.abs(j-1)*.06),i%2?"#ead6cb":cream).rotation.y=yaw+(j-1)*.3;
          }break;
        case "rocks":
          b(-.5,.42,0,1.1,.65,1.1,"#80918d");b(.5,.6,.15,1.2,1,1.15,"#9ca69b");b(.18,.25,-.6,.75,.35,.5,"#bbc0aa");
          b(.5,1.13,.15,.82,.1,.9,"#bec4b6");break;
        case "tower":
          for(const x of [-.7,.7])for(const z of [-.65,.65])b(x,.9,z,.12,1.7,.12,wood);
          b(0,1.7,0,1.9,.18,1.7,cream);b(0,2.2,.25,1.4,.9,.95,"#e0b59a");
          b(0,2.35,-.25,.9,.4,.07,blue);b(0,2.8,.1,1.9,.17,1.5,coral);
          for(let i=0;i<5;i++)b(0,.28+i*.3,-1.2+i*.1,.65,.1,.18,cream);
          b(.75,3,0,.06,1.5,.06,dark);b(.91,3.6,0,.3,.3,.04,coral);break;
        case "ring":
          b(0,.78,0,.07,1.4,.07,wood);
          for(let i=0;i<8;i++){const a=i/8*Math.PI*2;b(Math.cos(a)*.32,1+Math.sin(a)*.32,-.07,.23,.16,.14,i%2?cream:coral).rotation.z=a+Math.PI/2;}
          break;
        case "surfboard":
          for(const x of [-.3,.3]){
            b(x,1,0,.38,1.55,.12,x>0?blue:coral);b(x,1.86,0,.24,.22,.12,x>0?blue:coral);
            b(x,1,-.075,.07,1.5,.025,cream);
          }
          b(0,.32,.18,1,.12,.65,wood);b(0,.95,.16,1,.1,.1,wood);break;
        case "volleyball":
          for(const x of [-2.6,2.6])b(x,.13,0,.06,.025,3.3,cream);
          for(const z of [-1.65,1.65])b(0,.13,z,5.2,.025,.06,cream);
          for(const x of [-2.7,2.7])b(x,1,0,.09,1.8,.09,wood);
          for(let i=0;i<4;i++)b(0,1.15+i*.2,0,5.4,.035,.035,cream);
          for(let i=0;i<14;i++)b(-2.6+i*.4,1.45,0,.025,.65,.025,cream);
          b(.9,.3,-.8,.27,.27,.27,coral);break;
        case "walkway":
          for(let i=0;i<14;i++)b(0,.22,(i-6.5)*.3,1.35,.15,.26,i%3?wood:"#c7b08b");
          for(const x of [-.65,.65])for(const z of [-1.8,1.8])b(x,.38,z,.09,.6,.09,cream);
          break;
      }
      placed.push({kind:item.kind,name:item.name,points:footprint});break;
    }
  }
  return placed;
}

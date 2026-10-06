import { drawBuilding } from "./building-designs";
import { drawScenery } from "./city-scenery";

type Block = Parameters<typeof drawBuilding>[1];

// Each named landmark has its own silhouette, rather than just a new color.
export const cityBuildings = [
  ["library", "图书馆"], ["cafe", "咖啡馆"], ["gallery", "美术馆"],
  ["studio", "摄影馆"], ["lab", "实验室"], ["clock", "钟楼"],
  ["academy", "学校"], ["workshop", "工坊"], ["station", "车站"],
  ["cottage", "住宅"], ["theatre", "剧院"], ["music", "音乐厅"],
  ["greenhouse", "温室"], ["market", "集市"], ["stadium", "体育馆"],
  ["lighthouse", "灯塔"], ["observatory", "天文台"], ["windmill", "风车"],
  ["post", "邮局"], ["fire", "消防站"],
] as const;

export function drawCityLandmark(kind: string, b: Block) {
  if (cityBuildings.slice(0,10).some(([key])=>key===kind)) { drawBuilding(kind,b); return; }
  if (["greenhouse","market","stadium"].includes(kind)) { drawScenery(kind,b); return; }
  const cream="#e4d3b4", glass="#91c7d6", dark="#263d54";
  const door=(x:number,z:number,w=0.7)=>b(x,.7,z,w,1.2,.12,dark);
  switch(kind) {
    case "theatre":
      b(0,1.65,-.4,4,3,2.7,"#a7657b");
      b(0,2,1.05,2.5,2.2,.16,"#583d61");
      for(const x of [-1.65,1.65])b(x,1.6,1.15,.32,2.9,.4,cream);
      for(let i=0;i<4;i++)b(0,.16+i*.12,2.2-i*.23,4.5-i*.2,.18,.5,cream);
      b(0,3.3,0,4.5,.25,3.4,cream);b(0,3.75,-.4,2.6,.7,1.8,"#bf8191");
      for(const x of [-.6,.6])door(x,1.2);return;
    case "music":
      b(0,.8,0,4.6,1.3,3,"#6a9cab");
      for(let i=0;i<5;i++){const x=-1.8+i*.9;b(x,2.1+i*.18,0,.95,.22,3.3,cream).rotation.z=.45;b(x,1.3,1.54,.55,1.2,.08,glass);}
      // A tall bank of organ pipes gives the hall an asymmetric skyline.
      for(let i=0;i<5;i++)b(-1.7+i*.35,2.4+i*.16,-1,.18,2.8+i*.3,.25,"#ceb47e");
      door(.6,1.6);return;
    case "lighthouse":
      for(let i=0;i<5;i++)b(0,.65+i*.85,0,1.65-i*.14,.85,1.65-i*.14,i%2?cream:"#c9816d");
      b(0,4.65,0,1.8,.15,1.8,dark);b(0,5.1,0,1, .8,1,glass);
      b(0,5.2,0,.35,.5,.35,"#ffe2a0");b(0,5.62,0,1.55,.22,1.55,cream);
      b(1.6,.65,.4,1.5,1,1.8,"#839ea8");door(0,.87);return;
    case "observatory":
      b(0,1.1,0,3.7,1.8,3.4,"#797cac");
      for(let i=0;i<4;i++)b(0,2.15+i*.36,0,3.6-i*.65,.38,3.3-i*.6,"#a6c4cf");
      const scope=b(.35,3.35,.5,.46,.5,2.7,cream);scope.rotation.x=-.55;
      b(.35,4,1.7,.55,.55,.15,dark);door(-1,1.76);return;
    case "windmill":
      for(let i=0;i<4;i++)b(0,.65+i*.85,0,2-i*.32,.85,2-i*.32,i%2?"#bdac8d":"#cfbea0");
      b(0,4,0,1.4,.5,1.5,"#648c92");b(0,3.25,1,.4,.4,.6,cream);
      for(const a of [Math.PI/4,-Math.PI/4])b(0,3.25,1.35,.27,5.5,.16,cream).rotation.z=a;
      door(0,1.05);return;
    case "post":
      b(-.5,1.2,0,3.4,2,2.6,"#729a8d");b(1.3,1.8,-.25,1.2,3.2,2.1,"#c4ad82");
      b(-.5,2.35,0,3.7,.25,2.9,cream);b(-.4,1.75,1.4,1.3,.7,.12,cream);
      for(const angle of [-.45,.45])b(-.4+(angle>0?.28:-.28),1.8,1.48,.65,.08,.04,dark).rotation.z=angle;
      door(-.8,1.4);b(1.5,.6,1.8,.5,1,.5,"#699881");b(1.5,.8,2.07,.3,.1,.03,dark);return;
    case "fire":
      b(0,1.2,0,4.3,2,2.8,"#b97168");
      for(const x of [-1.25,.1]){door(x,1.46,1);for(let i=0;i<4;i++)b(x,.45+i*.25,1.55,.9,.06,.03,"#9aaeb8");}
      b(1.5,2.6,-.6,1.1,4.8,1.1,"#d0ad8c");
      for(let i=0;i<6;i++)b(1.5,.8+i*.65,.01,.6,.08,.08,cream);
      b(-.7,.55,2.2,1.6,.7,.8,"#d47769");b(-.8,.96,2.2,1.3,.1,.35,cream);
      for(const x of [-1.2,-.2])for(const z of [1.8,2.6])b(x,.3,z,.3,.3,.12,dark);return;
  }
}

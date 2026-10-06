type Block = (x:number,y:number,z:number,w:number,h:number,d:number,color:string) => {rotation:{x:number;y:number;z:number}};

export function buildingStyle(category:string) {
  if (/阅读|读书|书籍/.test(category)) return "library";
  if (/摄影|影像|相机/.test(category)) return "studio";
  if (/城市|旅行|漫步/.test(category)) return "station";
  if (/技术|开发|编程/.test(category)) return "lab";
  if (/日常|生活|美食/.test(category)) return "cafe";
  if (/设计|艺术/.test(category)) return "gallery";
  if (/效率|工具|复盘/.test(category)) return "clock";
  if (/学习|课程|教育/.test(category)) return "academy";
  if (/项目|作品/.test(category)) return "workshop";
  return "cottage";
}

export const buildingNames: Record<string,string> = {library:"图书馆",studio:"摄影棚",station:"街角驿站",lab:"科技实验室",cafe:"生活咖啡馆",gallery:"设计美术馆",clock:"时钟塔",academy:"阶梯学堂",workshop:"创作工坊",cottage:"随笔小屋"};

/** Theme-specific silhouettes built from the same low-poly blocks as the city. */
export function drawBuilding(style:string,b:Block):number {
  const glass="#8ed2e4",dark="#193344",cream="#e7d7b4",blue="#628fce";
  function windows(x:number,y:number,z:number,count:number,gap=.68){for(let i=0;i<count;i++)b(x+i*gap,y,z,.42,.65,.08,glass);}
  function door(x:number,z:number){b(x,.8,z,.6,1,.12,dark);}
  switch(style){
    case "library":
      b(-.75,1.25,0,2.8,1.8,3.1,cream);b(1.1,1.9,-.4,1.6,3.1,2.3,"#8bafa4");
      for(let i=0;i<5;i++){b(-1.8+i*.45,2.45,0,.34,.85+(i%3)*.22,1.8,["#769bba","#ba8d81","#c3b781","#73a396","#9794b5"][i]);}
      b(-.65,3.1,0,1.5,.16,2.1,cream).rotation.z=.22;b(.65,3.1,0,1.5,.16,2.1,cream).rotation.z=-.22;
      windows(-1.8,1.4,1.58,4);door(.6,1.6);return 3.7;
    case "studio":
      b(-.5,1.55,0,3.5,2.4,2.5,"#6d798f");b(1.3,1.1,.4,1.4,1.5,2.8,"#48556d");
      b(-.5,3.3,0,2.8,1.2,1.5,"#b4c2d5");b(-.5,3.3,1.02,1.5,1.05,.65,dark);b(-.5,3.3,1.4,1,.75,.2,glass);b(-.5,3.3,1.52,.55,.42,.08,"#263b64");b(-1.25,4.02,-.05,.65,.25,.6,cream);
      b(1.5,2.7,.1,.12,2.1,.12,dark);b(1.5,3.6,.1,.8,.5,.2,cream).rotation.z=-.2;door(-.4,1.29);return 4.25;
    case "station":
      b(-1.3,1.35,-.6,1.5,2,1.8,"#91b1a7");b(.4,.6,.35,3.8,.45,2.9,"#809bb1");
      for(const x of [-1.1,1.9])b(x,1.55,1.25,.16,1.9,.16,cream);
      b(.4,2.65,.45,4.5,.25,3.1,"#83b9b8").rotation.z=.09;
      b(-1.3,3.1,-.6,1,1.5,1.1,"#608c98");b(-1.3,3.3,-.01,.72,.72,.06,cream);b(-1.3,3.3,.04,.08,.42,.05,dark);b(-1.12,3.3,.04,.36,.08,.05,dark);
      b(.5,.93,.6,1.5,.18,.5,cream);door(-1.3,.34);return 4;
    case "lab":
      b(-.9,1.65,.2,1.9,2.6,2.7,"#5681bf");b(1,2.4,-.4,1.6,4.1,2.1,"#799ccc");b(.2,2.4,.2,2.3,.55,.8,glass);
      for(let i=0;i<3;i++)b(1,1.1+i*1.1,.68,1.4,.38,.09,glass);
      b(1,4.8,-.4,.12,1.4,.12,cream);b(1,5.15,-.4,1,.1,.1,cream);b(-.9,3.1,.2,1.65,.15,2.5,blue).rotation.z=.16;
      windows(-1.45,1.8,1.59,2);door(-.9,1.6);return 5.7;
    case "cafe":
      b(-.35,1.2,0,3.2,1.7,2.7,"#c4a38f");b(.6,2.5,-.4,1.3,1.3,1.7,"#bd8d78");
      b(-.65,2.35,0,2.2,.18,3.1,cream).rotation.z=.27;b(.75,2.33,0,1.1,.18,3.1,cream).rotation.z=-.27;
      for(let i=0;i<6;i++)b(-1.65+i*.5,1.8,1.65,.49,.2,.9,i%2?cream:"#5a968e").rotation.x=.15;
      b(-1.4,2.8,-.7,.4,1,.4,"#795f5b");b(1.5,.8,2,.7,.12,.7,cream);b(1.5,.5,2,.12,.5,.12,dark);
      windows(-1.35,1.15,1.38,2);door(.65,1.4);return 3.5;
    case "gallery":
      b(-.7,1.15,.2,3.1,1.6,2.6,"#d1cec5");b(.8,2.9,-.15,2.8,1.8,1.9,"#a19abc").rotation.y=.22;
      b(-1.3,1.5,1.56,1.2,1.2,.09,glass);b(1.8,1.4,-.4,.25,2.2,.3,"#93a5c0");
      b(-1.6,2.5,-.3,.7,1.1,1,"#d0a58b");b(.8,4.05,-.15,2.7,.15,1.8,cream).rotation.y=.22;
      b(1.6,.9,1.7,.6,.9,.6,"#78b7be").rotation.y=.6;door(.15,1.55);return 4.4;
    case "clock":
      b(-.6,1,0,3,1.3,2.5,"#8b9dba");b(.65,2.8,-.3,1.35,4.9,1.35,"#9babc1");
      b(.65,5.1,-.3,1.8,1.25,1.8,cream);b(.65,5.1,.64,1.25,.95,.08,dark);b(.65,5.25,.7,.1,.45,.05,cream);b(.87,5.05,.7,.5,.1,.05,cream);
      for(let i=0;i<3;i++)b(.65,5.85+i*.18,-.3,1.75-i*.5,.2,1.75-i*.5,blue);
      windows(-1.6,1,1.28,3);door(-.2,1.29);return 6.5;
    case "academy":
      for(let i=0;i<3;i++){b(-1.35+i*1.2,1+i*.55,-i*.2,1.4,1.3+i*1.1,3-i*.35,["#8eb7bb","#78a5b7","#658eb0"][i]);b(-1.35+i*1.2,1.75+i*1.1,-i*.2,1.6,.17,3.2-i*.35,cream);windows(-1.7+i*1.2,1+i*.5,1.54-i*.38,2,.55);}
      for(let i=0;i<3;i++)b(-1.25,.3+i*.15,2-i*.25,1.3,.18,.5,cream);door(-1.35,1.52);return 4.5;
    case "workshop":
      b(-.9,1.3,0,2.2,1.9,3,"#9b9bb0");b(1.2,.95,.6,1.6,1.2,2,"#b6ac8f");
      for(let i=0;i<3;i++)b(-1.65+i*.65,2.4,0,.85,.2,3.2,"#7e97af").rotation.z=.28;
      b(1.4,2.5,-1,.18,4.4,.18,"#d4b773");b(.4,4.6,-1,3,.18,.22,"#d4b773");b(-.9,3.9,-1,.06,1.4,.06,dark);b(-.9,3.15,-1,.35,.25,.3,"#cfb17a");
      b(-.9,1,1.53,1.5,1.15,.1,dark);return 5;
    default:
      b(-.5,1.1,0,2.6,1.5,2.6,"#a5b7a4");b(.85,.8,.35,1.5,.9,2,"#779a91");
      b(-1.2,2.05,0,1.6,.2,3,"#d0b691").rotation.z=.4;b(.15,2.05,0,1.6,.2,3,"#d0b691").rotation.z=-.4;
      b(-1.35,2.35,-.7,.35,.9,.4,"#9e8b7d");windows(-1.2,1.1,1.34,1);door(-.15,1.35);
      for(let i=0;i<3;i++)b(1.1+i*.35,1.8,.7,.12,.12,2.1,cream);b(1.1,1.05,1.7,.12,1.5,.12,cream);b(1.8,1.05,1.7,.12,1.5,.12,cream);return 3;
  }
}

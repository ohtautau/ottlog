"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/posts";
import CityMap from "./city-map";
import { buildingStyle } from "./building-designs";
import { drawScenery, drawUniqueBuilding, drawMountain } from "./city-scenery";
import { createGroundCover, createGroundMosaic } from "./city-ground";
import { drawTerrainDetails } from "./terrain-details";
import { drawCityDetails } from "./city-details";
import { cityBuildings, drawCityLandmark } from "./city-landmarks";
import { createTerrainPlan, nearPolygon } from "./city-terrain";
import { drawDistrict, districtOutline } from "./district-designs";
import { insideCoast, connectEntrances } from "./city-layout";
import styles from "./city.module.css";

function seedOf(name: string) { let seed=2166136261; for(const char of name) seed=Math.imul(seed ^ char.codePointAt(0)!,16777619)>>>0; return seed; }

export default function CityExperience({categories}: {categories: Category[]}) {
  const host=useRef<HTMLDivElement>(null);
  const locateControl=useRef<((category:Category)=>void)|null>(null);
  const locatedCategory=useRef<Category|undefined>(undefined);
  const highlightControl=useRef<((category?:Category)=>void)|null>(null);
  const directoryPointer=useRef<Category|undefined>(undefined);
  const directoryFocus=useRef<Category|undefined>(undefined);
  const syncDirectory=()=>highlightControl.current?.(directoryPointer.current??directoryFocus.current??locatedCategory.current);
  const zoomControl=useRef<((value:number)=>void)|null>(null);
  const [zoom,setZoom]=useState(1);
  const [status,setStatus]=useState("loading");
  const [hovered,setHovered]=useState<Category>();
  const router=useRouter();
  useEffect(()=>{
    let cancelled=false;
    let cleanup=()=>{};
    async function init() {
      const THREE=await import("three");
      const [{EffectComposer},{RenderPass},{OutlinePass},{OutputPass}]=await Promise.all([
        import("three/addons/postprocessing/EffectComposer.js"),import("three/addons/postprocessing/RenderPass.js"),import("three/addons/postprocessing/OutlinePass.js"),import("three/addons/postprocessing/OutputPass.js")
      ]);
      await document.fonts.ready;
      if(cancelled || !host.current)return;
      const container=host.current;
      const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.setClearColor("#111e30");
      renderer.domElement.setAttribute("aria-label","分类城市，可拖动浏览，用滚轮或双指缩放，点击街区进入分类");
      container.appendChild(renderer.domElement);
      const scene=new THREE.Scene();
      const camera=new THREE.OrthographicCamera(-50,50,40,-40,.1,500);
      const worldW=168,worldD=168;
      let randomSeed=20260909;
      const random=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
      const coast=Array.from({length:64},(_,i)=>{const angle=i/64*Math.PI*2;const r=91+8*Math.sin(angle*3+.4)+6*Math.sin(angle*7)+3*Math.sin(angle*13);return [Math.cos(angle)*r*1.07,Math.sin(angle)*r];});
      const terrain=createTerrainPlan(coast);
      const {lakes,zones:natureZones,reserved}=terrain;
      const isWater=(x:number,z:number,margin=0)=>nearPolygon(x,z,terrain.riverWater,margin)||lakes.some(l=>nearPolygon(x,z,l.water,margin));
      const lots: {x:number;z:number;yaw:number}[]=[];
      for(let attempt=0;attempt<16000&&lots.length<190;attempt++){
        const x=(random()-.5)*190,z=(random()-.5)*190;
        if(!insideCoast(x,z,coast)||!insideCoast(x+5,z+5,coast)||!insideCoast(x-5,z-5,coast)||isWater(x,z,5)||reserved(x,z,5)||lots.some(p=>Math.hypot(x-p.x,z-p.z)<10.5))continue;
        lots.push({x,z,yaw:(random()-.5)*.8});
      }
      const available=[...lots];
      const sites: {category:Category;seed:number;x:number;z:number}[]=[];
      categories.forEach((category,index)=>{
        const fitsDistrict=(p:{x:number;z:number})=>terrain.districtFits(districtOutline(index).map(([x,z])=>[p.x+x,p.z+z]));
        const pool=available.filter(p=>!isWater(p.x,p.z,10.5)&&fitsDistrict(p));
        if(!pool.length)return;
        // Fill the closest suitable sites first, preserving the existing spacing buffer.
        const site=[...pool].sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0];
        for(let i=available.length-1;i>=0;i--)if(Math.hypot(available[i].x-site.x,available[i].z-site.z)<22)available.splice(i,1);
        sites.push({category,seed:seedOf(category.name),x:site.x,z:site.z});
      });
      const target=new THREE.Vector3(0,0,0),cameraOffset=new THREE.Vector3(95,125,85);
      const fitCamera=()=>{const aspect=container.clientWidth/container.clientHeight;const height=Math.min(76,140/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.position.copy(target).add(cameraOffset);camera.lookAt(target);camera.updateProjectionMatrix();};
      scene.add(new THREE.HemisphereLight(0xc8e2ff,0x294269,2.8));
      const sun=new THREE.DirectionalLight(0xffedd2,3.5);sun.position.set(-70,130,50);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-120;sun.shadow.camera.right=120;sun.shadow.camera.top=120;sun.shadow.camera.bottom=-120;sun.shadow.camera.far=300;sun.shadow.normalBias=.05;scene.add(sun);
      const geometry=new THREE.BoxGeometry(1,1,1);
      const materials=new Map<string,InstanceType<typeof THREE.MeshStandardMaterial>>();
      const material=(color:string)=>{let value=materials.get(color);if(!value){value=new THREE.MeshStandardMaterial({color,roughness:.82});materials.set(color,value);}return value;};
      const meshes: InstanceType<typeof THREE.Object3D>[]=[];
      const buildingGroups=new Map<string,InstanceType<typeof THREE.Group>>();
      const labels: InstanceType<typeof THREE.CanvasTexture>[]=[];
      function cube(x:number,y:number,z:number,w:number,h:number,d:number,color:string,category?:Category){const mesh=new THREE.Mesh(geometry,material(color));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;if(category){mesh.userData.category=category;meshes.push(mesh);}if(category){let group=buildingGroups.get(category.name);if(!group){const site=sites.find(s=>s.category.name===category.name)!;group=new THREE.Group();group.position.set(site.x,0,site.z);group.rotation.y=0;scene.add(group);buildingGroups.set(category.name,group);}mesh.position.x-=group.position.x;mesh.position.z-=group.position.z;group.add(mesh);}else scene.add(mesh);return mesh;}
      const outline=new THREE.Shape();
      coast.forEach(([x,z],i)=>{if(i===0)outline.moveTo(x,-z);else outline.lineTo(x,-z);});outline.closePath();
      const groundGeometry=new THREE.ExtrudeGeometry(outline,{depth:1.2,bevelEnabled:false});groundGeometry.rotateX(-Math.PI/2);
      const ground=new THREE.Mesh(groundGeometry,material("#425c70"));ground.position.y=-1.15;ground.receiveShadow=true;ground.castShadow=true;scene.add(ground);
      const rim=new THREE.Mesh(groundGeometry,material("#b2ac86"));rim.position.set(.25,-1.48,.25);rim.scale.set(1.025,1,1.025);scene.add(rim);
      cube(0,-1.7,0,1200,.2,1200,"#245f7a");
      const terrainGeometries: InstanceType<typeof THREE.BufferGeometry>[]=[];
      function waterPolygon(points:number[][],color:string,y=.14,depth=0){const shape=new THREE.Shape();points.forEach(([x,z],i)=>{if(i===0)shape.moveTo(x,-z);else shape.lineTo(x,-z);});shape.closePath();const geo=depth?new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}):new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);terrainGeometries.push(geo);const mesh=new THREE.Mesh(geo,material(color));mesh.position.y=y;scene.add(mesh);}
      const coastTriangles=THREE.ShapeUtils.triangulateShape(coast.map(([x,z])=>new THREE.Vector2(x,z)),[]);
      const mosaic=createGroundMosaic(coast,coastTriangles);
      // Merge equal-color cells to keep the full ground to just a few draw calls.
      const mosaicBatches=new Map<string,number[]>();
      mosaic.forEach(({points,color})=>{
        const vertices=mosaicBatches.get(color)??[];
        for(let i=1;i<points.length-1;i++)for(const [x,z] of [points[0],points[i+1],points[i]])vertices.push(x,.06,z);
        mosaicBatches.set(color,vertices);
      });
      mosaicBatches.forEach((vertices,color)=>{
        const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();terrainGeometries.push(geo);
        const mesh=new THREE.Mesh(geo,material(color));mesh.receiveShadow=true;scene.add(mesh);
      });
      // Wide, irregular coastal sand strips; inland lots and roads reserve this space.
      terrain.beaches.forEach(points=>waterPolygon(points,"#c7b48b",.09));
      natureZones.forEach((zone,index)=>{
        const boundary=zone.points;
        waterPolygon(boundary,zone.kind==="mountain"?"#617c79":zone.kind==="hill"?"#789978":"#426e61",.1);
        if(zone.kind==="mountain"){
          for(let i=0;i<4;i++)drawMountain(20+i,(x,y,z,w,h,d,color)=>cube(zone.x+(i-1.5)*4+x,y,zone.z+(i%2)*5-2+z,w,h,d,color));
        } else if(zone.kind==="hill"){
          for(let i=0;i<3;i++)for(let level=0;level<4;level++){
            const rx=4.5-level*.8,rz=3.8-level*.6,cx=zone.x+(i-1)*3.5,cz=zone.z+(i%2)*5-2;
            const points=Array.from({length:12},(_,j)=>{const a=j/12*Math.PI*2;return [cx+Math.cos(a)*rx,cz+Math.sin(a)*rz];});
            waterPolygon(points,["#688b70","#7b9c79","#92ab83","#adbc90"][level],.12+level*.43,.43);
          }
        } else {
          for(let x=-zone.rx+2;x<zone.rx-1;x+=2.8)for(let z=-zone.rz+2;z<zone.rz-1;z+=2.8){
            const px=zone.x+x+(random()-.5)*1.8,pz=zone.z+z+(random()-.5)*1.8;
            if(Math.hypot((px-zone.x)/zone.rx,(pz-zone.z)/zone.rz)>.83||random()<.15)continue;
            const h=1.8+random()*1.5;cube(px,h/2,pz,.2,h,.2,"#796958");
            for(let level=0;level<3;level++)cube(px,h*.65+level*.48,pz,1.65-level*.4,.75,1.65-level*.4,["#63977e","#86ac8c","#a2bc94"][level]);
          }
        }
      });
      waterPolygon(terrain.river,"#699487",.08);
      waterPolygon(terrain.riverWater,"#4296ad");
      lakes.forEach(lake=>{
        waterPolygon(lake.points,"#849b88",.1);
        waterPolygon(lake.water,"#397f96");
        waterPolygon(lake.water.map(([x,z])=>[lake.x+(x-lake.x)*.78,lake.z+(z-lake.z)*.78]),"#4f9daf",.15);
      });
      drawTerrainDetails(terrain,cube);
      for(let i=0;i<160;i++){const x=(random()-.5)*330,z=(random()-.5)*330;if(Math.abs(x)<98&&Math.abs(z)<98)continue;cube(x,-1.55,z,1+random()*3,.025,.12,"#568c9d");}

      const roads: {ax:number;az:number;bx:number;bz:number}[]=[];
      function road(ax:number,az:number,bx:number,bz:number,width=1.3){const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz);if(length<.1)return;const surface=cube((ax+bx)/2,.32,(az+bz)/2,width,.1,length+width*.7,"#142438");surface.rotation.y=Math.atan2(dx,dz);roads.push({ax,az,bx,bz});for(let t=1;t<length-.8;t+=1.7){const dash=cube(ax+dx*t/length,.39,az+dz*t/length,.07,.03,.65,"#9ab4c7");dash.rotation.y=surface.rotation.y;if(isWater(ax+dx*t/length,az+dz*t/length)){for(const side of [-1,1]){const rail=cube(ax+dx*t/length+dz/length*width*.55*side,.65,az+dz*t/length-dx/length*width*.55*side,.09,.45,1.7,"#a7b8b5");rail.rotation.y=surface.rotation.y;}}}}
      const streetNetwork=connectEntrances([...available,...sites.map(s=>({...s,clearance:10.2}))],coast,isWater,(x,z)=>reserved(x,z,1));
      streetNetwork.roads.forEach(r=>road(r.ax,r.az,r.bx,r.bz,1.3));
      // Continue every street endpoint into its actual lot, rather than stopping at a clearance circle.
      streetNetwork.accesses.forEach(({lot,point})=>{
        const dx=point.x-lot.x,dz=point.z-lot.z,length=Math.hypot(dx,dz);
        const district=sites.findIndex(s=>s.x===lot.x&&s.z===lot.z);
        let fraction=2.1/length;
        if(district>=0){let lo=0,hi=1;for(let i=0;i<18;i++){const mid=(lo+hi)/2;if(insideCoast(dx*mid,dz*mid,districtOutline(district)))lo=mid;else hi=mid;}fraction=Math.max(0,lo-.09);}
        road(lot.x+dx*fraction,lot.z+dz*fraction,point.x,point.z,district>=0?1.4:.9);
      });
      // Shared octagonal joints cover gaps where rotated rectangular road strips meet.
      const jointGeometry=new THREE.CylinderGeometry(.86,.86,.1,8);terrainGeometries.push(jointGeometry);
      const joints=[...new Map(roads.flatMap(r=>[[`${r.ax},${r.az}`,{x:r.ax,z:r.az}],[`${r.bx},${r.bz}`,{x:r.bx,z:r.bz}]] as [string,{x:number;z:number}][])).values()];
      const jointMesh=new THREE.InstancedMesh(jointGeometry,material("#142438"),joints.length);
      joints.forEach((p,i)=>jointMesh.setMatrixAt(i,new THREE.Matrix4().makeTranslation(p.x,.325,p.z)));jointMesh.receiveShadow=true;jointMesh.computeBoundingSphere();scene.add(jointMesh);
      function roadDistance(x:number,z:number){return Math.min(...roads.map(r=>{const dx=r.bx-r.ax,dz=r.bz-r.az,t=Math.max(0,Math.min(1,((x-r.ax)*dx+(z-r.az)*dz)/(dx*dx+dz*dz)));return Math.hypot(x-r.ax-t*dx,z-r.az-t*dz);}));}
      const groundPatches=createGroundCover(coast,terrain.regions.map(r=>r.points),
        sites.map((s,i)=>districtOutline(i).map(([x,z])=>[s.x+x,s.z+z])),available,roads);
      groundPatches.forEach((patch,index)=>{
        waterPolygon(patch.points,patch.color,.065);
        if(patch.kind==="paving"){
          const xs=patch.points.map(p=>p[0]),zs=patch.points.map(p=>p[1]);
          const x=(Math.min(...xs)+Math.max(...xs))/2,z=Math.max(...zs)-.22,width=Math.max(...xs)-Math.min(...xs)-.5;
          cube(x,.085,z,width,.02,.08,index%2?"#aea896":"#a4b2a3");
        }
      });
      const landmarks=[...cityBuildings.map(([kind])=>kind),"construction","fountain","park"];
      const scenerySites=available.map((site,index)=>({...site,kind:index<landmarks.length?landmarks[index]:"building"}));
      scenerySites.forEach((site,index)=>{
        const group=new THREE.Group();group.position.set(site.x,0,site.z);group.rotation.y=site.yaw;scene.add(group);
        const block=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{const mesh=cube(x,y,z,w,h,d,color);group.add(mesh);return mesh;};
        if(site.kind==="building")drawUniqueBuilding(index,block);
        else if(index<cityBuildings.length)drawCityLandmark(site.kind,block);
        else drawScenery(site.kind,block);
      });
      roads.filter((_,i)=>i%2===0).forEach(r=>{
        const dx=r.bx-r.ax,dz=r.bz-r.az,length=Math.hypot(dx,dz);
        const x=(r.ax+r.bx)/2+dz/length*1.5,z=(r.az+r.bz)/2-dx/length*1.5;
        if(isWater(x,z,1))return;
        if(sites.some(s=>Math.hypot(s.x-x,s.z-z)<10.2))return;
        cube(x,.95,z,.1,1.8,.1,"#3b4a5c");cube(x+.22,1.84,z,.55,.1,.12,"#849aa9");
        const lamp=cube(x+.42,1.77,z,.3,.12,.25,"#f5dca1");
        const glow=material("#f5dca1");glow.emissive.set("#f5dca1");glow.emissiveIntensity=.65;lamp.material=glow;
      });
      let planted=0;
      const trees:{x:number;z:number}[]=[];
      for(let attempt=0;attempt<5000&&planted<300;attempt++){
        const x=(random()-.5)*(worldW*1.15),z=(random()-.5)*(worldD*1.15);
        if(isWater(x,z,1)||reserved(x,z,1)||trees.some(t=>Math.hypot(t.x-x,t.z-z)<2.2)||!insideCoast(x,z,coast)||scenerySites.some(s=>Math.hypot(s.x-x,s.z-z)<4.6)||sites.some(site=>Math.hypot(site.x-x,site.z-z)<10.2)||roadDistance(x,z)<1.8)continue;
        const size=.55+random()*.65;
        cube(x,.12,z,1.2+random(),.12,1+random(),"#3b665c").rotation.y=random()*Math.PI;cube(x,.5,z,.16,.8,.16,"#46514b");cube(x,.9+size*.4,z,size,size*1.3,size,["#71a78a","#b6bb70","#b99087","#609b91","#8e9fbd"][planted%5]);
        if(planted%3===0)cube(x+.13,1.1+size,z,size*.65,size*.65,size*.65,"#8cb9a2");
        trees.push({x,z});planted++;
      }
      roads.filter((_,i)=>i%3===0).forEach((r,i)=>{const x=(r.ax+r.bx)/2,z=(r.az+r.bz)/2;const car=cube(x,.6,z,.5,.45,.95,["#bcd6e9","#c4a785","#6491c6"][i%3]);car.rotation.y=Math.atan2(r.bx-r.ax,r.bz-r.az);cube(x,.92,z,.34,.15,.45,"#8eaebf");});
      drawCityDetails({
        block:cube, roads, lakes, water:isWater, roadDistance,
        free:(x,z,r)=>insideCoast(x,z,coast)&&!isWater(x,z,r)&&!reserved(x,z,r)
          &&scenerySites.every(s=>Math.hypot(s.x-x,s.z-z)>3.7+r)
          &&sites.every(s=>Math.hypot(s.x-x,s.z-z)>10.2+r)
          &&trees.every(t=>Math.hypot(t.x-x,t.z-z)>1+r),
      });
      sites.forEach(({category,seed,x,z},index)=>{
        const style=buildingStyle(category.name);
        const block=(dx:number,y:number,dz:number,w:number,h:number,d:number,color:string)=>cube(x+dx,y,z+dz,w,h,d,color,category);
        const access=streetNetwork.accesses.find(a=>a.lot.x===x&&a.lot.z===z);
        let entry:number[]|undefined;
        if(access){const dx=access.point.x-x,dz=access.point.z-z;let lo=0,hi=1;for(let i=0;i<18;i++){const mid=(lo+hi)/2;if(insideCoast(dx*mid,dz*mid,districtOutline(index)))lo=mid;else hi=mid;}entry=[dx*Math.max(0,lo-.09),dz*Math.max(0,lo-.09)];}
        drawDistrict(style,index,block,(points,color)=>{
          const shape=new THREE.Shape();points.forEach(([px,pz],i)=>{if(i===0)shape.moveTo(px,-pz);else shape.lineTo(px,-pz);});shape.closePath();
          const geo=new THREE.ExtrudeGeometry(shape,{depth:.3,bevelEnabled:false});geo.rotateX(-Math.PI/2);terrainGeometries.push(geo);
          // Initialize the group with a tiny entry marker before adding the polygon floor.
          block(0,.17,0,.01,.01,.01,color);
          const floor=new THREE.Mesh(geo,material(color));floor.position.y=.03;floor.receiveShadow=true;floor.userData.category=category;
          buildingGroups.get(category.name)!.add(floor);meshes.push(floor);
        },entry);
        const canvas=document.createElement("canvas");canvas.width=512;canvas.height=128;const ctx=canvas.getContext("2d")!;
        ctx.textAlign="center";ctx.textBaseline="middle";ctx.font='700 84px "Noto Sans SC Variable", sans-serif';
        ctx.lineJoin="round";ctx.strokeStyle="#152b49";ctx.lineWidth=12;ctx.strokeText(category.name,256,64,480);ctx.fillStyle="#f0f5ff";ctx.fillText(category.name,256,64,480);
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;labels.push(texture);
        const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.position.set(x,.8,z+7.5);sprite.scale.set(8,2,1);sprite.renderOrder=1;sprite.userData.category=category;meshes.push(sprite);scene.add(sprite);
      });
      scene.updateMatrixWorld(true);
      const batches=new Map<InstanceType<typeof THREE.Material>,InstanceType<typeof THREE.Mesh>[]>();
      scene.traverse(object=>{if(object instanceof THREE.Mesh&&object.geometry===geometry&&!object.userData.category){const key=object.material as InstanceType<typeof THREE.Material>;const batch=batches.get(key)??[];batch.push(object);batches.set(key,batch);}});
      batches.forEach((batch,key)=>{const instances=new THREE.InstancedMesh(geometry,key,batch.length);batch.forEach((mesh,i)=>{instances.setMatrixAt(i,mesh.matrixWorld);mesh.removeFromParent();});instances.castShadow=true;instances.receiveShadow=true;instances.computeBoundingSphere();scene.add(instances);});
      const composer=new EffectComposer(renderer);
      const renderPass=new RenderPass(scene,camera);
      const outlinePass=new OutlinePass(new THREE.Vector2(container.clientWidth,container.clientHeight),scene,camera);
      outlinePass.visibleEdgeColor.set("#f0f6ff");outlinePass.hiddenEdgeColor.set("#3574ff");
      outlinePass.edgeStrength=8;outlinePass.edgeThickness=3;outlinePass.edgeGlow=0;outlinePass.pulsePeriod=0;
      const outputPass=new OutputPass();composer.addPass(renderPass);composer.addPass(outlinePass);composer.addPass(outputPass);
      const renderScene=()=>composer.render();
      let activeCategory:string|undefined,animation=0;
      const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
      const lifts=new Map<string,number>();
      const animateHover=()=>{
        let pending=false;
        buildingGroups.forEach((group,name)=>{const goal=name===activeCategory?1:0,previous=lifts.get(name)??0;const value=reducedMotion.matches?goal:Math.abs(goal-previous)<.015?goal:previous+(goal-previous)*.24;lifts.set(name,value);group.position.y=value*.22;group.scale.setScalar(1);

          meshes.forEach(object=>{if(object instanceof THREE.Sprite&&object.userData.category?.name===name){object.scale.set(8*(1+value*.08),2*(1+value*.08),1);object.material.color.set(value>.1?"#b7e3ff":"#ffffff");}});
          if(value!==goal)pending=true;
        });
        renderScene();animation=pending?requestAnimationFrame(animateHover):0;
      };
      const highlight=(category?:Category)=>{if(activeCategory===category?.name)return;activeCategory=category?.name;outlinePass.selectedObjects=category?[buildingGroups.get(category.name)!]:[];setHovered(category);if(!animation)animateHover();};
      highlightControl.current=highlight;
      highlight(directoryPointer.current??directoryFocus.current??locatedCategory.current);
      let travelAnimation=0;
      const stopTravel=()=>{cancelAnimationFrame(travelAnimation);travelAnimation=0;};
      locateControl.current=(category)=>{
        const site=sites.find(s=>s.category.name===category.name);
        if(!site)return;
        stopTravel();locatedCategory.current=category;highlight(category);
        const start=target.clone(),end=new THREE.Vector3(site.x,0,site.z),started=performance.now();
        const travel=(now:number)=>{
          const progress=reducedMotion.matches?1:Math.min(1,(now-started)/750);
          const eased=1-Math.pow(1-progress,3);
          target.lerpVectors(start,end,eased);fitCamera();renderScene();
          travelAnimation=progress<1?requestAnimationFrame(travel):0;
        };
        travel(started);
      };
      const applyZoom=(value:number)=>{stopTravel();locatedCategory.current=undefined;if(value===0){target.set(0,0,0);fitCamera();}camera.zoom=Math.max(1,Math.min(3,value));camera.updateProjectionMatrix();renderScene();setZoom(camera.zoom);highlight();};
      zoomControl.current=applyZoom;
      const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
      const touches=new Map<number,{x:number;y:number}>();
      let downX=0,downY=0,moved=false;
      const pinchDistance=()=>{const [a,b]=[...touches.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;};
      const hit=(event:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(meshes,false)[0]?.object.userData.category as Category|undefined;};
      const down=(event:PointerEvent)=>{if(event.button!==0)return;stopTravel();locatedCategory.current=undefined;touches.set(event.pointerId,{x:event.clientX,y:event.clientY});renderer.domElement.setPointerCapture(event.pointerId);if(touches.size===1){downX=event.clientX;downY=event.clientY;moved=false;}else moved=true;};
      const move=(event:PointerEvent)=>{
        const previous=touches.get(event.pointerId);
        const before=pinchDistance();
        if(touches.has(event.pointerId))touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
        if(touches.size>1){moved=true;const after=pinchDistance();if(before>0&&after>0)applyZoom(camera.zoom*after/before);return;}
        if(Math.hypot(event.clientX-downX,event.clientY-downY)>6)moved=true;
        if(previous&&moved){const scale=(camera.top-camera.bottom)/container.clientHeight/camera.zoom;const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);const delta=right.multiplyScalar(-(event.clientX-previous.x)*scale).add(up.multiplyScalar((event.clientY-previous.y)*scale));target.x=Math.max(-78,Math.min(78,target.x+delta.x));target.z=Math.max(-78,Math.min(78,target.z+delta.z));fitCamera();renderScene();highlight();return;}
        const category=hit(event);highlight(category);renderer.domElement.style.cursor=category?"pointer":"grab";
      };
      const up=(event:PointerEvent)=>{const active=touches.delete(event.pointerId);if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId);if(active&&!moved&&touches.size===0){const category=hit(event);if(category)router.push(`/posts?${new URLSearchParams({category:category.name})}`);}};
      const leave=()=>{highlight(locatedCategory.current);};
      const cancel=(event:PointerEvent)=>{touches.delete(event.pointerId);moved=true;};
      const wheel=(event:WheelEvent)=>{event.preventDefault();const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?container.clientHeight:1);applyZoom(camera.zoom*Math.exp(-Math.max(-200,Math.min(200,delta))*.002));};
      renderer.domElement.addEventListener("pointerdown",down);renderer.domElement.addEventListener("pointermove",move);renderer.domElement.addEventListener("pointerup",up);renderer.domElement.addEventListener("pointerleave",leave);renderer.domElement.addEventListener("pointercancel",cancel);renderer.domElement.addEventListener("lostpointercapture",cancel);renderer.domElement.addEventListener("wheel",wheel,{passive:false});
      const resize=()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);composer.setSize(w,h);fitCamera();renderScene();};
      const observer=new ResizeObserver(resize);observer.observe(container);resize();
      cleanup=()=>{stopTravel();locateControl.current=null;locatedCategory.current=undefined;cancelAnimationFrame(animation);outlinePass.dispose();outputPass.dispose();renderPass.dispose();composer.dispose();highlightControl.current=null;directoryPointer.current=undefined;directoryFocus.current=undefined;zoomControl.current=null;observer.disconnect();renderer.domElement.removeEventListener("wheel",wheel);renderer.domElement.removeEventListener("lostpointercapture",cancel);renderer.domElement.removeEventListener("pointerdown",down);renderer.domElement.removeEventListener("pointermove",move);renderer.domElement.removeEventListener("pointerup",up);renderer.domElement.removeEventListener("pointerleave",leave);renderer.domElement.removeEventListener("pointercancel",cancel);scene.traverse(object=>{if(object instanceof THREE.InstancedMesh)object.dispose();if(object instanceof THREE.Sprite){object.material.dispose();}});labels.forEach(t=>t.dispose());terrainGeometries.forEach(g=>g.dispose());groundGeometry.dispose();geometry.dispose();materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
      setStatus("ready");
    }
    init().catch(error=>{if(!cancelled){console.error("City initialization failed",error);cleanup();setStatus("fallback");}});
    return()=>{cancelled=true;cleanup();};
  },[categories,router]);
  if(status==="fallback")return <><p className={styles.note}>此设备暂时无法启用实时 3D，已显示等距地图。</p><CityMap categories={categories}/></>;
  return <div className={`${styles.map} ${styles.immersiveMap}`}>
    <div className={styles.liveStage} ref={host}>{status==="loading"&&<p className={styles.sceneStatus}>正在建造你的城市…</p>}</div>
    <div className={styles.cityHud}><p>OTTLOG / CITY OF STORIES</p><h1>分类城市</h1><span>{categories.length} 个街区 · 点击街区，走进故事</span></div>
    <details className={styles.directoryPanel} onToggle={event=>{if(!event.currentTarget.open){directoryPointer.current=undefined;directoryFocus.current=undefined;highlightControl.current?.(locatedCategory.current);}}}><summary>分类目录</summary><div className={styles.cityDirectory} aria-label="城市分类入口">{categories.map(category=><button type="button" key={category.name} disabled={status!=="ready"} aria-label={`定位到${category.name}街区`}
        onClick={event=>{locateControl.current?.(category);const panel=event.currentTarget.closest("details");if(panel)panel.open=false;}}
        onMouseEnter={()=>{directoryPointer.current=category;syncDirectory();}}
        onMouseLeave={()=>{directoryPointer.current=undefined;syncDirectory();}}
        onFocus={()=>{directoryFocus.current=category;syncDirectory();}}
        onBlur={()=>{directoryFocus.current=undefined;syncDirectory();}}
      ><strong>{category.name}</strong><span>{category.count} 篇文章 <i aria-hidden="true">⌖</i></span></button>)}</div></details>
    <div className={styles.zoomControls} role="group" aria-label="地图缩放">
      <button type="button" aria-label="缩小地图" disabled={status!=="ready"||zoom<=1} onClick={()=>zoomControl.current?.(zoom/1.25)}>−</button>
      <button type="button" aria-label="复位地图缩放" disabled={status!=="ready"} onClick={()=>zoomControl.current?.(0)}>{Math.round(zoom*100)}%</button>
      <button type="button" aria-label="放大地图" disabled={status!=="ready"||zoom>=3} onClick={()=>zoomControl.current?.(zoom*1.25)}>＋</button>
    </div>
    {hovered && <div key={hovered.name} className={styles.categorySpotlight} role="status">
      <span className={styles.spotlightLabel}>DISTRICT / 分类街区</span>
      <strong>{hovered.name}</strong>
      <span>{hovered.count} 篇记录 · 点击街区进入</span>
    </div>}
    <div className={styles.sceneCaption}>{hovered ? `${hovered.name} · ${hovered.count} 篇记录 · 点击进入` : "拖动探索城市 · 滚轮或双指缩放 · 彩色街区进入分类"}</div>
  </div>;
}


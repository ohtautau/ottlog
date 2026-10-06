"use client";

import { useState } from "react";
import type { Category } from "@/lib/posts";
import styles from "./city.module.css";

type Point = [number, number, number?];
function seedOf(name: string) { let seed = 2166136261; for (const char of name) seed = Math.imul(seed ^ char.codePointAt(0)!, 16777619) >>> 0; return seed; }

export default function CityMap({ categories }: { categories: Category[] }) {
  const [zoom, setZoom] = useState(1);
  const columns = Math.min(4, categories.length);
  const rows = Math.ceil(categories.length / columns);
  const landWidth = columns * 180 + 60;
  const landDepth = rows * 180 + 60;
  const origin = landDepth * .82 + 70;
  const width = (landWidth + landDepth) * .82 + 140;
  const height = (landWidth + landDepth) * .4 + 320;
  const project = ([x, y, z = 0]: Point) => [origin + (x - y) * .82, 180 + (x + y) * .4 - z];
  const points = (vertices: Point[]) => vertices.map(vertex => project(vertex).join(",")).join(" ");
  function tile(x: number, y: number, w: number, d: number, fill: string, z = 0) {
    return <polygon points={points([[x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z]])} fill={fill} />;
  }
  function box(x: number, y: number, w: number, d: number, h: number, colors: string[], base = 0) {
    return <g stroke="#101d30" strokeWidth="2.5" strokeLinejoin="round">
      <polygon points={points([[x,y+d,base],[x+w,y+d,base],[x+w,y+d,h+base],[x,y+d,h+base]])} fill={colors[0]} />
      <polygon points={points([[x+w,y,base],[x+w,y+d,base],[x+w,y+d,h+base],[x+w,y,h+base]])} fill={colors[1]} />
      <polygon points={points([[x,y,h+base],[x+w,y,h+base],[x+w,y+d,h+base],[x,y+d,h+base]])} fill={colors[2]} />
    </g>;
  }
  const buildings = categories.map((category, index) => ({ category, x: 60 + index % columns * 180, y: 60 + Math.floor(index / columns) * 180, seed: seedOf(category.name) })).sort((a,b) => a.x+a.y-b.x-b.y);
  return <div className={styles.map}>
    <div className={styles.toolbar}><span>等距城市地图 · 滑动浏览街区</span><div><button type="button" aria-label="缩小地图" disabled={zoom <= .75} onClick={() => setZoom(z => Math.max(.75, z - .25))}>−</button><button type="button" onClick={() => setZoom(1)} aria-label="重置地图缩放">{Math.round(zoom * 100)}%</button><button type="button" aria-label="放大地图" disabled={zoom >= 1.75} onClick={() => setZoom(z => Math.min(1.75, z + .25))}>＋</button></div></div>
    <div className={styles.viewport} tabIndex={0} role="region" aria-label="城市地图，可滚动浏览，点击建筑查看文章">
      <svg className={styles.scene} style={{ width: `${zoom * 100}%`, minWidth: `${zoom * 940}px` }} viewBox={`0 0 ${width} ${height}`}>
        <title>Ottlog 分类城市：道路连接每个分类建筑</title>
        <defs><pattern id="city-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#8aafff0b" /></pattern></defs>
        <rect width={width} height={height} fill="url(#city-grid)" />
        <polygon points={points([[0,0,-28],[landWidth,0,-28],[landWidth,landDepth,-28],[0,landDepth,-28]])} fill="#070f1c" transform="translate(20 18)" />
        {box(0,0,landWidth,landDepth,20,["#334d6b","#1b3049","#526b83"],-20)}
        {Array.from({length: columns+1},(_,i) => <g key={`v${i}`}>{tile(20+i*180,0,26,landDepth,"#172637")}<polyline points={points([[33+i*180,0],[33+i*180,landDepth]])} stroke="#b0c4d4" strokeWidth="1.5" strokeDasharray="9 10" /></g>)}
        {Array.from({length: rows+1},(_,i) => <g key={`h${i}`}>{tile(0,20+i*180,landWidth,26,"#172637")}<polyline points={points([[0,33+i*180],[landWidth,33+i*180]])} stroke="#b0c4d4" strokeWidth="1.5" strokeDasharray="9 10" /></g>)}
        {Array.from({length:rows*columns},(_,i)=>{const x=60+i%columns*180,y=60+Math.floor(i/columns)*180;return <g key={i}>{tile(x-8,y-8,140,140,"#758da2")}{tile(x+92,y+10,30,90,"#355f5e")}{tile(x+4,y+4,84,90,"#526e88")}</g>;})}
        {buildings.map(({category,x,y,seed})=>{
          const floors=3+seed%4, h=floors*22, w=64+(seed>>>4)%3*8, d=58+(seed>>>6)%2*12;
          const colors=[["#447ff0","#2450a1","#9ebeff"],["#6688ac","#375779","#b9d2e8"],["#559caa","#2a626d","#a9dde0"],["#8387bd","#4e5588","#c6c9ef"]][(seed>>>8)%4];
          return <g key={category.name}>
            {tile(x+18,y+18,w+30,d+30,"#10213666")}
            <a href={`/posts?${new URLSearchParams({category:category.name})}`} className={styles.mapBuilding} aria-label={`${category.name}，${category.count} 篇文章`}>
              <title>{`${category.name} · ${category.count} 篇文章`}</title>
              <g className={styles.tower}>
                {box(x,y,w,d,h,colors)}
                {box(x+16,y+12,26,23,12,[colors[1],colors[1],colors[2]],h)}
                {Array.from({length:floors},(_,floor)=><g key={floor}>{[0,1,2].map(col=><g key={col}><polygon className={styles.window} points={points([[x+8+col*18,y+d+.5,12+floor*22],[x+18+col*18,y+d+.5,12+floor*22],[x+18+col*18,y+d+.5,23+floor*22],[x+8+col*18,y+d+.5,23+floor*22]])} fill={(seed>>>(col+floor))%3 ? "#b4d2f3" : "#ffe1a1"} stroke="#19334d" strokeWidth="2" /><polygon className={styles.window} points={points([[x+w+.5,y+8+col*15,12+floor*22],[x+w+.5,y+17+col*15,12+floor*22],[x+w+.5,y+17+col*15,23+floor*22],[x+w+.5,y+8+col*15,23+floor*22]])} fill="#91b5d7" stroke="#19334d" strokeWidth="2" /></g>)}</g>)}
              </g>

            </a>
            {[0,1].map(i=><g key={i}>{box(x+104,y+20+i*42,5,5,12,["#324954","#253c46","#8fafac"])}{box(x+97,y+13+i*42,19,19,17,["#518982","#326862","#8ec1ac"],10)}</g>)}
          </g>;
        })}
        {buildings.map(({category,x,y,seed})=>{const w=64+(seed>>>4)%3*8,d=58+(seed>>>6)%2*12;const label=project([x+w/2,y+d+30,0]);return <a key={`sign-${category.name}`} href={`/posts?${new URLSearchParams({category:category.name})}`} className={styles.mapBuilding} aria-label={`${category.name}????`}><g className={styles.mapSign} transform={`translate(${label[0]-57},${label[1]})`}><rect x="3" y="4" width="114" height="37" fill="#091725" /><rect className={styles.signFace} width="114" height="37" fill="#203853" stroke="#9bb8dd" strokeWidth="2" /><text x="57" y="16" textAnchor="middle">{category.name.length>7?category.name.slice(0,6)+"…":category.name}</text><text x="57" y="30" textAnchor="middle" className={styles.signCount}>{category.count} 篇记录</text></g></a>;})}
        <g transform={`translate(55 ${height-90})`} fill="#9cb5d4"><path d="M0 30 18 0 36 30 18 22Z" fill="#8aafff" /><text x="18" y="-8" textAnchor="middle" fontSize="14">N</text><text x="55" y="23" fontSize="13">OTTLOG / 好奇心街区</text></g>
      </svg>
    </div>
    <div className={styles.legend}><span>■ 分类建筑</span><span>▧ 城市道路</span><span>▰ 街角绿地</span><span>点击建筑或门牌进入分类</span></div>
  </div>;
}

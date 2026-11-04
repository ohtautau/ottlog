// Exercise native Canvas orchestration against a real HTMLCanvas SDK adapter.
// This verifies PNG pixels and bounded resizing, not WeChat device rendering.
import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('../../miniprogram/node_modules/typescript');
const source=await fs.readFile('../miniprogram/src/lib/native-alpha-canvas.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2019}}).outputText;
const browser=await chromium.launch();
try {
 const page=await browser.newPage();
 const result=await page.evaluate(async code=>{
  const canvas=document.createElement('canvas');canvas.id='editor-alpha';document.body.append(canvas);
  canvas.createImage=()=>new Image();
  const files=new Map(),exportsSeen=[];
  const taro={createSelectorQuery:()=>({select(id){this.id=id;return this;},fields(){return this;},exec(done){done([{node:document.querySelector(this.id)}]);}}),canvasToTempFilePath:async options=>{if(options.canvas!==canvas||options.fileType!=='png')throw Error('wrong SDK contract');const data=canvas.toDataURL('image/png');const path='out-'+files.size;files.set(path,data.split(',')[1]);exportsSeen.push([canvas.width,canvas.height]);return {tempFilePath:path};}};
  const m={exports:{}};new Function('require','module','exports',code)(()=>({default:taro}),m,m.exports);
  const input=document.createElement('canvas');input.width=2400;input.height=1200;const ctx=input.getContext('2d');ctx.fillStyle='#39ad6c';ctx.fillRect(600,300,1200,600);
  let attempts=0;const base64=await m.exports.nativeAlphaImage(input.toDataURL('image/png'),2400,1200,{canvasId:canvas.id,isCurrent:()=>true},async path=>files.get(path),data=>{attempts++;return attempts>=3&&data.length*3/4<180*1024;});
  const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();const output=document.createElement('canvas');output.width=image.width;output.height=image.height;const context=output.getContext('2d');context.drawImage(image,0,0);
  return {exportsSeen,width:image.width,height:image.height,corner:context.getImageData(0,0,1,1).data[3],center:[...context.getImageData(image.width/2,image.height/2,1,1).data],cleaned:[canvas.width,canvas.height]};
 },js);
 expect(result.exportsSeen).toEqual([[1280,640],[960,480],[720,360]]);expect(result.corner).toBe(0);expect(result.center).toEqual([57,173,108,255]);expect(result.cleaned).toEqual([1,1]);
 await fs.mkdir('test-results/native-alpha',{recursive:true});await fs.writeFile('test-results/native-alpha/result.json',JSON.stringify(result,null,2));console.log('PASS native Canvas adapter: real resized PNG retains transparent corners, opaque center and cleanup');
}finally{await browser.close();}

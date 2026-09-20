#!/usr/bin/env node
/** Headless CPU scene rendering to a binary PPM file. */
import {readFile,writeFile} from 'node:fs/promises';
import {createScene,validateScene,evaluateScene} from '../public/packages/core/index.js';
import {prepare,rayAt,softwarePixel} from '../public/packages/renderer/geometry.js';
const args=process.argv.slice(2),input=args.find(x=>!x.startsWith('-')),get=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1]};
const width=Math.max(16,Math.min(1920,Number(get('--width',320)))),height=Math.max(16,Math.min(1080,Number(get('--height',200))));
const source=input&&!['--output','--width','--height'].some(k=>args[args.indexOf(input)-1]===k)?validateScene(JSON.parse(await readFile(input,'utf8'))):createScene();
const scene=evaluateScene(source),objects=prepare(scene),solo=scene.lights.some(l=>l.solo),lights=scene.lights.filter(l=>l.enabled&&(!solo||l.solo)),pixels=Buffer.alloc(width*height*3),start=Date.now();
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const color=softwarePixel(rayAt(scene.camera,(x+.5)/width,(y+.5)/height,width/height),objects,lights,scene.settings);for(let k=0;k<3;k++){let c=color[k];if(scene.settings.aov==='beauty'){c*=2**scene.settings.exposure;c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14)}pixels[(y*width+x)*3+k]=Math.round(Math.pow(Math.min(1,Math.max(0,c)),1/2.2)*255)}}
const output=get('--output','lumera-render.ppm');await writeFile(output,Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`),pixels]));console.log(JSON.stringify({output,width,height,elapsedMs:Date.now()-start,backend:'CPU'}));

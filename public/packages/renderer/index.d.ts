import type {Scene,Camera,RenderSettings} from '@lumera/core';
export interface RenderStats{backend:string;samples:number;width:number;height:number;frameMs:number;error:string;running:boolean}
export class LumeraRenderer extends EventTarget{static create(canvas:HTMLCanvasElement,options?:Record<string,unknown>):Promise<LumeraRenderer>;canvas:HTMLCanvasElement;scene:Scene;samples:number;running:boolean;backend:string;error:string;frameMs:number;setScene(scene:Scene):void;setCamera(camera:Camera):void;setOptions(options:Partial<RenderSettings>):void;setRunning(running:boolean):void;invalidate():void;pick(u:number,v:number):string|null;capture():Promise<Blob>;dispose():void}
export function pick(scene:Scene,u:number,v:number,aspect:number):string|null;

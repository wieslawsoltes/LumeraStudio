export class LumeraNodeGraph extends HTMLElement{data:{nodes:{id:string;type:string;name:string;x:number;y:number;enabled:boolean}[];edges:[string,string][]};selection:string|null;zoom:number;pan:[number,number];fit():void}
export class LumeraTimeline extends HTMLElement{data:{frame:number;start:number;end:number;fps:number};playing:boolean}
export function escape(value:unknown):string;
declare global{interface HTMLElementTagNameMap{'lumera-node-graph':LumeraNodeGraph;'lumera-timeline':LumeraTimeline}}

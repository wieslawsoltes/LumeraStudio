import {cp, mkdir, readFile, writeFile, readdir, rm} from 'node:fs/promises';
import {resolve, relative, dirname, posix} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'_site');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(resolve(root,'public'),output,{recursive:true});
async function rewrite(directory) {
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    const file=resolve(directory,entry.name);
    if(entry.isDirectory()){await rewrite(file);continue;}
    if(!entry.name.endsWith('.html')) continue;
    const from=relative(output,dirname(file)).replaceAll('\\','/') || '.';
    const localPath=path=>{const rel=posix.relative(from,path);return rel.startsWith('.')?rel:'./'+rel;};
    let text=await readFile(file,'utf8');
    text=text.replace(/(\b(?:src|href)=["'])\/(?!\/)([^"']*)(["'])/g,(_,a,path,b)=>a+localPath(path)+b);
    text=text.replace(/(\bfrom\s*["'])\/(?!\/)([^"']*)(["'])/g,(_,a,path,b)=>a+localPath(path)+b);
    if(relative(output,file)==='index.html'){
      text=text.replace('</head>','<meta name="lumera-storage" content="local"></head>');
      text=text.replace('title="Share project"','title="Export a scene to share"');
      text=text.replace('>Collaborate</button>','>Share file</button>').replace('<span class="build-tag">v0.1</span>','<span class="build-tag" title="Projects are stored only in this browser">v0.1 · Browser-local</span>');
    }
    await writeFile(file,text);
  }
}
await rewrite(output);
await writeFile(resolve(output,'.nojekyll'),'');
console.log('Built GitHub Pages browser-local edition in _site/');

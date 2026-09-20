export const shader=/*wgsl*/`
struct Params {size:vec4f, eye:vec4f, forward:vec4f, right:vec4f, up:vec4f, counts:vec4f, settings:vec4f, background:vec4f}
struct Obj {pos:vec4f, scale:vec4f, r0:vec4f, r1:vec4f, r2:vec4f, color:vec4f, surface:vec4f, extra:vec4f}
struct Light {pos:vec4f, color:vec4f, extra:vec4f}
struct Hit {t:f32, index:i32, normal:vec3f}
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var<storage,read> objects:array<Obj>;
@group(0) @binding(2) var<storage,read> lights:array<Light>;
@group(0) @binding(3) var<storage,read_write> accumulation:array<vec4f>;
@group(0) @binding(4) var output:texture_storage_2d<rgba16float,write>;
var<private> seed:u32;
fn random()->f32 {seed^=seed<<13u;seed^=seed>>17u;seed^=seed<<5u;return f32(seed)/4294967296.0;}
fn localPoint(v:vec3f,o:Obj)->vec3f {return vec3f(dot(o.r0.xyz,v),dot(o.r1.xyz,v),dot(o.r2.xyz,v))/o.scale.xyz;}
fn sdf(q:vec3f,typ:i32)->f32 {if(typ==0){return length(q)-1.;}if(typ==1){let d=abs(q)-vec3f(1.);return length(max(d,vec3f(0.)))+min(max(d.x,max(d.y,d.z)),0.);}if(typ==3){return length(vec2f(length(q.xy)-.73,q.z))-.27;}let d=vec2f(length(q.xz)-1.,abs(q.y)-1.);return min(max(d.x,d.y),0.)+length(max(d,vec2f(0.)));}
fn intersect(ro:vec3f,rd:vec3f,limit:f32,skip:i32)->Hit {
 var hit=Hit(limit,-1,vec3f(0.));
 for(var i=0;i<i32(p.counts.x);i++){
  let o=objects[i];let typ=i32(o.pos.w);let a=localPoint(ro-o.pos.xyz,o);let d=localPoint(rd,o);var t=limit;
  if(typ==2){if(abs(d.y)>.00001){t=-a.y/d.y;}}
  else if(typ==0){let aa=dot(d,d);let bb=dot(a,d);let cc=dot(a,a)-1.;let disc=bb*bb-aa*cc;if(disc>=0.){let near=(-bb-sqrt(disc))/aa;let far=(-bb+sqrt(disc))/aa;t=select(far,near,near>.001);}}
  else {let aa=dot(d,d);let bb=dot(a,d);let disc=bb*bb-aa*(dot(a,a)-3.);if(disc<0.){continue;}let far=(-bb+sqrt(disc))/aa;var travel=max(.002,(-bb-sqrt(disc))/aa);for(var step=0;step<70;step++){if(travel>min(hit.t,far)){break;}let distance=sdf(a+d*travel,typ)/length(d);if(abs(sdf(a+d*travel,typ))<.0005){t=travel;break;}travel+=max(abs(distance)*.85,.0005);}}
  if(t>.002&&t<hit.t){let q=a+d*t;var n=vec3f(0.,1.,0.);if(typ!=2){let e=.001;n=normalize(vec3f(sdf(q+vec3f(e,0.,0.),typ)-sdf(q-vec3f(e,0.,0.),typ),sdf(q+vec3f(0.,e,0.),typ)-sdf(q-vec3f(0.,e,0.),typ),sdf(q+vec3f(0.,0.,e),typ)-sdf(q-vec3f(0.,0.,e),typ)));}n/=o.scale.xyz;hit=Hit(t,i,normalize(o.r0.xyz*n.x+o.r1.xyz*n.y+o.r2.xyz*n.z));}
 }
 return hit;
}
fn sky(d:vec3f)->vec3f {return mix(p.background.xyz*.45,p.background.xyz*2.2,clamp(d.y*.5+.5,0.,1.))*p.settings.y;}
fn hemisphere(n:vec3f)->vec3f {let z=sqrt(random());let angle=random()*6.283185;let r=sqrt(1.-z*z);let helper=select(vec3f(1.,0.,0.),vec3f(0.,1.,0.),abs(n.y)<.9);let u=normalize(cross(helper,n));return normalize(u*cos(angle)*r+cross(n,u)*sin(angle)*r+n*z);}
fn trace(origin:vec3f,direction:vec3f)->vec3f {
 var ro=origin;var rd=direction;var radiance=vec3f(0.);var throughput=vec3f(1.);
 for(var bounce=0;bounce<i32(p.settings.z);bounce++){
  let hit=intersect(ro,rd,1000.,-1);if(hit.index<0){radiance+=throughput*sky(rd);break;}
  let o=objects[hit.index];var normal=hit.normal;if(dot(normal,rd)>0.){normal=-normal;}let point=ro+rd*hit.t;let base=o.color.xyz;let rough=clamp(o.color.w,.03,1.);let metal=o.surface.x;
  if(bounce==0){if(p.settings.w==1.){return base;}if(p.settings.w==2.){return normal*.5+.5;}if(p.settings.w==3.){return vec3f(exp(-hit.t*.12));}}
  radiance+=throughput*base*o.surface.y;
  let view=-rd;let f0=mix(vec3f(.04),base,metal);
  for(var li=0;li<i32(p.counts.y);li++){
   let l=lights[li];let linked=l.extra.z;if(linked>=0.&&i32(linked)!=hit.index){continue;}
   let offset=vec3f(random()-.5,random()-.5,random()-.5)*l.pos.w*2.;let delta=l.pos.xyz+offset-point;let distance=length(delta);let direction=delta/distance;let ndl=max(dot(normal,direction),0.);if(ndl<=0.){continue;}
   let shadow=intersect(point+normal*.004,direction,distance-.008,hit.index);if(shadow.index>=0){continue;}
   let halfVector=normalize(view+direction);let ndh=max(dot(normal,halfVector),0.);let ndv=max(dot(normal,view),.001);let vdh=max(dot(view,halfVector),0.);let a=rough*rough;let a2=a*a;let den=ndh*ndh*(a2-1.)+1.;let distribution=a2/(3.14159265*den*den);let k=(rough+1.)*(rough+1.)/8.;let geometry=(ndl/(ndl*(1.-k)+k))*(ndv/(ndv*(1.-k)+k));let fresnel=f0+(1.-f0)*pow(1.-vdh,5.);let spec=distribution*geometry*fresnel/max(4.*ndl*ndv,.001);let diffuse=(1.-fresnel)*(1.-metal)*base/3.14159265;
   radiance+=throughput*(diffuse+spec)*l.color.xyz*l.color.w*ndl/max(distance*distance,.1);
  }
  let fresnel=f0+(1.-f0)*pow(1.-max(dot(normal,view),0.),5.);let probability=clamp(max(fresnel.x,max(fresnel.y,fresnel.z)),.1,.9);
  if(random()<probability){rd=normalize(mix(reflect(rd,normal),hemisphere(normal),rough*rough));throughput*=fresnel/probability;}else{rd=hemisphere(normal);throughput*=base*(1.-metal)*(1.-fresnel)/(1.-probability);}
  ro=point+normal*.004;if(bounce>1){let survival=clamp(max(throughput.x,max(throughput.y,throughput.z)),.05,.95);if(random()>survival){break;}throughput/=survival;}
 }
 return min(radiance,vec3f(50.));
}
@compute @workgroup_size(8,8)
fn compute(@builtin(global_invocation_id) id:vec3u){let width=u32(p.size.x);let height=u32(p.size.y);if(id.x>=width||id.y>=height){return;}seed=(id.x*1973u+id.y*9277u+u32(p.size.z)*26699u)|1u;let uv=(vec2f(id.xy)+vec2f(random(),random()))/p.size.xy;let d=normalize(p.forward.xyz+p.right.xyz*(uv.x*2.-1.)*(p.size.x/p.size.y)*p.eye.w+p.up.xyz*(1.-uv.y*2.)*p.eye.w);let color=trace(p.eye.xyz,d);let index=id.y*width+id.x;let n=p.size.z;var total=color;if(n>0.){total=(accumulation[index].xyz*n+color)/(n+1.);}accumulation[index]=vec4f(total,1.);textureStore(output,vec2i(id.xy),vec4f(total,1.));}
`;
export const displayShader=/*wgsl*/`
@group(0) @binding(0) var inputImage:texture_2d<f32>;
@group(0) @binding(1) var<uniform> display:vec4f;
struct VertexOut {@builtin(position) position:vec4f}
@vertex fn vertex(@builtin(vertex_index) i:u32)->VertexOut{var positions=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return VertexOut(vec4f(positions[i],0.,1.));}
@fragment fn fragment(@builtin(position) position:vec4f)->@location(0) vec4f{var c=textureLoad(inputImage,vec2i(position.xy),0).rgb;if(display.y==0.){c*=exp2(display.x);c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);}if(display.y>1.){return vec4f(clamp(c,vec3f(0.),vec3f(1.)),1.);}return vec4f(pow(clamp(c,vec3f(0.),vec3f(1.)),vec3f(1./2.2)),1.);}
`;

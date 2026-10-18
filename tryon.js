import{FaceLandmarker,HandLandmarker,FilesetResolver}from'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',MS='https://storage.googleapis.com/mediapipe-models/';
let files,cache={};
async function model(type){if(cache[type])return cache[type];files=files||await FilesetResolver.forVisionTasks(WASM);
const w=type==='watch',C=w?HandLandmarker:FaceLandmarker,n=w?'hand_landmarker':'face_landmarker',url=`${MS}${n}/${n}/float16/1/${n}.task`;
const make=d=>C.createFromOptions(files,{baseOptions:{modelAssetPath:url,delegate:d},runningMode:'VIDEO',numFaces:1,numHands:1});
try{return cache[type]=await make('GPU')}catch{return cache[type]=await make('CPU')}}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function faceWear(l,w,h,pr){const P=i=>({x:l[i].x*w,y:l[i].y*h}),a=P(33),b=P(263),L=P(234),R=P(454),n=P(1),fw=dist(L,R),rot=Math.atan2(b.y-a.y,b.x-a.x),
yaw=(dist(n,L)-dist(n,R))/(dist(n,L)+dist(n,R)),c=Math.cos(rot),s=Math.sin(rot),dx=pr.ox*fw,dy=pr.oy*fw;
return{x:(a.x+b.x)/2+dx*c-dy*s,y:(a.y+b.y)/2+dx*s+dy*c,w:fw*pr.scale,rot,sx:1-.7*Math.abs(yaw)}}
function wristWear(l,w,h,pr){const P=i=>({x:l[i].x*w,y:l[i].y*h}),wr=P(0),m=P(9),pw=dist(P(5),P(17)),hl=dist(wr,m),u={x:(m.x-wr.x)/hl,y:(m.y-wr.y)/hl},r={x:-u.y,y:u.x};
return{x:wr.x-u.x*hl*.22+pw*(pr.ox*r.x-pr.oy*u.x),y:wr.y-u.y*hl*.22+pw*(pr.ox*r.y-pr.oy*u.y),w:pw*pr.scale*.95,rot:Math.atan2(u.x,-u.y),sx:1}}
export async function startTryOn({video,canvas,product,onStatus=()=>{}}){
const img=await new Promise((ok,no)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=()=>no(new Error('Product image failed to load'));i.src=product.image});
const S={facing:'user',stream:null,stop:false,pose:null},ctx=canvas.getContext('2d');
async function cam(){S.stream&&S.stream.getTracks().forEach(t=>t.stop());
S.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:S.facing,width:{ideal:1280},height:{ideal:720}},audio:false});
video.srcObject=S.stream;await video.play();canvas.width=video.videoWidth;canvas.height=video.videoHeight;S.pose=null}
onStatus('Loading try-on…');const[lm]=await Promise.all([model(product.type),cam()]);onStatus('');
let last=-1;
(function loop(){if(S.stop)return;requestAnimationFrame(loop);if(video.readyState<2)return;
const w=canvas.width,h=canvas.height,mir=S.facing==='user';
ctx.save();if(mir){ctx.translate(w,0);ctx.scale(-1,1)}ctx.drawImage(video,0,0,w,h);ctx.restore();
if(video.currentTime!==last){last=video.currentTime;const r=lm.detectForVideo(video,performance.now()),l=product.type==='watch'?r.landmarks?.[0]:r.faceLandmarks?.[0];
if(!l)S.pose=null;else{const t=(product.type==='watch'?wristWear:faceWear)(l,w,h,product);if(mir){t.x=w-t.x;t.rot=-t.rot}
if(!S.pose)S.pose=t;else{const q=S.pose,k=Math.min(.85,.2+Math.hypot(t.x-q.x,t.y-q.y)/q.w*6),d=Math.atan2(Math.sin(t.rot-q.rot),Math.cos(t.rot-q.rot));for(const f of['x','y','w','sx'])q[f]+=(t[f]-q[f])*k;q.rot+=d*k}}}
const q=S.pose;if(q){const ih=q.w*img.height/img.width;ctx.save();ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=q.w*.04;ctx.shadowOffsetY=q.w*.02;ctx.translate(q.x,q.y);ctx.rotate(q.rot);ctx.scale(q.sx,1);ctx.drawImage(img,-q.w/2,-ih/2,q.w,ih);ctx.restore()}})();
return{async flip(){S.facing=S.facing==='user'?'environment':'user';await cam()},stop(){S.stop=true;S.stream&&S.stream.getTracks().forEach(t=>t.stop())},
snap(){const c=document.createElement('canvas'),b=Math.round(canvas.height*.12);c.width=canvas.width;c.height=canvas.height+b;const x=c.getContext('2d');x.drawImage(canvas,0,0);x.fillStyle='#0d2b3e';x.fillRect(0,canvas.height,c.width,b);x.fillStyle='#fff';
x.font=`700 ${b*.34}px sans-serif`;x.fillText(product.name,b*.3,canvas.height+b*.48);x.font=`${b*.26}px sans-serif`;x.fillText(`₹${(+product.price).toLocaleString('en-IN')}  |  Wablo Opticals`,b*.3,canvas.height+b*.82);return new Promise(r=>c.toBlob(r,'image/jpeg',.92))}}}

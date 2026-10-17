
/* Wablo Opticals — static pilot. No Supabase or custom backend required. */
const $ = id => document.getElementById(id);
const CATALOG_KEY = 'wabloOpticalsCatalogV1', CLOUD_KEY = 'wabloOpticalsCloudinaryV1';
const money = v => v == null || v === '' ? 'Ask in store' : new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(v));
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = {products:[],selected:null,uploadFile:null,overlayBlob:null,overlayUrl:null,cameraStream:null,facing:'user',landmarker:null,anim:0,lastVideoTime:-1,modelLoading:false,removeBgModule:null};
const sampleProducts=[];

function toast(msg){
  const el=$('toast');
  if(!el){console.log(msg);return}
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>el.classList.remove('show'),3600);
}

function readCatalog(){
  try{
    const v=JSON.parse(localStorage.getItem(CATALOG_KEY)||'[]');
    return Array.isArray(v)?v:[];
  }catch{return[]}
}

function writeCatalog(){
  localStorage.setItem(CATALOG_KEY,JSON.stringify(state.products.filter(p=>!p.demo)));
}

function getCloud(){
  try{
    return {...{cloudName:'zvcdiolh',uploadPreset:'wablo_opticals'},...JSON.parse(localStorage.getItem(CLOUD_KEY)||'{}')};
  }catch{return{cloudName:'zvcdiolh',uploadPreset:'wablo_opticals'}}
}

function productUrl(p){
  const u=new URL(location.href);
  u.search='';
  u.hash='';
  u.searchParams.set('item',toBase64Url(JSON.stringify({
    id:p.id,
    name:p.name,
    price:p.price??null,
    color:p.color||'',
    image_url:p.image_url,
    overlay_url:p.overlay_url||p.image_url
  })));
  return u.toString();
}

function toBase64Url(s){
  const bytes=new TextEncoder().encode(s);
  let bin='';
  bytes.forEach(b=>bin+=String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function fromBase64Url(s){
  let b=s.replace(/-/g,'+').replace(/_/g,'/');
  b+='='.repeat((4-b.length%4)%4);
  return new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0)));
}

function cardMarkup(p){
  return `<article class="product-card">
    <div class="product-image">
      <span class="frame-label">${p.demo?'SAMPLE FRAME':'WABLO FRAME'}</span>
      <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.opacity='.25'"/>
    </div>
    <div class="product-info">
      <h3>${escapeHtml(p.name)}</h3>
      <div class="product-meta">
        <span class="muted">${escapeHtml(p.color||'Optical frame')}</span>
        <span class="price">${money(p.price)}</span>
      </div>
      <div class="product-actions">
        <button class="btn btn-dark" data-open="${escapeHtml(p.id)}">Try on ↗</button>
        <button class="btn btn-outline" data-share="${escapeHtml(p.id)}">Share</button>
      </div>
    </div>
  </article>`;
}

function renderShop(){
  const grid=$('product-grid');
  grid.innerHTML=state.products.length
    ?state.products.map(cardMarkup).join('')
    :`<div class="empty-state">No frames have been added yet.<br/>Open <b>Store studio</b> to add your first spectacle frame.</div>`;
  $('product-count').textContent=`${state.products.length} frame${state.products.length===1?'':'s'}`;
  grid.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openProduct(b.dataset.open));
  grid.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>shareProduct(findProduct(b.dataset.share)));
}

function findProduct(id){
  return state.products.find(p=>p.id===id)||sampleProducts.find(p=>p.id===id)||null;
}

function showView(name){
  ['shop','admin','product','tryon'].forEach(v=>$(v+'-view').classList.toggle('hidden',v!==name));
  $('nav-shop').classList.toggle('active',['shop','product','tryon'].includes(name));
  $('nav-admin').classList.toggle('active',name==='admin');
  window.scrollTo({top:0,behavior:'smooth'});
  if(name!=='tryon')stopCamera();
}

function openProduct(idOrProduct){
  const p=typeof idOrProduct==='object'?idOrProduct:findProduct(idOrProduct);
  if(!p)return;
  state.selected=p;
  $('product-detail').innerHTML=`
    <div class="detail-image"><img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}"/></div>
    <div class="detail-copy">
      <span class="eyebrow">WABLO OPTICALS / FRAME ${escapeHtml(String(p.id).slice(0,8).toUpperCase())}</span>
      <h1>${escapeHtml(p.name)}</h1>
      <p>Preview this spectacle frame on your face using your phone camera. For best results, use the front-facing camera in a bright room.</p>
      <div class="detail-price">${money(p.price)}</div>
      <p class="muted">Colour: ${escapeHtml(p.color||'As pictured')}</p>
      <div class="detail-actions">
        <button id="detail-try" class="btn btn-dark">Try this frame live ↗</button>
        <button id="detail-share" class="btn btn-outline">Share on WhatsApp</button>
      </div>
      <p class="detail-note">Virtual try-on is a visual preview, not a prescription measurement or fit guarantee.</p>
    </div>`;
  $('detail-try').onclick=()=>openTryon(p);
  $('detail-share').onclick=()=>shareProduct(p);
  showView('product');
}

function openTryon(p){
  const product=typeof p==='object'?p:findProduct(p);
  if(!product)return;
  state.selected=product;
  $('selected-frame').innerHTML=`
    <div class="selected-thumb"><img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}"/></div>
    <div><b>${escapeHtml(product.name)}</b><span>${money(product.price)} · ${escapeHtml(product.color||'Optical frame')}</span></div>`;
  showView('tryon');
}

function renderAdminProducts(){
  const list=$('admin-products');
  const products=state.products.filter(p=>!p.demo);
  $('inventory-total').textContent=String(products.length);
  list.innerHTML=products.length
    ?products.map(p=>`
      <article class="admin-product">
        <img src="${escapeHtml(p.image_url)}" alt=""/>
        <div class="admin-product-copy">
          <b>${escapeHtml(p.name)}</b>
          <span>${money(p.price)} · ${escapeHtml(p.color||'Optical frame')}</span>
          <a href="${escapeHtml(productUrl(p))}" target="_blank" rel="noopener">Open try-on link ↗</a>
        </div>
        <button class="btn btn-outline" data-copy="${escapeHtml(p.id)}">Copy link</button>
        <button class="btn btn-outline" data-delete="${escapeHtml(p.id)}">Delete</button>
      </article>`).join('')
    :`<p class="muted">Your uploaded frames will appear here. The catalogue is saved in this browser; export a backup before changing devices.</p>`;
  list.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>copyLink(findProduct(b.dataset.copy)));
  list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteProduct(b.dataset.delete));
}

async function copyLink(p){
  if(!p)return;
  try{
    await navigator.clipboard.writeText(productUrl(p));
    toast('Try-on link copied.');
  }catch{
    prompt('Copy this try-on link:',productUrl(p));
  }
}

async function shareProduct(p){
  if(!p)return;
  const url=productUrl(p);
  const text=`${p.name} — ${money(p.price)}\nTry these spectacles on with your camera:\n${url}`;
  try{
    if(navigator.share){
      let files=[];
      try{
        const res=await fetch(p.image_url,{mode:'cors'});
        const blob=await res.blob();
        const file=new File([blob],`${(p.name||'wablo-frame').replace(/[^a-z0-9_-]/gi,'-')}.jpg`,{type:blob.type||'image/jpeg'});
        if(navigator.canShare?.({files:[file]}))files=[file];
      }catch{}
      await navigator.share(files.length?{title:p.name,text,url,files}:{title:p.name,text,url});
      return;
    }
  }catch(e){
    if(e.name==='AbortError')return;
    console.warn(e);
  }
  window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');
  toast('WhatsApp opened. If the photo is not attached, attach it from your gallery and paste the link.');
}

async function uploadToCloudinary(file){
  const cfg=getCloud();
  if(!cfg.cloudName||!cfg.uploadPreset)throw Error('Save your Cloudinary cloud name and unsigned upload preset first.');
  const fd=new FormData();
  fd.append('file',file,file.name||'wablo-frame.png');
  fd.append('upload_preset',cfg.uploadPreset);
  fd.append('folder','wablo-opticals');
  const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloudName)}/image/upload`,{method:'POST',body:fd});
  const data=await response.json();
  if(!response.ok)throw Error(data.error?.message||'Image upload failed. Check Cloudinary preset settings.');
  return data.secure_url;
}

function updateCloudForm(){
  const c=getCloud();
  $('cloud-name').value=c.cloudName||'';
  $('cloud-preset').value=c.uploadPreset||'';
  $('cloud-config-status').textContent=c.cloudName&&c.uploadPreset?'Image hosting configured on this browser.':'Enter your Cloudinary details below.';
}

$('cloud-config-form').addEventListener('submit',e=>{
  e.preventDefault();
  const cloudName=$('cloud-name').value.trim(),uploadPreset=$('cloud-preset').value.trim();
  if(!/^[a-zA-Z0-9_-]+$/.test(cloudName)||!uploadPreset){
    $('cloud-config-status').textContent='Enter a valid cloud name and upload preset.';
    return;
  }
  localStorage.setItem(CLOUD_KEY,JSON.stringify({cloudName,uploadPreset}));
  $('cloud-config-status').textContent='Settings saved on this device.';
  toast('Image hosting settings saved.');
});

$('export-catalog').onclick=()=>{
  const blob=new Blob([JSON.stringify({version:1,products:state.products.filter(p=>!p.demo)},null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='wablo-opticals-catalog.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Catalogue backup exported.');
};

$('import-catalog').addEventListener('change',async e=>{
  const f=e.target.files?.[0];
  if(!f)return;
  try{
    const data=JSON.parse(await f.text()),items=Array.isArray(data)?data:data.products;
    if(!Array.isArray(items))throw Error('Invalid catalogue file');
    state.products=[...items.filter(p=>p&&p.id&&p.image_url).map(p=>({...p,demo:false})),...sampleProducts];
    writeCatalog();
    renderShop();
    renderAdminProducts();
    toast('Catalogue imported.');
  }catch(err){
    toast('Could not import catalogue: '+err.message);
  }finally{
    e.target.value='';
  }
});

$('frame-photo').addEventListener('change',()=>{
  const f=$('frame-photo').files?.[0];
  if(!f)return;
  if(!f.type.startsWith('image/')){
    toast('Please choose an image file.');
    return;
  }
  if(f.size>12*1024*1024){
    toast('Choose an image under 12 MB.');
    return;
  }
  state.uploadFile=f;
  state.overlayBlob=null;
  state.overlayUrl=null;
  $('upload-preview').src=URL.createObjectURL(f);
  $('upload-preview').classList.remove('hidden');
  $('prepare-btn').disabled=false;
  $('save-product-btn').disabled=false;
  $('prepare-status').textContent='Photo ready. Prepare a transparent overlay for best AR.';
});

$('prepare-btn').onclick=async()=>{
  if(!state.uploadFile)return;
  const btn=$('prepare-btn');
  btn.disabled=true;
  $('prepare-status').textContent='Loading background-removal model…';
  try{
    if(!state.removeBgModule)state.removeBgModule=await import('https://esm.sh/@imgly/background-removal@1.5.5');
    const removeBackground=state.removeBgModule.removeBackground;
    if(!removeBackground)throw Error('Background-removal function unavailable');
    $('prepare-status').textContent='Removing background in your browser. First run may download a large AI model…';
    const result=await removeBackground(state.uploadFile,{output:{format:'image/png',quality:0.95}});
    state.overlayBlob=result;
    state.overlayUrl=URL.createObjectURL(result);
    $('upload-preview').src=state.overlayUrl;
    $('prepare-status').textContent='Overlay prepared. Check edges before saving.';
    toast('Overlay prepared. Review it before saving.');
  }catch(err){
    console.error(err);
    $('prepare-status').textContent='Could not auto-remove background. A transparent PNG is best for AR.';
    toast('Background removal failed. You can still use the original photo.');
  }finally{
    btn.disabled=false;
  }
};

$('product-form').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!state.uploadFile){
    toast('Choose a product photo first.');
    return;
  }
  const cfg=getCloud();
  if(!cfg.cloudName||!cfg.uploadPreset){
    toast('Set up Cloudinary image hosting above first.');
    $('cloud-config-panel').scrollIntoView({behavior:'smooth'});
    return;
  }
  const name=$('frame-name').value.trim();
  $('save-product-btn').disabled=true;
  $('save-product-btn').textContent='Uploading images…';
  try{
    const imageUrl=await uploadToCloudinary(state.uploadFile);
    let overlayUrl=imageUrl;
    if(state.overlayBlob){
      const overlayFile=new File([state.overlayBlob],`${name.replace(/[^a-z0-9_-]/gi,'-')}-overlay.png`,{type:'image/png'});
      overlayUrl=await uploadToCloudinary(overlayFile);
    }else if(state.uploadFile.type==='image/png'){
      overlayUrl=imageUrl;
    }
    const row={
      id:crypto.randomUUID(),
      name,
      price:$('frame-price').value?Number($('frame-price').value):null,
      color:$('frame-color').value.trim(),
      image_url:imageUrl,
      overlay_url:overlayUrl,
      created_at:new Date().toISOString()
    };
    state.products=[row,...state.products.filter(p=>!p.demo)];
    writeCatalog();
    renderShop();
    renderAdminProducts();
    $('product-form').reset();
    $('upload-preview').classList.add('hidden');
    $('prepare-btn').disabled=true;
    $('save-product-btn').disabled=true;
    state.uploadFile=null;
    state.overlayBlob=null;
    state.overlayUrl=null;
    toast('Product uploaded. Your shareable link is ready.');
    await shareProduct(row);
  }catch(err){
    console.error(err);
    toast('Could not save product: '+(err.message||'check Cloudinary settings'));
  }finally{
    $('save-product-btn').disabled=false;
    $('save-product-btn').textContent='Save frame & create link';
  }
});

function deleteProduct(id){
  if(!confirm('Delete this frame from this browser catalogue? The public image remains in Cloudinary.'))return;
  state.products=state.products.filter(p=>p.id!==id);
  writeCatalog();
  renderShop();
  renderAdminProducts();
  toast('Frame removed from this browser catalogue.');
}

/* CAMERA AND FACE TRACKING */

async function startCamera(){
  if(!state.selected)return;
  try{
    stopCamera();

    if(!navigator.mediaDevices?.getUserMedia){
      throw new Error('Camera API unavailable. Open the site using HTTPS in a supported browser.');
    }

    state.cameraStream=await navigator.mediaDevices.getUserMedia({
      audio:false,
      video:{
        facingMode:state.facing,
        width:{ideal:1280},
        height:{ideal:960}
      }
    });

    const video=$('camera-video');
    video.srcObject=state.cameraStream;
    await video.play();

    $('camera-placeholder').classList.add('hidden');
    $('start-camera').disabled=true;
    $('flip-camera').disabled=false;
    $('stop-camera').disabled=false;
    $('face-status').textContent='Loading face tracking…';

    await loadFaceModel();
    state.lastVideoTime=-1;
    state.anim=requestAnimationFrame(trackFrame);

  }catch(err){
    console.error('Wablo try-on startup failed:',err);
    const message=err.message||err.name||'Unknown error';

    if(err.name==='NotAllowedError'){
      $('face-status').textContent='Camera permission denied. Allow camera access and try again.';
      toast('Allow camera access in browser settings.');
    }else if(err.name==='NotFoundError'){
      $('face-status').textContent='No camera was found on this device.';
      toast('No camera was found.');
    }else if(err.name==='NotReadableError'){
      $('face-status').textContent='Camera is busy. Close other apps using the camera.';
      toast('Camera is busy. Close other apps using the camera.');
    }else{
      $('face-status').textContent='Try-on error: '+message;
      toast('Try-on failed: '+message);
    }

    $('start-camera').disabled=false;

    if(state.cameraStream){
      state.cameraStream.getTracks().forEach(t=>t.stop());
      state.cameraStream=null;
    }

    const video=$('camera-video');
    if(video)video.srcObject=null;
    $('camera-placeholder').classList.remove('hidden');
    $('flip-camera').disabled=true;
    $('stop-camera').disabled=true;
  }
}

async function loadFaceModel(){
  if(state.landmarker)return;

  if(state.modelLoading){
    throw Error('Face-tracking model is already loading. Tap Enable camera again in a moment.');
  }

  state.modelLoading=true;

  try{
    const vision=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm');

    const files=await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
    );

    const modelUrl='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

    state.landmarker=await vision.FaceLandmarker.createFromOptions(files,{
      baseOptions:{
        modelAssetPath:modelUrl,
        delegate:'CPU'
      },
      runningMode:'VIDEO',
      numFaces:1,
      outputFaceBlendshapes:false,
      outputFacialTransformationMatrixes:false
    });

  }catch(err){
    console.error('Face model load failed:',err);
    throw Error('Face tracking model failed to load. Check your internet connection and reload the page. Details: '+(err.message||err));
  }finally{
    state.modelLoading=false;
  }
}

function trackFrame(){
  if(!state.cameraStream)return;

  const video=$('camera-video');
  const canvas=$('tryon-canvas');
  const ctx=canvas.getContext('2d');

  if(video.readyState>=2&&video.currentTime!==state.lastVideoTime&&state.landmarker){
    state.lastVideoTime=video.currentTime;

    try{
      const result=state.landmarker.detectForVideo(video,performance.now());

      if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){
        canvas.width=video.videoWidth;
        canvas.height=video.videoHeight;
      }

      ctx.clearRect(0,0,canvas.width,canvas.height);

      const face=result.faceLandmarks?.[0];

      if(face&&state.selected){
        const a=face[33],b=face[263];
        const dx=(b.x-a.x)*canvas.width;
        const dy=(b.y-a.y)*canvas.height;
        const eyeDistance=Math.hypot(dx,dy);
        const centerX=(a.x+b.x)/2*canvas.width;
        const centerY=(a.y+b.y)/2*canvas.height;
        const angle=Math.atan2(dy,dx);
        const img=overlayImage();

        if(img&&img.complete&&img.naturalWidth){
          const aspect=img.naturalWidth/img.naturalHeight;
          const width=eyeDistance*2.15*Number($('frame-scale').value);
          const height=width/aspect;

          ctx.save();
          ctx.translate(centerX,centerY+height*.04);
          ctx.rotate(angle);
          ctx.drawImage(img,-width/2,-height/2,width,height);
          ctx.restore();
        }

        $('face-status').textContent='Face detected · frame aligned';
      }else{
        $('face-status').textContent='Move into view and face the camera';
      }
    }catch(err){
      console.warn('Face tracking frame failed:',err);
      $('face-status').textContent='Face tracking error: '+(err.message||'unknown error');
    }
  }

  state.anim=requestAnimationFrame(trackFrame);
}

let cachedOverlay={url:'',img:null};

function overlayImage(){
  if(!state.selected)return null;

  const url=state.selected.overlay_url||state.selected.image_url;

  if(cachedOverlay.url!==url){
    cachedOverlay.url=url;
    cachedOverlay.img=new Image();
    cachedOverlay.img.crossOrigin='anonymous';
    cachedOverlay.img.src=url;
  }

  return cachedOverlay.img;
}

function stopCamera(){
  if(state.anim)cancelAnimationFrame(state.anim);
  state.anim=0;

  if(state.cameraStream){
    state.cameraStream.getTracks().forEach(t=>t.stop());
    state.cameraStream=null;
  }

  const video=$('camera-video');
  if(video)video.srcObject=null;

  const canvas=$('tryon-canvas');
  if(canvas)canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);

  if($('camera-placeholder'))$('camera-placeholder').classList.remove('hidden');
  if($('start-camera'))$('start-camera').disabled=false;
  if($('flip-camera'))$('flip-camera').disabled=true;
  if($('stop-camera'))$('stop-camera').disabled=true;
  if($('face-status'))$('face-status').textContent='Camera stopped';
}

$('start-camera').onclick=()=>{
  if(!window.isSecureContext){
    toast('Camera access needs HTTPS. Open the GitHub Pages https:// link.');
    return;
  }

  if(!navigator.mediaDevices?.getUserMedia){
    toast('This browser does not support camera access.');
    return;
  }

  startCamera();
};

$('stop-camera').onclick=stopCamera;

$('flip-camera').onclick=async()=>{
  state.facing=state.facing==='user'?'environment':'user';
  await startCamera();
};

$('frame-scale').oninput=()=>{
  $('scale-value').textContent=`${Math.round(Number($('frame-scale').value)*100)}%`;
};

$('nav-shop').onclick=()=>{
  showView('shop');
  history.replaceState({},'',location.pathname);
};

$('nav-admin').onclick=()=>{
  showView('admin');
  updateCloudForm();
};

$('hero-start').onclick=()=>$('product-grid').scrollIntoView({behavior:'smooth',block:'start'});

$('back-to-shop').onclick=()=>showView('shop');
$('back-to-product').onclick=()=>openProduct(state.selected);
$('share-from-tryon').onclick=()=>shareProduct(state.selected);
$('year').textContent=new Date().getFullYear();

async function boot(){
  state.products=[...readCatalog(),...sampleProducts];
  renderShop();
  renderAdminProducts();
  updateCloudForm();

  const params=new URLSearchParams(location.search);
  const encoded=params.get('item');

  if(encoded){
    try{
      const p=JSON.parse(fromBase64Url(encoded));
      if(p&&p.name&&p.image_url)openProduct({...p,demo:false});
      else showView('shop');
    }catch(e){
      console.warn('Invalid product link',e);
      showView('shop');
    }
  }else if(params.get('p')){
    openProduct(params.get('p'));
  }
}

boot();

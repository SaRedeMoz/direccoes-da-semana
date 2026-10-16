// Escritório 3D (abre só quando pedido, para a página carregar depressa no telemóvel)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
let status = null, STAGE = null;
const $ = (id) => (id === "stage" ? STAGE : document.getElementById(id));
/* ================= 3D ================= */
const AG=[
  {k:"fontes", nome:"Fontes",  cor:0x1F8A7E, x:-3.6, z:-3.4},
  {k:"analise",nome:"Análise", cor:0xC98E1E, x: 3.6, z:-3.4},
  {k:"design", nome:"Design",  cor:0xB8457A, x:-3.6, z: 2.2},
  {k:"editor", nome:"Editor",  cor:0x3F4FA3, x: 3.6, z: 2.2},
];
const APROV={x:0,z:7.4};
const COR_EST={"a trabalhar":"#E0AE52","pronto":"#4FB3AA","erro":"#E07365","à espera":"#E0AE52","aprovado":"#4FB3AA","parado":"#9AA6B5"};
let renderer,scene,camera,controls,clock;
const salas={};let aprovSala=null;let papel=null;

function labelSprite(){
  const c=document.createElement("canvas");c.width=512;c.height=160;
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
  sp.scale.set(3.6,1.12,1);sp.renderOrder=10;
  sp.userData.draw=(titulo,estado,corHex)=>{
    const g=c.getContext("2d");g.clearRect(0,0,512,160);
    g.fillStyle="rgba(11,18,32,.86)";rr(g,8,8,496,144,28);g.fill();
    g.fillStyle=corHex;rr(g,8,8,16,144,8);g.fill();
    g.fillStyle="#F2F5F4";g.font="800 54px 'Bricolage Grotesque', sans-serif";g.fillText(titulo,44,72);
    g.fillStyle=COR_EST[estado]||"#9AA6B5";g.font="600 40px 'Bricolage Grotesque', sans-serif";g.fillText(estado,44,128);
    tex.needsUpdate=true;
  };
  return sp;
}
function iconSprite(){
  const c=document.createElement("canvas");c.width=128;c.height=128;
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
  sp.scale.set(.8,.8,1);sp.renderOrder=11;
  sp.userData.draw=(tipo)=>{
    const g=c.getContext("2d");g.clearRect(0,0,128,128);sp.visible=!!tipo;if(!tipo)return;
    const cor=tipo==="ok"?"#1F8A7E":tipo==="erro"?"#B23A2E":"#C98E1E";
    g.fillStyle=cor;g.beginPath();g.arc(64,64,58,0,Math.PI*2);g.fill();
    g.strokeStyle="#fff";g.lineWidth=12;g.lineCap="round";g.lineJoin="round";g.fillStyle="#fff";
    if(tipo==="ok"){g.beginPath();g.moveTo(36,66);g.lineTo(56,86);g.lineTo(92,44);g.stroke();}
    else if(tipo==="erro"){g.font="900 84px sans-serif";g.textAlign="center";g.fillText("!",64,94);}
    else {g.font="900 70px sans-serif";g.textAlign="center";g.fillText("…",64,80);}
    tex.needsUpdate=true;
  };
  return sp;
}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function capulanaTex(){
  const c=document.createElement("canvas");c.width=c.height=256;const g=c.getContext("2d");
  g.fillStyle="#1F8A7E";g.fillRect(0,0,256,256);
  for(let i=0;i<8;i++)for(let j=0;j<8;j++){g.fillStyle=(i+j)%2?"#C98E1E":"#B8457A";g.beginPath();const x=i*32+16,y=j*32+16;g.moveTo(x,y-14);g.lineTo(x+14,y);g.lineTo(x,y+14);g.lineTo(x-14,y);g.fill();}
  g.strokeStyle="#16223A";g.lineWidth=10;g.strokeRect(5,5,246,246);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function chartTex(cor){
  const c=document.createElement("canvas");c.width=256;c.height=160;const g=c.getContext("2d");
  g.fillStyle="#F7F7F2";g.fillRect(0,0,256,160);g.strokeStyle="#bbb";g.lineWidth=2;
  for(let y=30;y<160;y+=30){g.beginPath();g.moveTo(10,y);g.lineTo(246,y);g.stroke();}
  g.strokeStyle=cor;g.lineWidth=8;g.lineJoin="round";g.beginPath();[[20,130],[70,95],[110,110],[160,60],[230,35]].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.8,metalness:0,...o});
function box(w,h,d,m,x,y,z,parent){const me=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);me.position.set(x,y,z);me.castShadow=true;me.receiveShadow=true;parent.add(me);return me;}

function pessoa(cor){
  const g=new THREE.Group();
  const corpo=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.55,6,14),mat(cor,{roughness:.6}));corpo.position.y=.95;corpo.castShadow=true;g.add(corpo);
  const cab=new THREE.Group();cab.position.y=1.72;g.add(cab);
  const cabeca=new THREE.Mesh(new THREE.SphereGeometry(.26,24,18),mat(0x6B4428,{roughness:.55}));cabeca.castShadow=true;cab.add(cabeca);
  const cabelo=new THREE.Mesh(new THREE.SphereGeometry(.27,24,18,0,Math.PI*2,0,Math.PI*.5),mat(0x1d130c));cabelo.position.y=.03;cab.add(cabelo);
  const bL=new THREE.Mesh(new THREE.CapsuleGeometry(.08,.34,4,8),mat(cor));const bR=bL.clone();
  bL.position.set(-.3,1.12,-.22);bR.position.set(.3,1.12,-.22);bL.rotation.x=bR.rotation.x=-1.1;g.add(bL,bR);
  g.userData={cab,bL,bR};return g;
}

function sala(a){
  const g=new THREE.Group();g.position.set(a.x,0,a.z);scene.add(g);
  const W=5.8,D=4.6,H=1.1;
  const chao=new THREE.Mesh(new THREE.BoxGeometry(W,.08,D),mat(0xE9ECE6));chao.position.y=.04;chao.receiveShadow=true;g.add(chao);
  const parede=mat(0x2B3A55,{roughness:.9});
  box(W,H,.14,parede,0,H/2,-D/2,g);                       // fundo
  box(.14,H,D,parede,-W/2,H/2,0,g);box(.14,H,D,parede,W/2,H/2,0,g); // lados
  box(W,.12,.16,mat(a.cor),0,H+.06,-D/2,g);                 // faixa de cor
  const mesa=mat(0x8A6A45,{roughness:.7});
  box(2.2,.1,1,mesa,0,.82,-.9,g);
  [[-1,-1.3],[1,-1.3],[-1,-.5],[1,-.5]].forEach(([x,z])=>box(.08,.8,.08,mesa,x,.4,z,g));
  box(1.1,.62,.06,mat(0x222a38),0,1.24,-1.3,g);
  const ecra=new THREE.Mesh(new THREE.PlaneGeometry(.98,.5),new THREE.MeshStandardMaterial({color:0x0f1a2a,emissive:0x9FE3D9,emissiveIntensity:.05}));
  ecra.position.set(0,1.24,-1.265);g.add(ecra);
  box(.7,.06,.7,mat(0x333c4d),0,.5,.15,g);
  const p=pessoa(a.cor);p.position.set(0,0,.05);p.rotation.y=Math.PI;g.add(p);
  // adereços
  if(a.k==="fontes"){for(let i=0;i<5;i++)box(.8,.06,.6,mat(i%2?0xE8E1D0:0xD9D0BB),-2,.12+i*.07,1.4,g);
    const globo=new THREE.Mesh(new THREE.SphereGeometry(.38,16,12),new THREE.MeshStandardMaterial({color:a.cor,wireframe:true}));globo.position.set(2,.9,1.3);g.add(globo);box(.1,.5,.1,mat(0x444),2,.3,1.3,g);g.userData.globo=globo;}
  if(a.k==="analise"){const q=new THREE.Mesh(new THREE.PlaneGeometry(2,1.25),new THREE.MeshStandardMaterial({map:chartTex("#C98E1E")}));q.position.set(-2.8,1.1,.4);q.rotation.y=Math.PI/2;g.add(q);}
  if(a.k==="design"){[0xB8457A,0x1F8A7E,0x16223A].forEach((c,i)=>{const t=box(.7,.7,.04,mat(c),-1.6+i*.85,1.45,-2.18,g);t.rotation.x=.05;});}
  if(a.k==="editor"){for(let i=0;i<3;i++){const f=box(.5,.02,.7,mat(0xffffff),.7+i*.05,.88+i*.022,-.85,g);f.rotation.y=.2*i;}}
  const lab=labelSprite();lab.position.set(0,2.75,-.6);g.add(lab);
  const ico=iconSprite();ico.position.set(1.7,2.9,-.6);g.add(ico);
  // pontos a escrever
  const dots=new THREE.Group();for(let i=0;i<3;i++){const d=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),new THREE.MeshBasicMaterial({color:a.cor}));d.position.set(-.18+i*.18,2.2,0);dots.add(d);}g.add(dots);
  salas[a.k]={g,p,ecra,lab,ico,dots,a,estado:"",ph:Math.random()*6};
}
function salaAprov(){
  const g=new THREE.Group();g.position.set(APROV.x,0,APROV.z);scene.add(g);
  const W=13,D=3.6,H=1.1;
  const chao=new THREE.Mesh(new THREE.BoxGeometry(W,.08,D),mat(0xE9ECE6));chao.position.y=.04;chao.receiveShadow=true;g.add(chao);
  const parede=mat(0x2B3A55,{roughness:.9});
  box(W,H,.14,parede,0,H/2,D/2,g);box(.14,H,D,parede,-W/2,H/2,0,g);box(.14,H,D,parede,W/2,H/2,0,g);
  box(W,.12,.16,mat(0x16223A),0,H+.06,D/2,g);
  const tapete=new THREE.Mesh(new THREE.PlaneGeometry(3.2,2.2),new THREE.MeshStandardMaterial({map:capulanaTex(),roughness:.95}));tapete.rotation.x=-Math.PI/2;tapete.position.set(3.4,.09,0);tapete.receiveShadow=true;g.add(tapete);
  const mesa=mat(0x8A6A45,{roughness:.7});box(2.6,.1,1.1,mesa,-2.4,.82,.4,g);
  [[-3.5,0],[-1.3,0],[-3.5,.8],[-1.3,.8]].forEach(([x,z])=>box(.08,.8,.08,mesa,x,.4,z,g));
  const cadeira=new THREE.Mesh(new THREE.TorusGeometry(.42,.05,8,32),new THREE.MeshBasicMaterial({color:0xC98E1E}));cadeira.rotation.x=-Math.PI/2;cadeira.position.set(-2.4,.12,-.45);g.add(cadeira);
  const docs=new THREE.Group();for(let i=0;i<4;i++){const f=box(.55,.03,.75,mat(0xffffff),-2.4+(i%2)*.6-.3,.9+i*.035,.4,g);docs.add(f);}
  const vaso=box(.4,.45,.4,mat(0x6d5236),5.8,.25,-1.1,g);
  const folha=new THREE.Mesh(new THREE.ConeGeometry(.45,1.1,7),mat(0x2F7D4F));folha.position.set(5.8,1.05,-1.1);folha.castShadow=true;g.add(folha);
  const lab=labelSprite();lab.position.set(-2.4,2.5,.3);g.add(lab);
  const ico=iconSprite();ico.position.set(-.8,2.7,.3);g.add(ico);
  aprovSala={g,lab,ico,cadeira,estado:""};
}
function initGL(){
  const el=STAGE;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch(e){el.insertAdjacentHTML("beforeend",`<div class="nogl">O seu navegador não consegue mostrar o escritório 3D. O resto da página funciona normalmente.</div>`);return false;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;el.prepend(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color(0x0B1220);scene.fog=new THREE.Fog(0x0B1220,30,55);
  camera=new THREE.PerspectiveCamera(36,1,.1,100);camera.position.set(11.5,14.5,15.5);
  controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,1.6);controls.enableDamping=true;
  controls.minDistance=10;controls.maxDistance=34;controls.maxPolarAngle=1.25;controls.enablePan=false;
  scene.add(new THREE.HemisphereLight(0xdfe8ff,0x2a2f3a,.9));
  const sol=new THREE.DirectionalLight(0xfff1d6,1.6);sol.position.set(8,16,6);sol.castShadow=true;sol.shadow.mapSize.set(2048,2048);
  Object.assign(sol.shadow.camera,{left:-14,right:14,top:14,bottom:-14});scene.add(sol);
  const chao=new THREE.Mesh(new THREE.PlaneGeometry(40,40),mat(0x3A4658,{roughness:1}));chao.rotation.x=-Math.PI/2;chao.receiveShadow=true;scene.add(chao);
  const corredor=new THREE.Mesh(new THREE.PlaneGeometry(1.4,11),mat(0x56657C,{roughness:1}));corredor.rotation.x=-Math.PI/2;corredor.position.set(0,.01,-.6);scene.add(corredor);
  AG.forEach(sala);salaAprov();
  papel=new THREE.Mesh(new THREE.BoxGeometry(.5,.03,.66),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.25}));papel.castShadow=true;papel.visible=false;scene.add(papel);
  clock=new THREE.Clock();
  new ResizeObserver(resize).observe(el);resize();
  renderer.setAnimationLoop(tick);
  return true;
}
function resize(){const el=$("stage");const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function tick(){
  const t=clock.getElapsedTime();
  for(const k in salas){
    const s=salas[k],trab=s.estado==="a trabalhar",u=s.p.userData;
    s.dots.visible=trab;
    if(trab&&!reduz){u.cab.position.y=1.72+Math.sin(t*6+s.ph)*.03;u.bL.rotation.x=-1.1+Math.sin(t*14)*.18;u.bR.rotation.x=-1.1+Math.sin(t*14+1.6)*.18;
      s.dots.children.forEach((d,i)=>d.position.y=2.2+Math.max(0,Math.sin(t*6-i*.8))*.12);
      s.ecra.material.emissiveIntensity=.55+Math.sin(t*3)*.15;}
    else{u.cab.position.y=1.72;s.ecra.material.emissiveIntensity=s.estado==="pronto"?.35:.05;}
    if(s.g.userData.globo&&!reduz)s.g.userData.globo.rotation.y=t*(trab?1.2:.2);
    s.ico.position.y=2.9+(reduz?0:Math.sin(t*2+s.ph)*.06);
  }
  if(aprovSala){const w=aprovSala.estado==="à espera";aprovSala.cadeira.material.color.set(w?0xE0AE52:aprovSala.estado==="aprovado"?0x4FB3AA:0x56657C);
    aprovSala.cadeira.scale.setScalar(w&&!reduz?1+Math.sin(t*3)*.08:1);}
  // papel a voar entre salas
  const ordem=AG.map(a=>a.k);const i=ordem.findIndex(k=>salas[k].estado==="a trabalhar");
  if(i>0&&!reduz){const A=AG[i-1],B=AG[i];const f=(t*.45)%1;papel.visible=true;
    papel.position.set(A.x+(B.x-A.x)*f,2.2+Math.sin(f*Math.PI)*2.2,A.z+(B.z-A.z)*f);papel.rotation.y=t*2;}
  else papel.visible=false;
  controls.update();renderer.render(scene,camera);
}
function actualizar3D(){
  if(!scene)return;const e=(status&&status.estagios)||{};
  for(const k in salas){const s=salas[k],st=(e[k]&&e[k].estado)||"parado";
    if(st!==s.estado){s.estado=st;s.lab.userData.draw(s.a.nome,st,"#"+s.a.cor.toString(16).padStart(6,"0"));s.ico.userData.draw(st==="pronto"?"ok":st==="erro"?"erro":null);}}
  const ap=(e.aprovacao&&e.aprovacao.estado)||"parado";
  if(ap!==aprovSala.estado){aprovSala.estado=ap;aprovSala.lab.userData.draw("A sua sala",ap,"#C98E1E");aprovSala.ico.userData.draw(ap==="aprovado"?"ok":ap==="à espera"?"espera":null);}
}


export function iniciar(el, st) { STAGE = el; status = st; if (initGL() === false) return; document.fonts.ready.then(() => { for (const k in salas) salas[k].estado = ""; if (aprovSala) aprovSala.estado = ""; actualizar3D(); }); actualizar3D(); }
export function actualizar(st) { status = st; actualizar3D(); }

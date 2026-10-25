/* Animated pixel shards and electric seams inspired by the Starting Soon film.
   Canvas is bounded to the scorebug or arena; no video decoding or external requests. */
(() => {
 const canvas=document.querySelector('.energy-field'); if(!canvas)return;
 const ctx=canvas.getContext('2d'), still=matchMedia('(prefers-reduced-motion: reduce)');
 const texture=document.createElement('canvas'), tx=texture.getContext('2d');
 const vs=document.body.classList.contains('versus-screen');
 let width=0,height=0,colors=[],last=0,phase=0,frame,seed=1025;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const particles=Array.from({length:vs?95:27},()=>({x:random(),y:random(),size:2+random()*8,speed:.04+random()*.18,delay:random()*6}));
 function rebuild(){
  const rect=canvas.parentElement.getBoundingClientRect();
  width=canvas.width=texture.width=vs?1920:(canvas.parentElement.offsetWidth || 1417);
  height=canvas.height=texture.height=vs?1080:139;
  const style=getComputedStyle(document.body);
  colors=['--p1-primary','--p2-primary','--p1-secondary','--p2-secondary'].map(p=>style.getPropertyValue(p).trim()||'#ffffff');
  tx.clearRect(0,0,width,height);seed=1025;
  // Layered diagonal slivers with thin bevels and stepped pixel edges.
  for(let i=0;i<(vs?95:22);i++){
   const x=random()*width,y=random()*height,side=x<width/2?0:1;
   const len=(vs?130:35)+random()*(vs?600:140),thick=2+random()*(vs?34:9);
   const grad=tx.createLinearGradient(x,y,x+thick,y+thick);
   grad.addColorStop(0,'#020610');grad.addColorStop(.5,colors[side]);grad.addColorStop(1,'#b6dfff');
   tx.globalAlpha=vs?.08+random()*.24:.12+random()*.18;tx.fillStyle=grad;
   tx.beginPath();tx.moveTo(x,y);tx.lineTo(x+len,y-len);tx.lineTo(x+len+thick,y-len+thick);tx.lineTo(x+thick,y+thick);tx.closePath();tx.fill();
  }
  for(let i=0;i<(vs?720:110);i++){
   const x=random()*width,y=random()*height,side=x<width/2?0:1;
   const edge=vs?Math.abs(x-width/2)/(width/2):1;
   if(vs&&random()>edge*.85+.12)continue;
   const size=(vs?3:2)+random()*(vs?18:6);
   tx.globalAlpha=.05+random()*.32;tx.fillStyle=colors[random()<.12?side+2:side];tx.fillRect(Math.round(x/8)*8,Math.round(y/8)*8,size,size);
  }
  tx.globalAlpha=1;
 }
 function render(now){
  frame=requestAnimationFrame(render);
  if(now-last<1000/30||document.hidden)return;
  const dt=Math.min((now-last)/1000,.1);last=now;phase+=dt;
  ctx.clearRect(0,0,width,height);ctx.drawImage(texture,0,0);
  if(still.matches)return;
  for(const p of particles){
   const side=p.x<.5?0:1,x=(p.x*width+phase*p.speed*38)%width,y=(p.y*height-phase*p.speed*24+height*100)%height;
   const glow=.12+Math.pow(Math.max(0,Math.sin(phase*.9+p.delay)),5)*.58;
   ctx.globalAlpha=glow;ctx.fillStyle=colors[side];ctx.fillRect(x,y,p.size,p.size);
   if(p.size>6){ctx.globalAlpha=glow*.28;ctx.fillRect(x-18,y+2,15,1);}
  }
  // Independent, slow irregular electric seams; never flash the text.
  for(let side=0;side<2;side++){
   const intensity=Math.pow(Math.max(0,Math.sin(phase*(side?.31:.23)+(side?2.4:.1))),9);
   if(intensity<.03)continue;
   ctx.globalAlpha=intensity*.62;ctx.strokeStyle=colors[side];ctx.lineWidth=vs?2:1;ctx.shadowColor=colors[side];ctx.shadowBlur=vs?13:5;
   const x=width*(side?.86:.13),start=height*(side?.7:.94),length=vs?560:150;
   ctx.beginPath();ctx.moveTo(x,start);
   for(let n=1;n<=14;n++)ctx.lineTo(x+n*length/14+(n%3-1)*8,start-n*length/14+(n%4)*3);
   ctx.stroke();ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;
 }
 rebuild();document.addEventListener('school-colors-updated',rebuild);
 still.addEventListener('change',rebuild);
 document.addEventListener('visibilitychange',()=>{last=performance.now();});
 addEventListener('pagehide',()=>cancelAnimationFrame(frame));frame=requestAnimationFrame(render);
})();

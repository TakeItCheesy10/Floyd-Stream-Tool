/* Local Ultimate renders include a transparent layout canvas. Crop it only for UI presentation. */
(() => {
 const cache=new Map();
 window.showSmashFighter=(image,url)=>{
  image.dataset.source=url;
  if(cache.has(url)){image.onload=null;image.src=cache.get(url);return}
  image.onload=()=>{
   image.onload=null;
   try {
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
    if(right<left)return;
    const cropped=document.createElement('canvas');cropped.width=right-left+1;cropped.height=bottom-top+1;
    cropped.getContext('2d').drawImage(canvas,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
    const result=cropped.toDataURL('image/png');cache.set(url,result);if(image.dataset.source===url)image.src=result;
   }catch{/* Retain the original render if canvas processing is unavailable. */}
  };image.src=url;
 };
})();

/* Loading-only brand animation: no timers delaying content, no external requests. */
(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),players=new Set();
 function update(){
  for(const video of players)if(!video.isConnected){video.pause();video.removeAttribute('src');players.delete(video);}
  document.querySelectorAll('video[data-docen-loading]').forEach(video=>{
   if(!players.has(video)){players.add(video);video.muted=true;video.loop=true;video.playsInline=true;video.addEventListener('playing',()=>{video.hidden=false;});video.addEventListener('error',()=>{video.hidden=true;});}
   if(reduced.matches||document.hidden){video.pause();video.hidden=true;if(reduced.matches){video.removeAttribute('src');video.load();}return;}
   if(!video.getAttribute('src'))video.src=video.dataset.docenLoading;
   void video.play().catch(()=>{video.hidden=true;});
  });
 }
 reduced.addEventListener('change',update);document.addEventListener('visibilitychange',update);
 new MutationObserver(update).observe(document.documentElement,{childList:true,subtree:true});update();
})();

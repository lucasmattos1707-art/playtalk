(() => {
  const chapters = ['00:00:43:13','00:04:49:19','00:08:26:25','00:12:06:03','00:13:01:29','00:18:53:20','00:22:24:20','00:24:05:03','00:25:30:25','00:29:24:11','00:35:18:11','00:38:36:29']
    .map((time, index) => [`Capítulo ${index + 1}`, time]);
  const fps = 30;
  const video = document.querySelector('#video');
  const list = document.querySelector('#chapters');
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const timeToSeconds = tc => { const [h,m,s,f]=tc.split(':').map(Number);return h*3600+m*60+s+f/fps; };
  const seconds = chapters.map(([,tc])=>timeToSeconds(tc));
  let selected = 0;
  let pendingSeekIndex = null;

  list.innerHTML=chapters.map(([title,time],i)=>`<button class="chapter ${i===0?'active':''}" type="button" data-index="${i}" aria-label="Ir para ${title}, ${time}"><span class="chapter-num">${String(i+1).padStart(2,'0')}</span><span class="chapter-name">${title}</span><time>${time}</time><span class="chapter-arrow">↗</span></button>`).join('');
  function update(index) {
    selected=Math.max(0,Math.min(chapters.length-1,index));
    const [title]=chapters[selected];
    document.querySelector('#chapterIndex').textContent=String(selected+1).padStart(2,'0');
    document.querySelector('#chapterTitle').textContent=title;
    document.querySelector('#progressFill').style.width=`${selected/(chapters.length-1)*100}%`;
    [...list.children].forEach((button,i)=>{button.classList.toggle('active',i===selected);button.setAttribute('aria-current',i===selected?'true':'false');});
    previous.disabled=selected===0;next.disabled=selected===chapters.length-1;
  }
  function seek(index) {
    const wasPlaying=!video.paused&&!video.ended;
    update(index);
    pendingSeekIndex=selected;
    video.currentTime=seconds[selected];
    if(wasPlaying)video.play().catch(()=>{});
  }
  function updateFromPlayback() {
    let index=0;
    for(let i=0;i<seconds.length;i++){if(video.currentTime>=seconds[i])index=i;else break;}
    pendingSeekIndex=null;
    update(index);
  }
  list.addEventListener('click',e=>{const button=e.target.closest('[data-index]');if(button)seek(Number(button.dataset.index));});
  previous.addEventListener('click',()=>seek(selected-1));
  next.addEventListener('click',()=>seek(selected+1));
  video.addEventListener('timeupdate',()=>{if(video.seeking)return;if(pendingSeekIndex!==null&&Math.abs(video.currentTime-seconds[pendingSeekIndex])>0.75)return;updateFromPlayback();});
  video.addEventListener('seeked',()=>{if(pendingSeekIndex!==null&&Math.abs(video.currentTime-seconds[pendingSeekIndex])<=0.75)updateFromPlayback();});
  const videoError=document.querySelector('#videoError');
  video.addEventListener('error',()=>{if(video.error)videoError.hidden=false;});
  video.addEventListener('loadedmetadata',()=>{videoError.hidden=true;});
  video.addEventListener('loadeddata',()=>{videoError.hidden=true;});
  video.addEventListener('canplay',()=>{videoError.hidden=true;});
  document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select,button'))return;if(e.key==='ArrowLeft')seek(selected-1);if(e.key==='ArrowRight')seek(selected+1);});
  update(0);
})();

(() => {
  const chapters = [
    ['Abertura', '00:00:00:00'],
    ['Além do arco-íris', '00:00:43:13'],
    ['Pintinhos', '00:04:49:19'],
    ['Ovelhinhas', '00:08:26:25'],
    ['Furacão', '00:12:06:03'],
    ['Munchkins', '00:13:01:29'],
    ['Tijolo amarelo', '00:18:53:20'],
    ['Espantalho', '00:22:24:20'],
    ['Homem de lata', '00:24:05:03'],
    ['Música (Lata)', '00:25:30:25'],
    ['Leão', '00:29:24:11'],
    ['Sem perdão', '00:35:18:11'],
    ['Ódio', '00:38:36:29'],
    ['Chapéu', '00:42:24:24'],
    ['É só dançar', '00:43:06:08'],
    ['Popular', '00:47:27:01'],
    ['Esmeraldas', '00:51:28:02'],
    ['Elphaba e Mágico', '00:53:26:04'],
    ['Gravidade', '00:55:35:20']
  ];
  const fps = 30;
  const video = document.querySelector('#video');
  const list = document.querySelector('#chapters');
  const previous = document.querySelector('#previous');
  const next = document.querySelector('#next');
  const timeToSeconds = tc => { const [h,m,s,f]=tc.split(':').map(Number);return h*3600+m*60+s+f/fps; };
  const seconds = chapters.map(([,tc])=>timeToSeconds(tc));
  let selected = 0;
  let pendingSeekIndex = null;

  const chapterNumber = index => String(index === 0 ? 0 : index).padStart(2, '0');
  list.innerHTML=chapters.map(([title],i)=>`<button class="chapter ${i===0?'active':''}" type="button" data-index="${i}" aria-label="Ir para ${title}"><span class="chapter-num">${chapterNumber(i)}</span><span class="chapter-name">${title}</span><span class="chapter-arrow">↗</span></button>`).join('');
  function update(index) {
    selected=Math.max(0,Math.min(chapters.length-1,index));
    const [title]=chapters[selected];
    document.querySelector('#chapterIndex').textContent=chapterNumber(selected);
    document.querySelector('#chapterTitle').textContent=title;
    document.querySelector('#progressFill').style.width=`${selected/(chapters.length-1)*100}%`;
    [...list.children].forEach((button,i)=>{button.classList.toggle('active',i===selected);button.setAttribute('aria-current',i===selected?'true':'false');});
    previous.disabled=selected===0;next.disabled=selected===chapters.length-1;
  }
  function seek(index) {
    const wasPlaying=!video.paused&&!video.ended;
    update(index);
    const targetIndex=selected;
    pendingSeekIndex=targetIndex;
    video.currentTime=seconds[targetIndex];
    if(wasPlaying)video.play().catch(()=>{});
    const settleSeek=()=>{
      if(pendingSeekIndex!==targetIndex)return;
      if(!video.seeking&&Math.abs(video.currentTime-seconds[targetIndex])<=0.75){pendingSeekIndex=null;update(targetIndex);return;}
      if(video.readyState>0)setTimeout(settleSeek,120);
    };
    setTimeout(settleSeek,0);
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
  video.addEventListener('timeupdate',()=>{if(video.seeking)return;if(pendingSeekIndex!==null){if(Math.abs(video.currentTime-seconds[pendingSeekIndex])<=0.75){const targetIndex=pendingSeekIndex;pendingSeekIndex=null;update(targetIndex);}return;}updateFromPlayback();});
  video.addEventListener('seeked',()=>{if(pendingSeekIndex!==null&&Math.abs(video.currentTime-seconds[pendingSeekIndex])<=0.75){const targetIndex=pendingSeekIndex;pendingSeekIndex=null;update(targetIndex);}});
  const videoError=document.querySelector('#videoError');
  video.addEventListener('error',()=>{if(video.error)videoError.hidden=false;});
  video.addEventListener('loadedmetadata',()=>{videoError.hidden=true;});
  video.addEventListener('loadeddata',()=>{videoError.hidden=true;});
  video.addEventListener('canplay',()=>{videoError.hidden=true;});
  document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select,button'))return;if(e.key==='ArrowLeft')seek(selected-1);if(e.key==='ArrowRight')seek(selected+1);});
  update(0);
})();

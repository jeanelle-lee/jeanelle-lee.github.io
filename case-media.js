(() => {
  const video = document.querySelector('.case-video');
  if (video) {
    for (const cue of document.querySelectorAll('[data-time]')) {
      cue.addEventListener('click', () => {
        const seek = () => { video.currentTime = Number(cue.dataset.time); };
        if (video.readyState) seek();
        else video.addEventListener('loadedmetadata', seek, {once:true});
        video.play().catch(() => video.focus());
      });
    }
    const sheet = video.closest('.paper');
    const pauseHidden = () => { if (sheet.hidden || document.hidden) video.pause(); };
    new MutationObserver(pauseHidden).observe(sheet,{attributes:true,attributeFilter:['hidden']});
    document.addEventListener('visibilitychange',pauseHidden);
  }
  const figure = document.querySelector('.care-sequence');
  if (!figure) return;
  const page = figure.closest('.paper');
  const frames = [...figure.querySelectorAll('.care-frame')];
  const modes = [...figure.querySelectorAll('[data-mode]')];
  const toggle = figure.querySelector('.care-toggle');
  const next = figure.querySelector('.care-next');
  const count = figure.querySelector('.care-count');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let paused = reduced.matches;
  let timer;
  function render() {
    clearTimeout(timer);
    const before = index < 3;
    frames.forEach((frame,i) => { frame.hidden = i !== index; });
    modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === (before?'before':'with'))));
    count.textContent = before ? (index+1)+' / 3' : (index-2)+' / 4';
    toggle.textContent = index === frames.length-1 ? 'Replay' : paused ? 'Play' : 'Pause';
    next.disabled = index === frames.length-1;
    if (!paused && !page.hidden && !document.hidden && index<frames.length-1) {
      timer = setTimeout(() => { index++; render(); }, 3600);
    }
  }
  modes.forEach(button => button.addEventListener('click', () => {
    index = button.dataset.mode === 'before' ? 0 : 3;
    render();
  }));
  toggle.addEventListener('click', () => {
    if (index === frames.length-1) { index=0; paused=false; }
    else paused=!paused;
    render();
  });
  next.addEventListener('click', () => { index=Math.min(index+1,frames.length-1); paused=true; render(); });
  new MutationObserver(render).observe(page,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',render);
  reduced.addEventListener('change',()=>{paused=reduced.matches;render()});
  render();
})();

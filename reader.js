(() => {
  const book = document.querySelector('.binding');
  const pages = Array.from(book.children);
  const previous = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const status = document.querySelector('#position');
  const reader = document.querySelector('#reader');
  const compact = matchMedia('(max-width:800px),(orientation:portrait)');
  const shortScreen = matchMedia('(max-width:480px) and (max-height:700px), (max-width:800px) and (max-height:480px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pairedCover = pages[0]?.id === 'cover' && pages[1]?.id === 'portrait';
  const sizeAt = index => !compact.matches || (pairedCover && index < 2) ? 2 : 1;
  const startAt = index => Math.floor(index / sizeAt(index)) * sizeAt(index);
  const pageIndex = hash => pages.findIndex(page => '#'+page.id === hash);
  let current = 0;
  let turning = null;

  function clonePage(index, extra) {
    const copy = pages[index].cloneNode(true);
    copy.removeAttribute('id');
    copy.hidden = false;
    copy.inert = true;
    copy.setAttribute('aria-hidden','true');
    copy.classList.add(...extra.split(' '));
    copy.querySelector('.paper-inner').scrollTop = pages[index].querySelector('.paper-inner').scrollTop;
    return copy;
  }

  function animateTurn(oldIndex, newIndex) {
    const forward = newIndex > oldIndex;
    const spread = !compact.matches;
    const front = oldIndex + (spread && forward ? 1 : 0);
    const back = newIndex + (spread && !forward ? 1 : 0);
    const layer = document.createElement('div');
    layer.className = 'turn-layer ' + (forward ? 'forward' : 'backward');
    const base = spread ? clonePage(oldIndex + (forward ? 0 : 1),'turn-base' + (forward ? '' : ' right')) : null;
    if (base) book.append(base);
    layer.append(clonePage(front,'turn-face'));
    if (spread) layer.append(clonePage(back,'turn-face reverse'));
    book.append(layer);
    const animation = layer.animate(
      [{ transform:'rotateY(0deg)' },{ transform:'rotateY('+ (forward ? '-' : '') + (spread ? 180 : 99) +'deg)' }],
      { duration:spread ? 600 : 420, easing:'cubic-bezier(.28,.08,.23,1)', fill:'forwards' }
    );
    turning = { cancel() { animation.cancel(); layer.remove(); base?.remove(); } };
    animation.onfinish = () => { turning?.cancel(); turning = null; };
  }

  function show(index, {animate=true, updateUrl=true, moveFocus=false} = {}) {
    const target = Math.max(0,Math.min(index,pages.length-1));
    const start = startAt(target);
    const size = sizeAt(start);
    const changed = start !== current;
    if (turning) { turning.cancel(); turning = null; }
    const singleCoverTurn = compact.matches && pairedCover && (current === 0 || start === 0);
    if (changed && animate && !reduced.matches && book.animate && !singleCoverTurn && !shortScreen.matches) animateTurn(current,start);
    book.classList.toggle('opening-spread', pairedCover && start === 0);
    pages.forEach((page,i) => { page.hidden = i < start || i >= start+size; });
    if (changed && animate && !reduced.matches && book.animate && singleCoverTurn) {
      book.animate([{opacity:.45},{opacity:1}],{duration:260,easing:'ease-out'});
    }
    current = start;
    if (changed) window.scrollTo(0,0);
    previous.disabled = start === 0;
    next.disabled = start + size >= pages.length;
    const range = size === 1 ? String(start+1) : (start+1)+'–'+Math.min(start+size,pages.length);
    status.textContent = (size === 1 ? 'Page ' : 'Pages ')+range+' / '+pages.length;
    if(updateUrl) history.replaceState(null,'','#'+pages[Math.max(0,Math.min(index,pages.length-1))].id);
    if(moveFocus || document.activeElement.closest('.paper[hidden]') || document.activeElement.matches('button:disabled')) reader.focus({preventScroll:true});
  }

  function step(direction) {
    if(turning || (direction > 0 ? next.disabled : previous.disabled)) return;
    show(direction > 0 ? current + sizeAt(current) : startAt(current - 1));
  }
  function canScrollInside(element, direction) {
    const panel = book.classList.contains('opening-spread')
      ? element.closest('.paper-inner') : document.scrollingElement;
    if(!panel) return false;
    return direction > 0 ? panel.scrollHeight - panel.clientHeight - panel.scrollTop > 2 : panel.scrollTop > 2;
  }

  previous.addEventListener('click',()=>step(-1));
  next.addEventListener('click',()=>step(1));
  document.addEventListener('click',event=>{
    const anchor = event.target.closest('a[href^="#"]');
    if(!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const index = pageIndex(anchor.hash);
    if(index < 0) return;
    event.preventDefault();
    if(location.hash !== anchor.hash) history.pushState(null,'',anchor.hash);
    show(index,{updateUrl:false,moveFocus:true});
  });
  window.addEventListener('hashchange',()=>show(Math.max(0,pageIndex(location.hash)),{updateUrl:false}));
  compact.addEventListener('change',()=>show(Math.max(0,pageIndex(location.hash)),{animate:false,updateUrl:false}));
  document.addEventListener('keydown',event=>{
    if(event.metaKey || event.ctrlKey || event.altKey || event.target.closest('input,textarea,select,video,[contenteditable="true"]')) return;
    if(event.key === 'Home' || event.key === 'End'){
      event.preventDefault(); show(event.key === 'Home' ? 0 : pages.length-1); return;
    }
    const direction = {ArrowDown:1,ArrowRight:1,PageDown:1,ArrowUp:-1,ArrowLeft:-1,PageUp:-1}[event.key];
    if(!direction || canScrollInside(event.target,direction)) return;
    event.preventDefault();
    if(!event.repeat) step(direction);
  });

  let wheelSum = 0;
  let lastWheel = 0;
  let usedGesture = false;
  document.addEventListener('wheel',event=>{
    if(event.ctrlKey || !event.deltaY || Math.abs(event.deltaX)>Math.abs(event.deltaY)) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if(canScrollInside(event.target,Math.sign(delta))){
      lastWheel=performance.now();wheelSum=delta;usedGesture=true;
      return;
    }
    event.preventDefault();
    const now = performance.now();
    if(now-lastWheel > 170 || Math.sign(delta) !== Math.sign(wheelSum)){wheelSum=0;usedGesture=false;}
    lastWheel=now;
    wheelSum+=delta;
    if(!usedGesture && Math.abs(wheelSum)>=35){
      usedGesture=true;
      step(Math.sign(wheelSum));
    }
  },{passive:false});

  let touch = null;
  reader.addEventListener('touchstart',event=>{
    if(event.touches.length!==1){touch=null;return;}
    const finger=event.touches[0];
    touch={x:finger.clientX,y:finger.clientY,down:canScrollInside(event.target,1),up:canScrollInside(event.target,-1)};
  },{passive:true});
  reader.addEventListener('touchcancel',()=>{touch=null;});
  reader.addEventListener('touchend',event=>{
    if(!touch || event.touches.length) return;
    const delta=touch.y-event.changedTouches[0].clientY;
    const vertical=Math.abs(delta)>Math.abs(touch.x-event.changedTouches[0].clientX);
    if(vertical && Math.abs(delta)>38 && !(delta>0 ? touch.down : touch.up)) step(Math.sign(delta));
    touch=null;
  },{passive:true});
  const delivery = document.querySelector('.delivery-plate');
  if (delivery) {
    delivery.querySelector('.replay-delivery').addEventListener('click', () => {
      delivery.classList.remove('is-flying');
      // Commit the resting pose so the next frame starts a fresh flight.
      delivery.getBoundingClientRect();
      delivery.classList.add('is-flying');
    });
  }
  for (const demo of document.querySelectorAll('.stay-demo,.jobs-demo')) {
    const replay = demo.querySelector('.stay-replay');
    replay.hidden = false;
    replay.addEventListener('click', () => {
      for (const animation of demo.querySelector('svg').getAnimations({subtree:true})) {
        animation.currentTime = 0;
      }
    });
  }
  document.documentElement.classList.add('ready');
  show(Math.max(0,pageIndex(location.hash)),{animate:false,updateUrl:false});
})();


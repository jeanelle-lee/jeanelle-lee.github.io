(() => {
  const demo = document.querySelector('.xr-demo');
  if (!demo) return;
  const page = demo.closest('.paper');
  const scrubber = demo.querySelector('input');
  const button = demo.querySelector('.xr-playback');
  const shots = Array.from(demo.querySelectorAll('.xr-shot'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = Number(scrubber.max);
  let position = 0;
  let startTime = 0;
  let frame = 0;

  function paint(time) {
    position = Math.min(duration, Math.max(0, time));
    const t = position / duration;
    const blend = (start, end) => reduced.matches ? Number(t >= end) : Math.min(1, Math.max(0, (t - start) / (end - start)));
    shots[1].style.opacity = blend(.29, .35);
    shots[2].style.opacity = blend(.67, .73);
    if (!reduced.matches) {
      shots[0].style.transform = 'scale(' + (1 + .11 * Math.min(t / .35, 1)) + ')';
      shots[1].style.transform = 'scale(' + (1 + .075 * blend(.29, .73)) + ')';
      shots[2].style.transform = 'scale(' + (1.035 - .035 * blend(.67, 1)) + ')';
    } else {
      shots.forEach(shot => shot.style.removeProperty('transform'));
    }
    scrubber.value = String(Math.round(position));
    const scene = t < .35 ? 'Observer view' : t < .73 ? 'At the operating table' : 'Team at work';
    scrubber.setAttribute('aria-valuetext', scene + ', ' + Math.floor(position / 1000) + ' of 8 seconds');
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    button.textContent = position >= duration ? 'Replay' : 'Play';
  }

  function tick(now) {
    paint(now - startTime);
    if (position >= duration) stop();
    else frame = requestAnimationFrame(tick);
  }

  function play() {
    if (position >= duration) paint(0);
    startTime = performance.now() - position;
    button.textContent = 'Pause';
    frame = requestAnimationFrame(tick);
  }

  function onEnter() {
    stop();
    if (page.hidden || document.hidden) return;
    paint(0);
    button.textContent = 'Play';
    if (!reduced.matches) play();
  }

  button.addEventListener('click', () => frame ? stop() : play());
  scrubber.addEventListener('input', () => { paint(Number(scrubber.value)); stop(); });
  new MutationObserver(onEnter).observe(page, {attributes:true, attributeFilter:['hidden']});
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  reduced.addEventListener('change', () => { stop(); paint(position); });
  onEnter();
})();

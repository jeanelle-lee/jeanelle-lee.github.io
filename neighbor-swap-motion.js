(() => {
  function playStory(selector, scenes) {
    const plate = document.querySelector(selector);
    if (!plate) return;
    const page = plate.closest('.paper');
    const caption = plate.querySelector('.swap-caption');
    const playback = plate.querySelector('.swap-playback');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let scene = 0;
    let timer;
    let startedAt = 0;
    let remaining = 0;
    let paused = false;
    let finished = false;
    let previewCard = null;

    function setControl() {
      playback.textContent = finished ? 'Replay' : reduced.matches ? 'Next scene' : paused ? 'Resume' : 'Pause';
      playback.hidden = false;
      plate.classList.toggle('swap-paused', paused || document.hidden);
    }
    function schedule() {
      clearTimeout(timer);
      if (page.hidden || document.hidden || paused || finished || reduced.matches) return;
      startedAt = performance.now();
      timer = setTimeout(advance, remaining);
    }
    function enter(index) {
      scene = index;
      const [name, duration, description] = scenes[index];
      remaining = duration;
      plate.dataset.scene = name;
      caption.textContent = description;
      finished = reduced.matches && scene === scenes.length - 1;
      paused = false;
      setControl();
      schedule();
    }
    function advance() {
      if (previewCard && !reduced.matches) {
        remaining = 0;
        startedAt = 0;
        paused = true;
        setControl();
        return;
      }
      if (scene < scenes.length - 1) enter(scene + 1);
      else { finished = true; setControl(); }
    }
    function suspend() {
      clearTimeout(timer);
      if (startedAt) remaining = Math.max(0, remaining - (performance.now() - startedAt));
      startedAt = 0;
    }
    playback.addEventListener('click', () => {
      previewCard = null;
      if (finished) { enter(0); return; }
      if (reduced.matches) { advance(); return; }
      if (paused) { paused = false; schedule(); }
      else { suspend(); paused = true; }
      setControl();
    });
    for (const card of plate.querySelectorAll('[data-preview]')) {
      const index = scenes.findIndex(([name]) => name === card.dataset.preview);
      function preview() {
        if (previewCard === card || page.hidden) return;
        const restarting = index === scene;
        previewCard = card;
        enter(index);
        if (restarting) {
          for (const animation of card.getAnimations({subtree:true})) animation.currentTime = 0;
        }
      }
      function leave() {
        if (previewCard !== card) return;
        previewCard = null;
        suspend();
        paused = true;
        setControl();
      }
      card.addEventListener('pointermove', event => { if (event.pointerType === 'mouse') preview(); });
      card.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') leave(); });
      card.addEventListener('focus', () => { if (card.matches(':focus-visible')) preview(); });
      card.addEventListener('blur', leave);
    }
    new MutationObserver(() => {
      previewCard = null;
      if (page.hidden) { clearTimeout(timer); startedAt = 0; }
      else enter(0);
    }).observe(page, { attributes: true, attributeFilter: ['hidden'] });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !paused && !finished) suspend();
      else if (!document.hidden) schedule();
      setControl();
    });
    reduced.addEventListener('change', () => { previewCard = null; enter(0); });
    enter(0);
  }

  playStory('.swap-plate', [
    ['request', 3000, 'New to the neighborhood, a student asks to borrow a drill to put up a shelf.'],
    ['lend', 3200, 'They meet at the neighborhood café. The neighbor lends the student her drill.'],
    ['teach', 4200, 'In return, the student shows her how to start a video call. She tries the camera button herself.'],
    ['stamp', 1400, 'With the exchange complete, they add a stamp to their swap card.']
  ]);
  playStory('.ride-plate', [
    ['booking', 3600, 'Outside her house, a student reserves a seat with a classmate whose route to campus passes her home.'],
    ['pickup', 2900, 'Her classmate pulls up at the curb outside her house.'],
    ['boarding', 2200, 'She puts her phone away and joins her classmate in the car.'],
    ['campus', 3300, 'Both students arrive on campus after sharing the rest of the drive.']
  ]);
  playStory('#pm-studio-plate .studio-plate', [
    ['scope', 7800, 'On a last-minute work trip, the traveler checks the desk, gets a booking confirmation moments later, and receives an itemized invoice.'],
    ['roadmap', 5100, 'For SmartHome, I put remote climate control and freeze protection first. Automation and budgeting came later on the roadmap.'],
    ['test', 5400, 'Could a 3D replay help a surgeon show a resident what a flat video misses? My study plan focused on depth, instrument angles, and how surgeons teach after an operation.'],
    ['jobs', 10400, 'A five-minute break stretches to twenty. On a different visit, the traveler finds a quiet café and leaves. Success depends on the job they came to do.']
  ]);
})();

// Image enlargement progressively enhances ordinary links; no framework required.
document.addEventListener('DOMContentLoaded', () => {
  const viewer = document.getElementById('image-viewer');
  const display = viewer?.querySelector('.viewer-stage img');
  const caption = document.getElementById('image-viewer-caption');
  let group = [];
  let current = 0;
  let opener;

  function show(index) {
    current = (index + group.length) % group.length;
    const link = group[current];
    display.src = link.href;
    display.alt = link.dataset.caption || link.querySelector('img').alt;
    caption.textContent = display.alt;
    viewer.querySelector('.viewer-original').href = link.href;
    viewer.querySelector('.viewer-count').textContent = `${current + 1} / ${group.length}`;
    viewer.querySelector('.viewer-previous').hidden = group.length < 2;
    viewer.querySelector('.viewer-next').hidden = group.length < 2;
  }

  document.querySelectorAll('.enlarge-image').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !viewer?.showModal) return;
      const img = link.querySelector('img');
      // A blocked external image still has a useful publisher/source link underneath.
      if (link.classList.contains('image-unavailable')) return;
      event.preventDefault();
      opener = link;
      group = [...link.closest('[data-gallery]').querySelectorAll('.enlarge-image:not(.image-unavailable)')];
      show(group.indexOf(link));
      viewer.showModal();
      document.body.classList.add('viewer-open');
      viewer.querySelector('.viewer-close').focus();
    });
    const img = link.querySelector('img');
    const failed = () => {
      link.classList.add('image-unavailable');
      link.querySelector('.enlarge-label').textContent = 'Open image at source ↗';
      const source = link.closest('figure').querySelector('.media-source');
      if (source) link.href = source.href;
    };
    img.addEventListener('error', failed);
    if (img.complete && img.naturalWidth === 0) failed();
  });

  if (viewer) {
    viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
    viewer.querySelector('.viewer-previous').addEventListener('click', () => show(current - 1));
    viewer.querySelector('.viewer-next').addEventListener('click', () => show(current + 1));
    viewer.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
    });
    viewer.addEventListener('click', event => {
      if (event.target === viewer) {
        const rect = viewer.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
      }
    });
    viewer.addEventListener('close', () => {
      document.body.classList.remove('viewer-open');
      opener?.focus({preventScroll: true});
    });
  }

  const names = ['home', 'publications', 'cv'];
  const targets = names.map(id => document.getElementById(id));
  const nav = [...document.querySelectorAll('.navbar a.nav-link')].filter(a => names.includes(a.hash.slice(1)));
  const syncNavigation = () => {
    let active = 'home';
    targets.forEach((target, i) => { if (target && target.getBoundingClientRect().top <= 160) active = names[i]; });
    nav.forEach(link => {
      const selected = link.hash === `#${active}`;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (!scheduled) requestAnimationFrame(() => { syncNavigation(); scheduled = false; });
    scheduled = true;
  }, {passive: true});
  window.addEventListener('hashchange', syncNavigation);
  nav.forEach(link => link.addEventListener('click', () => {
    const menu = document.querySelector('.navbar-collapse.show');
    if (menu && window.bootstrap?.Collapse) window.bootstrap.Collapse.getOrCreateInstance(menu).hide();
    else if (menu) { menu.classList.remove('show'); document.querySelector('.navbar-toggler')?.setAttribute('aria-expanded','false'); }
  }));
  syncNavigation();
});

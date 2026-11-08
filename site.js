// Image enlargement progressively enhances ordinary links; no framework required.
document.addEventListener('DOMContentLoaded', () => {
  // Retain Quarto's search index and widget, located in the Home content.
  const search = document.getElementById('quarto-search');
  const searchHome = document.getElementById('home-search');
  if (search && searchHome) searchHome.append(search);

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

  // Use the existing margin for navigation; never reduce the article width.
  const contents = document.getElementById('page-contents');
  const main = document.querySelector('main.content');
  if (!contents || !main) return;
  const panel = document.getElementById('contents-panel');
  const list = contents.querySelector('.contents-list');
  const headings = [...main.querySelectorAll('h2, h3')].filter(heading => {
    const publications = heading.closest('section#publications');
    return !publications || heading.tagName === 'H2';
  });
  const entries = [{target: document.getElementById('home'), label: 'Home', level: 2}];
  headings.forEach((heading, index) => {
    const section = heading.parentElement;
    let target = heading.id ? heading : (section.tagName === 'SECTION' && section.id ? section : heading);
    if (!target.id) target.id = `contents-heading-${index}`;
    const label = heading.cloneNode(true);
    label.querySelectorAll('.anchorjs-link, .anchor-link').forEach(a => a.remove());
    entries.push({target, label: label.textContent.trim(), level: Number(heading.tagName.slice(1))});
  });
  list.replaceChildren();
  const stack = [{level: 2, list}];
  entries.forEach(entry => {
    while (stack.length > 1 && entry.level < stack.at(-1).level) stack.pop();
    if (entry.level > stack.at(-1).level && stack.at(-1).list.lastElementChild) {
      const nested = document.createElement('ul');
      stack.at(-1).list.lastElementChild.append(nested);
      stack.push({level: entry.level, list: nested});
    }
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${entry.target.id}`;
    link.textContent = entry.label;
    li.append(link); stack.at(-1).list.append(li);
    entry.link = link;
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (!contents.classList.contains('contents-floating')) panel.open = false;
      const offset = contents.classList.contains('contents-floating') ? 24 : 64;
      const top = entry.label === 'Home' ? 0 : window.scrollY + entry.target.getBoundingClientRect().top - offset;
      history.pushState(null, '', link.hash);
      window.scrollTo({top: Math.max(0, top), behavior: 'instant'});
      syncContents();
    });
  });
  let previousActive;
  function syncContents() {
    const threshold = contents.classList.contains('contents-floating') ? 32 : 72;
    let active = entries[0];
    entries.forEach(entry => { if (entry.target.getBoundingClientRect().top <= threshold) active = entry; });
    if (active === previousActive) return;
    entries.forEach(entry => {
      entry.link.classList.toggle('active', entry === active);
      entry.link.removeAttribute('aria-current');
      entry.link.parentElement.classList.remove('contains-active');
    });
    active.link.setAttribute('aria-current', 'location');
    for (let parent = active.link.parentElement.parentElement; parent && parent !== list; parent = parent.parentElement) {
      if (parent.tagName === 'LI') parent.classList.add('contains-active');
    }
    if (contents.classList.contains('contents-floating')) {
      const scroller = contents.querySelector('.contents-scroll');
      const rect = active.link.getBoundingClientRect(), bounds = scroller.getBoundingClientRect();
      if (rect.top < bounds.top || rect.bottom > bounds.bottom) scroller.scrollTop += rect.top - bounds.top - bounds.height / 3;
    }
    previousActive = active;
  }
  function placeContents() {
    const available = main.getBoundingClientRect().left;
    const floating = available >= 260 && innerWidth >= 1100;
    const changed = floating !== contents.classList.contains('contents-floating');
    contents.classList.toggle('contents-floating', floating);
    const title = document.getElementById('title-block-header');
    const titleBottom = title ? title.getBoundingClientRect().bottom + window.scrollY : 120;
    contents.style.setProperty('--contents-top', `${floating ? Math.min(titleBottom + 20, innerHeight * .3) : 8}px`);
    if (floating) {
      contents.style.left = `${Math.max(16, available - 285)}px`;
      panel.open = true;
    } else {
      contents.style.removeProperty('left');
      if (changed) panel.open = false;
    }
    syncContents();
  }
  let scheduled = false;
  window.addEventListener('scroll', () => {
    if (!scheduled) requestAnimationFrame(() => { syncContents(); scheduled = false; });
    scheduled = true;
  }, {passive: true});
  window.addEventListener('resize', placeContents);
  window.addEventListener('hashchange', syncContents);
  window.addEventListener('popstate', () => requestAnimationFrame(syncContents));
  window.addEventListener('load', placeContents);
  placeContents();
});

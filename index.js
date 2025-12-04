// -------------- Theme toggle --------------
const toggle = document.getElementById('theme-toggle');
const icon = document.getElementById('theme-icon');
const label = document.getElementById('theme-label');

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    toggle.setAttribute('aria-pressed', 'true');
    icon.textContent = '☀️';
    label.textContent = 'Claro';
  } else {
    root.classList.remove('dark');
    toggle.setAttribute('aria-pressed', 'false');
    icon.textContent = '🌙';
    label.textContent = 'Oscuro';
  }
}

// Initialize theme
const saved = localStorage.getItem('theme');
if (saved) applyTheme(saved);
else {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

toggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
});

// -------------- Pokedex app --------------
const fetchBtn = document.getElementById('fetch-pokemon');
const nameInput = document.getElementById('pokemon-name');
const resultEl = document.getElementById('pokemon-result');
const statusEl = document.getElementById('pokemon-status');
const searchForm = document.getElementById('search-form');

const loadAllBtn = document.getElementById('load-all');
const loadMoreBtn = document.getElementById('load-more');
const prevBtn = document.getElementById('load-prev');
const firstBtn = document.getElementById('first-page');
const extraControls = document.getElementById('pokemon-controls-extra');
const infiniteToggle = document.getElementById('infinite-toggle');
// support two possible element ids: older 'batch-size-input' or newer 'cantidadVisible'
let batchSizeInput = document.getElementById('batch-size-input');
if (!batchSizeInput) batchSizeInput = document.getElementById('cantidadVisible');

// app state
let allPokemon = [];
let currentIndex = 0;
let pageIndex = 0;
let batchSize = parseInt(batchSizeInput?.value || '50', 10) || 50;
let infiniteObserver = null;
let totalPages = 0;
let paginationMode = 'append';

function setStatus(text) {
  statusEl.textContent = text || '';
}

function setLoading(isLoading) {
  setStatus(isLoading ? 'Cargando…' : '');
  const ensureSingle = () => {
    let single = document.getElementById('pokemon-single');
    if (!single) {
      single = document.createElement('div');
      single.id = 'pokemon-single';
      single.className = 'pokemon-single';
      // insert at the top of results so grid remains below
      resultEl.insertBefore(single, resultEl.firstChild);
    }
    return single;
  };

  if (isLoading) {
    const singleEl = ensureSingle();
    singleEl.innerHTML = '<div class="poke-card loading">Cargando…</div>';
    singleEl.style.display = 'block';
  }
}

function showError(msg) {
  const ensureSingle = () => {
    let single = document.getElementById('pokemon-single');
    if (!single) {
      single = document.createElement('div');
      single.id = 'pokemon-single';
      single.className = 'pokemon-single';
      resultEl.insertBefore(single, resultEl.firstChild);
    }
    return single;
  };
  const singleEl = ensureSingle();
  singleEl.innerHTML = `<div class="poke-card error">${msg}</div>`;
  singleEl.style.display = 'block';
  setStatus('');
}

// Render a single full card (used for search results)
function renderPokemon(data) {
  if (!data) return showError('Datos inválidos');

  const img = data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default || '';
  const types = data.types.map(t => t.type.name).join(', ');
  const abilities = data.abilities.map(a => a.ability.name).join(', ');
  const statsRows = data.stats.map(s => `<li><strong>${s.stat.name}</strong>: ${s.base_stat}</li>`).join('');

  const ensureSingle = () => {
    let single = document.getElementById('pokemon-single');
    if (!single) {
      single = document.createElement('div');
      single.id = 'pokemon-single';
      single.className = 'pokemon-single';
      resultEl.insertBefore(single, resultEl.firstChild);
    }
    return single;
  };
  const singleEl = ensureSingle();
  const cardHtml = `
    <article class="poke-card">
      <header class="poke-head">
        <img src="${img}" alt="Imagen de ${data.name}" onerror="this.style.display='none'" />
        <div class="poke-meta">
          <h2>#${data.id} ${data.name}</h2>
          <div class="meta-row"><strong>Tipo:</strong> ${types}</div>
          <div class="meta-row"><strong>Habilidades:</strong> ${abilities}</div>
        </div>
      </header>
      <section class="poke-stats">
        <h3>Estadísticas</h3>
        <ul>${statsRows}</ul>
      </section>
    </article>
  `;
  if (singleEl) {
    singleEl.innerHTML = cardHtml;
    singleEl.style.display = 'block';
  } else {
    resultEl.innerHTML = cardHtml;
  }
  setStatus('');
}

async function fetchPokemon(name) {
  const safeName = (name || '').trim().toLowerCase();
  if (!safeName) return showError('Introduce un nombre o id válido');

  setLoading(true);
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(safeName)}`);
    if (!res.ok) throw new Error(`No se encontró: ${res.status}`);
    const json = await res.json();
    renderPokemon(json);
  } catch (err) {
    showError('Error cargando Pokémon — ' + (err.message || err));
  }
}

// small helper: derive image from id
function getImageUrlForId(id){
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// GRID rendering for many pokemons
function renderPokemonsGrid(items, append = false) {
  // Only clear the grid area (don't wipe the whole container; keep the single-result card)
  let grid = resultEl.querySelector('.pokemon-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'pokemon-grid';
    resultEl.appendChild(grid);
  }
  if (!append) {
    // clear only the grid's children, keep other nodes (like #pokemon-single) intact
    grid.innerHTML = '';
  }

  items.forEach(p => {
    const node = document.createElement('article');
    node.className = 'poke-card grid-item';
    node.dataset.pokemonName = p.name;
    node.dataset.pokemonId = p.id;
    node.innerHTML = `
      <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.style.opacity=.15;" />
      <div class="grid-meta">
        <div class="grid-id">#${p.id}</div>
        <div class="grid-name">${p.name}</div>
      </div>
    `;

    // click opens details modal
    node.addEventListener('click', () => openDetailsModal(p.name || p.id));
    grid.appendChild(node);
  });
}

function updateProgressText() {
  if (!allPokemon.length) {
    setStatus('');
    return;
  }
  if (paginationMode === 'replace') {
    const start = pageIndex * batchSize + 1;
    const end = Math.min((pageIndex + 1) * batchSize, allPokemon.length);
    setStatus(`Mostrando ${start}-${end} de ${allPokemon.length}`);
  } else {
    setStatus(`Mostrando ${Math.min(currentIndex, allPokemon.length)} de ${allPokemon.length}`);
  }
}

// render specific page for replace-mode pagination
function renderPage(index) {
  if (!allPokemon.length) return;
  batchSize = parseInt(batchSizeInput?.value || String(batchSize), 10) || batchSize;
  totalPages = Math.ceil(allPokemon.length / batchSize);
  if (index < 0) index = 0;
  if (index >= totalPages) index = totalPages - 1;
  const start = index * batchSize;
  const end = Math.min(start + batchSize, allPokemon.length);
  const slice = allPokemon.slice(start, end);
  renderPokemonsGrid(slice, false);
  pageIndex = index;
  currentIndex = end;
  updateProgressText();

  // update pager UI (if present)
  const pager = document.getElementById('pager');
  if (pager) {
      // rebuild pager so the sliding window updates correctly based on the new pageIndex
      renderPager();
    pager.style.display = totalPages > 1 ? 'flex' : 'none';
    // ensure the previous/first/siguiente controls are visible when multiple pages exist
    if (extraControls) extraControls.style.display = totalPages > 1 ? 'flex' : 'none';
  }

  // update controls visibility
  firstBtn && (firstBtn.style.display = pageIndex > 0 ? 'inline-block' : 'none');
  prevBtn && (prevBtn.style.display = pageIndex > 0 ? 'inline-block' : 'none');
  const remaining = Math.max(0, allPokemon.length - currentIndex);
  const nextCount = Math.min(batchSize, remaining);
  if (nextCount > 0) {
    loadMoreBtn.style.display = 'inline-block';
    loadMoreBtn.textContent = `Siguiente (${nextCount})`;
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

function renderPager() {
  const pager = document.getElementById('pager');
  if (!pager) return;
  pager.innerHTML = '';
  totalPages = Math.ceil(allPokemon.length / batchSize) || 1;
  // show a sliding window of page buttons (max 5 visible) and ellipses
  // we also add small left/right arrows inside the pager so users can always go prev/next
  // regardless of the external control buttons visibility
  const createArrow = (dir) => {
    const arrow = document.createElement('button');
    arrow.type = 'button';
    arrow.className = 'page-arrow';
    arrow.setAttribute('aria-label', dir === 'left' ? 'Anterior' : 'Siguiente');
    arrow.textContent = dir === 'left' ? '‹' : '›';
    arrow.addEventListener('click', () => {
      if (dir === 'left') renderPage(pageIndex - 1);
      else renderPage(pageIndex + 1);
    });
    return arrow;
  };

  // left arrow
  const leftArrow = createArrow('left');
  leftArrow.disabled = pageIndex <= 0;
  pager.appendChild(leftArrow);
  const maxButtons = 5;
  if (totalPages <= maxButtons) {
    for (let i = 0; i < totalPages; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-btn';
      btn.textContent = (i + 1).toString();
      btn.disabled = i === pageIndex;
      btn.setAttribute('aria-label', `Página ${i + 1}`);
      btn.setAttribute('data-page', String(i));
      if (i === pageIndex) btn.classList.add('active');
      btn.addEventListener('click', () => renderPage(i));
      pager.appendChild(btn);
    }
    // add right arrow at end
    const rightArrow = createArrow('right');
    rightArrow.disabled = pageIndex >= totalPages - 1;
    pager.appendChild(rightArrow);
  } else {
    const half = Math.floor(maxButtons / 2); // 2
    let start = pageIndex - half;
    let end = pageIndex + half;
    if (start < 0) { start = 0; end = maxButtons - 1; }
    if (end > totalPages - 1) { end = totalPages - 1; start = totalPages - maxButtons; }

    // optional first page + ellipsis
    if (start > 0) {
      const first = document.createElement('button');
      first.type = 'button';
      first.className = 'page-btn';
      first.textContent = '1';
      first.setAttribute('data-page', '0');
      first.setAttribute('aria-label', 'Página 1');
      first.addEventListener('click', () => renderPage(0));
      pager.appendChild(first);
      if (start > 1) {
        const dots = document.createElement('span');
        dots.className = 'page-dots';
        dots.textContent = '…';
        pager.appendChild(dots);
      }
    }

    for (let i = start; i <= end; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'page-btn';
      btn.textContent = (i + 1).toString();
      btn.disabled = i === pageIndex;
      btn.setAttribute('aria-label', `Página ${i + 1}`);
      btn.setAttribute('data-page', String(i));
      if (i === pageIndex) btn.classList.add('active');
      btn.addEventListener('click', () => renderPage(i));
      pager.appendChild(btn);
    }

    // optional trailing ellipsis + last page
    if (end < totalPages - 1) {
      if (end < totalPages - 2) {
        const dots = document.createElement('span');
        dots.className = 'page-dots';
        dots.textContent = '…';
        pager.appendChild(dots);
      }
      const last = document.createElement('button');
      last.type = 'button';
      last.className = 'page-btn';
      last.textContent = totalPages.toString();
      last.setAttribute('data-page', String(totalPages - 1));
      last.setAttribute('aria-label', `Página ${totalPages}`);
      last.addEventListener('click', () => renderPage(totalPages - 1));
      pager.appendChild(last);
    }

    // right arrow
    const rightArrow = createArrow('right');
    rightArrow.disabled = pageIndex >= totalPages - 1;
    pager.appendChild(rightArrow);
  }
  pager.style.display = totalPages > 1 ? 'flex' : 'none';
  // Make sure the controls area is visible when there are multiple pages
  if (extraControls) extraControls.style.display = totalPages > 1 ? 'flex' : 'none';
  // show/hide first/prev based on pageIndex
  if (firstBtn) firstBtn.style.display = pageIndex > 0 ? 'inline-flex' : 'none';
  if (prevBtn) prevBtn.style.display = pageIndex > 0 ? 'inline-flex' : 'none';
  // show/hide next button based on remaining pages
  const remaining = Math.max(0, allPokemon.length - ((pageIndex + 1) * batchSize));
  const nextCount = Math.min(batchSize, remaining);
  if (loadMoreBtn) loadMoreBtn.style.display = nextCount > 0 ? 'inline-flex' : 'none';
}

function renderNextBatch() {
  if (!allPokemon.length) return;
  batchSize = parseInt(batchSizeInput?.value || String(batchSize), 10) || batchSize;
  const slice = allPokemon.slice(currentIndex, currentIndex + batchSize);
  if (!slice.length) return;
  renderPokemonsGrid(slice, currentIndex !== 0);
  currentIndex += slice.length;
  updateProgressText();

  // show/hide controls
  if (currentIndex < allPokemon.length) {
    loadMoreBtn.style.display = 'inline-block';
    extraControls.style.display = 'block';
  } else {
    loadMoreBtn.style.display = 'none';
    extraControls.style.display = 'block';
  }
}

async function fetchAllPokemons() {
  // fetch list only (names+urls), images derived by id
  resetAllState();
  setLoading(true);
  try {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0');
    if (!res.ok) throw new Error(res.statusText || 'Error fetching list');
    const json = await res.json();
    allPokemon = json.results.map(item => {
      const m = item.url.match(/\/pokemon\/(\d+)\/?$/);
      const id = m ? parseInt(m[1], 10) : null;
      return { name: item.name, url: item.url, id, image: id ? getImageUrlForId(id) : '' };
    });

    if (!allPokemon.length) {
      showError('No se encontraron Pokémon');
      return;
    }

    // Setup replace-mode pagination (pages) using the selected batchSize
    paginationMode = 'replace';
    // make sure batchSize reflects select value
    batchSize = parseInt(batchSizeInput?.value || String(batchSize), 10) || batchSize;
    totalPages = Math.ceil(allPokemon.length / batchSize);

    // render first page (index 0)
    pageIndex = 0;
    renderPage(0);
    renderPager();

    // clear any previous single search result so initial view is the paged grid
    const singleEl = document.getElementById('pokemon-single');
    if (singleEl) { singleEl.innerHTML = ''; singleEl.style.display = 'none'; }

    // show pager & controls
    extraControls.style.display = 'block';
    const remaining = Math.max(0, allPokemon.length - currentIndex);
    const nextCount = Math.min(batchSize, remaining);
    loadMoreBtn.style.display = nextCount > 0 ? 'inline-block' : 'none';

    // disable infinite-scroll in page mode
    detachInfiniteScroll();
  } catch (err) {
    showError('Error cargando la lista — ' + (err.message || err));
  }
}

function resetAllState() {
  allPokemon = [];
  currentIndex = 0;
  pageIndex = 0;
  loadMoreBtn.style.display = 'none';
  extraControls.style.display = 'none';
  resultEl.innerHTML = '';
  const singleEl = document.getElementById('pokemon-single');
  if (singleEl) { singleEl.innerHTML = ''; singleEl.style.display = 'none'; }
  setStatus('');
  totalPages = 0;
  paginationMode = 'append';
  detachInfiniteScroll();
}

// Infinite scroll: load next batch when user is near page bottom
function attachInfiniteScroll() {
  detachInfiniteScroll();
  infiniteObserver = () => {
    const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 400);
    if (nearBottom) renderNextBatch();
  };
  window.addEventListener('scroll', infiniteObserver);
}

function detachInfiniteScroll() {
  if (!infiniteObserver) return;
  window.removeEventListener('scroll', infiniteObserver);
  infiniteObserver = null;
}

// Details modal: fetch single pokemon and display into modal
const modal = document.getElementById('poke-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

function openModal() { modal.setAttribute('aria-hidden', 'false'); modal.classList.add('open'); }
function closeModal() { modal.setAttribute('aria-hidden', 'true'); modal.classList.remove('open'); }

async function openDetailsModal(nameOrId) {
  try {
    modalContent.innerHTML = 'Cargando…';
    openModal();
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(nameOrId)}`);
    if (!res.ok) throw new Error(res.statusText || res.status);
    const data = await res.json();

    const img = data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default || '';
    const types = data.types.map(t => t.type.name).join(', ');
    const abilities = data.abilities.map(a => a.ability.name).join(', ');
    const moves = data.moves.slice(0, 8).map(m => m.move.name).join(', ');
    const stats = data.stats.map(s => ({ name: s.stat.name, value: s.base_stat }));

    modalContent.innerHTML = `
      <div class="detail-card">
        <header class="detail-head">
          <img src="${img}" alt="${data.name}" onerror="this.style.display='none'" />
          <div>
            <h2>#${data.id} ${data.name}</h2>
            <div class="meta-row"><strong>Tipo:</strong> ${types}</div>
            <div class="meta-row"><strong>Habilidades:</strong> ${abilities}</div>
          </div>
        </header>
        <section class="detail-body">
          <div><strong>Altura:</strong> ${data.height}</div>
          <div><strong>Peso:</strong> ${data.weight}</div>
          <div><strong>Experiencia base:</strong> ${data.base_experience}</div>
          <div><strong>Movimientos (ej):</strong> ${moves}</div>
        </section>
        <section class="detail-stats">
          <h3>Estadísticas</h3>
          <ul>${stats.map(s => `<li><strong>${s.name}</strong>: ${s.value}</li>`).join('')}</ul>
        </section>
      </div>
    `;

  } catch (err) {
    modalContent.innerHTML = 'No se pudo cargar el detalle — ' + (err.message || err);
  }
}

modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

// Wire up UI
// form submit handler (prevents page reload and performs the search)
if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    detachInfiniteScroll();
    fetchPokemon(nameInput.value || 'ditto');
  });
}

// keep the button click handler for direct clicks (defensive)
fetchBtn.addEventListener('click', (e) => {
  // if button was clicked and sits inside a form this might trigger submit
  // our submit handler will run; we still prevent default and call fetch.
  e.preventDefault();
  detachInfiniteScroll();
  fetchPokemon(nameInput.value || 'ditto');
});

loadAllBtn.addEventListener('click', () => {
  batchSize = parseInt(batchSizeInput?.value || '50', 10) || 50;
  fetchAllPokemons();
});

loadMoreBtn.addEventListener('click', () => {
  if (paginationMode === 'replace') {
    // in page mode, clicking "Siguiente" should go to next page
    renderPage(pageIndex + 1);
  } else {
    // in append/legacy mode, keep loading next batch
    renderNextBatch();
  }
});

// previous / first page navigation (replace mode)
if (prevBtn) prevBtn.addEventListener('click', () => renderPage(pageIndex - 1));
if (firstBtn) firstBtn.addEventListener('click', () => renderPage(0));

// When user toggles infinite scroll, attach/detach appropriately
if (infiniteToggle) {
  infiniteToggle.addEventListener('change', (e) => {
    if (e.target.checked) attachInfiniteScroll();
    else detachInfiniteScroll();
  });
}

// Auto-load ditto on page load
// On load, show the paged list by default (instead of loading a single 'ditto')
window.addEventListener('load', () => {
  // make sure the UI reflects that we're loading the full list
  // respect the current batch size selection
  batchSize = parseInt(batchSizeInput?.value || String(batchSize), 10) || batchSize;
  fetchAllPokemons();
});
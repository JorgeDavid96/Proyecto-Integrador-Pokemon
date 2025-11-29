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

const loadAllBtn = document.getElementById('load-all');
const loadMoreBtn = document.getElementById('load-more');
const extraControls = document.getElementById('pokemon-controls-extra');
const infiniteToggle = document.getElementById('infinite-toggle');
const batchSizeInput = document.getElementById('batch-size-input');

// app state
let allPokemon = [];
let currentIndex = 0;
let batchSize = parseInt(batchSizeInput?.value || '50', 10) || 50;
let infiniteObserver = null;

function setStatus(text) {
  statusEl.textContent = text || '';
}

function setLoading(isLoading) {
  setStatus(isLoading ? 'Cargando…' : '');
  if (isLoading && resultEl.children.length === 0) {
    resultEl.innerHTML = '<div class="poke-card loading">Cargando…</div>';
  }
}

function showError(msg) {
  resultEl.innerHTML = `<div class="poke-card error">${msg}</div>`;
  setStatus('');
}

// Render a single full card (used for search results)
function renderPokemon(data) {
  if (!data) return showError('Datos inválidos');

  const img = data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default || '';
  const types = data.types.map(t => t.type.name).join(', ');
  const abilities = data.abilities.map(a => a.ability.name).join(', ');
  const statsRows = data.stats.map(s => `<li><strong>${s.stat.name}</strong>: ${s.base_stat}</li>`).join('');

  resultEl.innerHTML = `
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
  if (!append) resultEl.innerHTML = '';

  let grid = resultEl.querySelector('.pokemon-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'pokemon-grid';
    resultEl.appendChild(grid);
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
  setStatus(`Mostrando ${Math.min(currentIndex, allPokemon.length)} de ${allPokemon.length}`);
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

    // render first batch and expose controls
    resultEl.innerHTML = '';
    currentIndex = 0;
    renderNextBatch();

    // show controls
    extraControls.style.display = 'block';

    // if infinite enabled, attach scroll handler
    if (infiniteToggle && infiniteToggle.checked) attachInfiniteScroll();
  } catch (err) {
    showError('Error cargando la lista — ' + (err.message || err));
  }
}

function resetAllState() {
  allPokemon = [];
  currentIndex = 0;
  loadMoreBtn.style.display = 'none';
  extraControls.style.display = 'none';
  resultEl.innerHTML = '';
  setStatus('');
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
fetchBtn.addEventListener('click', () => {
  detachInfiniteScroll();
  fetchPokemon(nameInput.value || 'ditto');
});

loadAllBtn.addEventListener('click', () => {
  batchSize = parseInt(batchSizeInput?.value || '50', 10) || 50;
  fetchAllPokemons();
});

loadMoreBtn.addEventListener('click', () => renderNextBatch());

// When user toggles infinite scroll, attach/detach appropriately
if (infiniteToggle) {
  infiniteToggle.addEventListener('change', (e) => {
    if (e.target.checked) attachInfiniteScroll();
    else detachInfiniteScroll();
  });
}

// Auto-load ditto on page load
window.addEventListener('load', () => fetchPokemon(nameInput.value || 'ditto'));

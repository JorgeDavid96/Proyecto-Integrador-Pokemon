# 🔴 Pokédex App — Documentación Completa

**Una aplicación web responsiva para explorar y buscar Pokémon usando la PokeAPI.**

Construida con **HTML5, CSS3 y JavaScript vanilla** (sin frameworks). La app ofrece navegación por páginas, búsqueda, tema claro/oscuro, y experiencia optimizada para móvil, tablet y escritorio.

---

## 📋 Tabla de Contenidos

1. [Características](#características)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Instalación & Uso](#instalación--uso)
4. [Detalles Técnicos](#detalles-técnicos)
5. [API & Datos](#api--datos)
6. [Gestión de Estado](#gestión-de-estado)
7. [Componentes UI](#componentes-ui)
8. [Diseño Responsivo](#diseño-responsivo)
9. [Guía de Desarrollo](#guía-de-desarrollo)
10. [Troubleshooting](#troubleshooting)
11. [Limitaciones & Futuro](#limitaciones--futuro)

---

## ✨ Características

### Búsqueda
- Buscar Pokémon por **nombre** o **ID**
- Resultados en tarjeta detallada con estadísticas
- La búsqueda se muestra **arriba de la grilla** (sin borrar)

### Paginación
- Carga la lista completa (~10,303 Pokémon) en **páginas**
- **Cantidad visible**: controla el tamaño de página (10, 20, 30, 40, 50)
- **Paginador deslizante**: muestra máx. 5 botones + flechas + primera/última página
- Botones de navegación: Anterior, Primera, Siguiente

### Tema (Light/Dark)
- Toggle claro/oscuro en el encabezado
- Persistencia automática en localStorage
- Variables CSS para fácil personalización
- Alto contraste en ambos modos

### Modal de Detalles
- Haz clic en cualquier tarjeta para ver estadísticas completas
- Mostrar: altura, peso, experiencia base, movimientos, estadísticas
- Cierre con botón X o fondo oscuro

### Diseño Responsivo
- **Móvil (320–640px)**: Formulario en columna, grid compacta
- **Tablet (641–1024px)**: Formulario envolvente, grid ampliada
- **Escritorio (1024px+)**: Diseño completo

### Optimización
- **Lazy loading** de imágenes
- **Infinite scroll** opcional (checkbox "Mostrar todos")
- Sin dependencias externas

---

## 📁 Estructura del Proyecto

```
Proyecto Integrador/
├── index.html        # Markup: formulario, grilla, modal, controles
├── style.css         # Estilos: temas, layouts, responsive
├── index.js          # Lógica: fetch, render, paginación, modal
├── readme.md         # Esta documentación
└── .git/             # Control de versiones
```

---

## 🚀 Instalación & Uso

### Requisitos
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet (para acceder a PokeAPI)

### Pasos

1. **Descarga o clona el proyecto**:
   ```bash
   git clone <repo-url>
   cd Proyecto-integrador
   ```

2. **Abre `index.html`**:
   - En el navegador: `File → Open` o arrastra `index.html` a la ventana
   - Alternativamente, usa un servidor local:
     ```bash
     python -m http.server 8000
     # Luego abre http://localhost:8000
     ```

3. **¡Listo!** La app carga automáticamente la primera página de Pokémon

---

## 💻 Detalles Técnicos

### Tecnologías
| Tecnología | Propósito |
|-----------|----------|
| HTML5 | Estructura semántica |
| CSS3 | Estilos, temas, responsivo |
| JavaScript ES6+ | Lógica de app (fetch, render, estado) |
| PokeAPI | Datos de Pokémon |
| LocalStorage | Persistencia de tema |

### Compatibilidad
- ✅ Chrome/Edge 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ❌ IE 11 (no soportado)

---

## 🌐 API & Datos

### Endpoints

**1. Listar Pokémon**
```
GET https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0
```
- Devuelve: lista de nombres, URLs, total count (~10,303)
- Respuesta ejemplo:
  ```json
  {
    "count": 10303,
    "next": null,
    "previous": null,
    "results": [
      {"name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon/1/"},
      ...
    ]
  }
  ```

**2. Obtener Pokémon Individual**
```
GET https://pokeapi.co/api/v2/pokemon/{name_or_id}
```
- Devuelve: sprites, tipos, habilidades, estadísticas, movimientos
- Ejemplo: `/pokemon/pikachu` o `/pokemon/25`

### Procesamiento de Datos

1. **Lista inicial**: Se extrae el ID de cada URL (`/pokemon/{id}/`)
2. **Imagen**: Se construye URL de arte oficial:
   ```javascript
   https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png
   ```
3. **Almacenamiento local**: Array `allPokemon` contiene {name, url, id, image}
4. **Detalles**: Se obtienen bajo demanda al hacer clic (modal)

---

## 🎛️ Gestión de Estado

### Variables Globales

```javascript
// Lista de Pokémon (cargada al inicio o al hacer clic en "Cargar todos")
let allPokemon = [];

// Índice de página actual (0-based)
let pageIndex = 0;

// Índice de elemento en modo append
let currentIndex = 0;

// Cantidad de elementos por página
let batchSize = 50;

// Total de páginas calculado
let totalPages = 0;

// Total oficial de Pokémon desde API
let apiTotalCount = 0;

// Modo de paginación: 'replace' (páginas) o 'append' (scroll infinito)
let paginationMode = 'append';
```

### Flujo de Estado

**Al cargar página (window.load)**:
```
fetchAllPokemons()
  → resetAllState() limpia estado
  → fetch lista de PokeAPI
  → allPokemon = procesar resultados
  → apiTotalCount = json.count
  → paginationMode = 'replace'
  → pageIndex = 0
  → renderPage(0) muestra primera página
  → renderPager() construye paginador
```

**Al navegar página (renderPage)**:
```
renderPage(index)
  → Valida y clipa index
  → slice allPokemon por rango de página
  → renderPokemonsGrid() actualiza grilla
  → pageIndex = index
  → updateProgressText() muestra "Mostrando X-Y de Z"
  → renderPager() reconstruye paginador deslizante
```

**Al buscar (fetchPokemon)**:
```
fetchPokemon(name)
  → fetch detalles individuales
  → renderPokemon() muestra en #pokemon-single
  → grilla (#pokemon-result) permanece intacta
```

---

## 🎨 Componentes UI

### Encabezado (`.site-header`)
- Logo Pokémon (200px altura, escalable)
- Toggle de tema (🌙 / ☀️)

### Formulario de Búsqueda (`.searchPokemon`)
- **Input**: búsqueda por nombre/ID (expandido a 72% del ancho)
- **Botones**: "Buscar Pokémon", "Cargar todos"
- **Controls**: checkbox "Mostrar todos", dropdown "Cantidad visible"
- Desktop: flex horizontal | Móvil: flex column

### Área de Resultados
- **#pokemon-single**: tarjeta de búsqueda (arriba)
- **#pokemon-result**: contenedor principal
  - **.pokemon-grid**: grilla auto-fill con minmax
  - **.poke-card.grid-item**: tarjetas individuales (clickeables)

### Paginador (`.pager`)
- **Flechas (‹ ›)**: prev/next page
- **Botones numéricos**: saltar a página específica
- **Puntos suspensivos (…)**: indica salto
- **Primera / Última**: botones en los extremos si aplica
- Máximo 5 botones visibles (ventana deslizante)

### Controles Extra (`#pokemon-controls-extra`)
- **"Inicio"** (`#first-page`): ir a página 0
- **"Anterior"** (`#load-prev`): página anterior
- **"Siguiente (N)"** (`#load-more`): página siguiente o next batch

### Modal de Detalles (`.poke-modal`)
- Overlay oscuro (backdrop)
- Panel con imagen, nombre, ID, tipos, habilidades, altura, peso, experiencia, movimientos, estadísticas
- Botón de cierre (✕)

---

## 📱 Diseño Responsivo

### Mobile (320–640px)
```css
/* Cambios principales */
.site-header .logo img { height: 120px; }
.searchPokemon { flex-direction: column; width: 100%; }
.searchPokemon input, button, select { width: 100%; margin: 0.5rem 0; }
.pokemon-grid { grid-template-columns: repeat(2, 1fr); }
.pager { gap: 0.25rem; }
.pager .page-btn { padding: 0.3rem 0.45rem; min-width: 30px; font-size: 0.92rem; }
```
**Experiencia**: Formulario compacto, grilla de 2 columnas, paginador pequeño, botones táctiles (45px+)

### Tablet (641–1024px)
```css
/* Cambios principales */
.site-header .logo img { height: 160px; }
.searchPokemon { flex-wrap: wrap; gap: 1rem; }
.searchPokemon input { flex: 1 1 60%; }
.pokemon-grid { grid-template-columns: repeat(3, 1fr); }
.pager { gap: 0.5rem; }
```
**Experiencia**: Formulario envolvente con input expandido, grilla de 3 columnas, paginador ampliado

### Desktop (1024px+)
```css
/* Diseño por defecto (sin overrides) */
.site-header .logo img { height: 200px; }
.searchPokemon { gap: 1.5rem; }
.pokemon-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
```
**Experiencia**: Diseño completo, múltiples columnas automáticas, espaciado completo

---

## 🛠️ Guía de Desarrollo

### Agregar una Característica

**Ejemplo: Agregar un filtro por tipo**

1. Añade un nuevo `<select>` en `index.html`:
   ```html
   <select id="type-filter">
     <option value="">Todos los tipos</option>
     <option value="fire">Fuego</option>
     ...
   </select>
   ```

2. En `index.js`, añade variable y lógica:
   ```javascript
   const typeFilterSelect = document.getElementById('type-filter');
   
   typeFilterSelect.addEventListener('change', () => {
     const selectedType = typeFilterSelect.value;
     const filtered = selectedType 
       ? allPokemon.filter(p => p.types?.includes(selectedType))
       : allPokemon;
     renderPage(0); // redibuja
   });
   ```

3. Actualiza `renderPage()` para usar `filtered` en lugar de `allPokemon`

### Modificar Temas

En `style.css`, actualiza las variables de color:
```css
:root {
  --bg: #7ec2c7;           /* Color de fondo claro */
  --accent: #178088;       /* Color de acentos claro */
  --text: #1f2937;         /* Texto claro */
}

html.dark {
  --bg: #0b1220;           /* Color de fondo oscuro */
  --accent: #60a5fa;       /* Color de acentos oscuro */
  --text: #e6eef6;         /* Texto oscuro */
}
```

### Cambiar Tamaño de Paginador

En `index.js`, función `renderPager()`:
```javascript
const maxButtons = 7;  // Cambiar de 5 a 7 botones máximo
```

### Depuración

Abre DevTools (F12) y ejecuta:
```javascript
console.log(allPokemon);      // Ver todos los Pokémon cargados
console.log(pageIndex);        // Página actual
console.log(apiTotalCount);    // Total desde API
```

---

## 🐛 Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| No carga Pokémon | Sin internet o PokeAPI caída | Verifica conexión; intenta más tarde |
| Imágenes rotas | URL de sprite incorrecta | Verifica estructura de ID en consola |
| Búsqueda no encuentra Pokémon | Nombre/ID incorrecto | Intenta con nombre en minúsculas o ID numérico |
| Tema no persiste | LocalStorage deshabilitado | Habilita localStorage en navegador |
| Paginador no navega | Función renderPage no llamada | Verifica listeners de botones en consola |
| Grilla vacía | allPokemon vacío o no renderizado | Recarga; comprueba fetch de API |

---

## 📋 Limitaciones & Futuro

### Limitaciones Actuales
- **Sin persistencia de datos locales**: Los Pokémon se re-cargan en cada sesión
- **Limitado a PokeAPI público**: No hay backend propio
- **Sin filtros avanzados**: Solo búsqueda por nombre/ID
- **Modo offline limitado**: Requiere conexión para imágenes y detalles
- **Sin historial de búsqueda**: No se guardan búsquedas previas

### Posibles Mejoras
1. **Caché local**: Guardar Pokémon en IndexedDB para offline
2. **Filtros**: Por tipo, generación, estadísticas
3. **Comparador**: Comparar stats de múltiples Pokémon
4. **Favoritos**: Guardar favoritos con localStorage
5. **Búsqueda avanzada**: Por rango de atributos
6. **Evoluciones**: Mostrar cadena evolutiva
7. **Generaciones**: Filtrar por generación (Gen I–IX)
8. **Progressive Web App**: Installable en móviles
9. **Backend propio**: API local para mejor caché y velocidad
10. **Exportar datos**: CSV/JSON de resultados

---

## 📞 Soporte

**Problemas técnicos**: Abre DevTools (F12) y comprueba:
- Pestaña **Network**: verifica requests a PokeAPI
- Pestaña **Console**: errores o mensajes de debug
- Pestaña **Storage**: localStorage para tema

**PokeAPI Docs**: https://pokeapi.co/docs/v2

---

## 📄 Licencia

Este proyecto es de código abierto y utiliza datos públicos de [PokeAPI](https://pokeapi.co/).

Pokémon es propiedad de The Pokémon Company. Este proyecto es educativo.

---

**Hecho con ❤️ para DevSenior**

/* ============================================================
   PERIODICALS DASHBOARD — canada-map.js
   Real province paths from @svg-maps/canada (CC-BY-4.0)
   Loaded via CDN, parsed, and injected at runtime.
   ============================================================ */

const PROV_FULL_NAMES = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba',
  NB: 'New Brunswick', NL: 'Newfoundland & Labrador', NS: 'Nova Scotia',
  NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario',
  PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon'
};

const MAP_SVG_URL = 'https://cdn.jsdelivr.net/npm/@svg-maps/canada/canada.svg';

// Fetches the real SVG, extracts paths, injects them into #canadaMap
async function loadCanadaMap() {
  try {
    const resp = await fetch(MAP_SVG_URL);
    if (!resp.ok) throw new Error('Failed to fetch map SVG');
    const text = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) throw new Error('No SVG element found');

    // Copy viewBox
    const target = document.getElementById('canadaMap');
    if (!target) return;
    const vb = svgEl.getAttribute('viewBox');
    if (vb) target.setAttribute('viewBox', vb);

    // Extract paths by id → province code
    const ID_MAP = {ab:'AB',bc:'BC',mb:'MB',nb:'NB',nl:'NL',ns:'NS',nt:'NT',nu:'NU',on:'ON',pe:'PE',qc:'QC',sk:'SK',yt:'YT'};
    window.CANADA_PATHS = {};
    svgEl.querySelectorAll('path').forEach(p => {
      const id = p.getAttribute('id');
      const code = ID_MAP[id];
      if (code) {
        window.CANADA_PATHS[code] = p.getAttribute('d');
      }
    });

    // Signal that map is ready
    if (typeof window.onMapReady === 'function') window.onMapReady();
  } catch (e) {
    console.warn('Canada map load failed:', e.message);
    // Hide map card gracefully
    const card = document.getElementById('mapContainer');
    if (card && card.parentElement) card.parentElement.style.display = 'none';
  }
}

loadCanadaMap();

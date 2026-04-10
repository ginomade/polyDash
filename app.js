const selectEl = document.getElementById('market-select');
const refreshBtn = document.getElementById('refresh-btn');
const statusEl = document.getElementById('status');
const probabilityEl = document.getElementById('probability');
const shiftEl = document.getElementById('prob-shift');
const liquidityEl = document.getElementById('liquidity');
const volumeEl = document.getElementById('volume');
const highlightsEl = document.getElementById('highlights');

let markets = [];
const CRYPTO_KEYWORDS = ['crypto', 'cryptocurrency', 'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'doge', 'xrp', 'bnb'];

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });

function toNumber(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function getYesProbability(market) {
  const outcomePrices = Array.isArray(market.outcomePrices) ? market.outcomePrices : JSON.parse(market.outcomePrices || '[]');
  const yes = toNumber(outcomePrices?.[0]);
  if (yes !== null) return yes;
  const fallback = toNumber(market.lastTradePrice);
  return fallback !== null ? fallback : null;
}

function getShift24h(market) {
  return toNumber(market.oneDayPriceChange ?? market.priceChange24h ?? market.price_change_24h);
}

function isCryptoMarket(market) {
  const searchable = [
    market?.question,
    market?.slug,
    market?.description,
    market?.category,
    ...(Array.isArray(market?.tags) ? market.tags : []),
    ...(Array.isArray(market?.events)
      ? market.events.flatMap((event) => [event?.title, event?.slug, ...(Array.isArray(event?.tags) ? event.tags : [])])
      : [])
  ]
    .filter((value) => typeof value === 'string' && value.trim())
    .join(' ')
    .toLowerCase();

  return CRYPTO_KEYWORDS.some((keyword) => searchable.includes(keyword));
}

function renderMarket(market) {
  const prob = getYesProbability(market);
  const shift = getShift24h(market);
  const liquidity = toNumber(market.liquidity ?? market.liquidityNum);
  const volume = toNumber(market.volume24hr ?? market.volume24h ?? market.volume24);

  probabilityEl.textContent = prob !== null ? pct.format(prob) : 'N/D';
  shiftEl.textContent = shift !== null ? `${shift > 0 ? '+' : ''}${pct.format(shift)}` : 'N/D';
  shiftEl.className = 'metric-value';
  if (shift !== null) shiftEl.classList.add(shift >= 0 ? 'up' : 'down');

  liquidityEl.textContent = liquidity !== null ? money.format(liquidity) : 'N/D';
  volumeEl.textContent = volume !== null ? money.format(volume) : 'N/D';

  const spread = toNumber(market.spread);
  const yesPrice = prob !== null ? prob : null;
  const noPrice = yesPrice !== null ? 1 - yesPrice : null;
  const endDate = market.endDate ? new Date(market.endDate).toLocaleString() : 'No disponible';

  highlightsEl.innerHTML = '';
  const items = [
    `Mercado: ${market.question || market.slug || 'Sin título'}`,
    `Resolución estimada: ${endDate}`,
    `Precio implícito No: ${noPrice !== null ? pct.format(noPrice) : 'N/D'}`,
    `Spread reportado: ${spread !== null ? pct.format(spread) : 'N/D'}`,
    `Volumen total: ${toNumber(market.volume ?? market.volumeNum) !== null ? money.format(toNumber(market.volume ?? market.volumeNum)) : 'N/D'}`
  ];

  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    highlightsEl.appendChild(li);
  }
}

async function loadMarkets() {
  statusEl.textContent = 'Consultando datos de Polymarket...';
  try {
    const res = await fetch('/api/polymarket?limit=50');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    markets = (payload.markets || []).filter(isCryptoMarket);

    if (!markets.length) throw new Error('No se recibieron mercados');

    selectEl.innerHTML = '';
    markets.forEach((market, idx) => {
      const option = document.createElement('option');
      option.value = String(idx);
      option.textContent = market.question || market.slug || `Mercado ${idx + 1}`;
      selectEl.appendChild(option);
    });

    renderMarket(markets[0]);
    statusEl.textContent = payload.source === 'fallback'
      ? 'Mostrando datos de demostración (fallback por límite de API).'
      : `Datos en vivo: ${markets.length} mercados de criptomonedas cargados.`;
  } catch (err) {
    statusEl.textContent = `Error al cargar mercados: ${err.message}`;
  }
}

selectEl.addEventListener('change', (event) => {
  const market = markets[Number(event.target.value)];
  if (market) renderMarket(market);
});

refreshBtn.addEventListener('click', loadMarkets);

loadMarkets();

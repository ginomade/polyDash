const FALLBACK_MARKETS = [
  {
    question: 'Will BTC finish the day above $100k?',
    slug: 'btc-above-100k-eod',
    liquidity: 345000,
    volume24hr: 91000,
    volume: 1260000,
    oneDayPriceChange: 0.045,
    outcomePrices: [0.62, 0.38],
    spread: 0.02,
    endDate: '2026-04-11T00:00:00.000Z'
  }
];

const CRYPTO_KEYWORDS = [
  'crypto',
  'cryptocurrency',
  'bitcoin',
  'btc',
  'ethereum',
  'eth',
  'solana',
  'sol',
  'doge',
  'xrp',
  'bnb'
];

function normalizeText(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function hasCryptoKeyword(text) {
  return CRYPTO_KEYWORDS.some((keyword) => text.includes(keyword));
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
    .map(normalizeText)
    .filter(Boolean)
    .join(' ');

  return hasCryptoKeyword(searchable);
}

exports.handler = async (event) => {
  const limit = Number(event.queryStringParameters?.limit || 50);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50;

  try {
    const apiRes = await fetch(`https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=${safeLimit}`, {
      headers: {
        'accept': 'application/json',
        'user-agent': 'poly-dash-netlify-demo/1.0'
      }
    });

    if (!apiRes.ok) {
      throw new Error(`Gamma API respondió ${apiRes.status}`);
    }

    const data = await apiRes.json();
    const markets = (Array.isArray(data) ? data : data?.markets || []).filter(isCryptoMarket);

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ source: 'live', markets })
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        source: 'fallback',
        warning: error.message,
        markets: FALLBACK_MARKETS
      })
    };
  }
};

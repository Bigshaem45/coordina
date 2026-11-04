const NIGERIA_STATE_NAMES: Record<string, string> = {
  FC: 'Abuja (FCT)',
  LA: 'Lagos',
  RI: 'Rivers',
  OY: 'Oyo',
  KN: 'Kano',
  KD: 'Kaduna',
  EN: 'Enugu',
  AN: 'Anambra',
  DE: 'Delta',
  ED: 'Edo',
  OG: 'Ogun',
  OS: 'Osun',
  ON: 'Ondo',
  EK: 'Ekiti',
  KW: 'Kwara',
  PL: 'Plateau',
  AK: 'Akwa Ibom',
  CR: 'Cross River',
  IM: 'Imo',
  AB: 'Abia',
  EB: 'Ebonyi',
  BE: 'Benue',
  KO: 'Kogi',
  NA: 'Nasarawa',
  NI: 'Niger',
  BA: 'Bauchi',
  GO: 'Gombe',
  AD: 'Adamawa',
  TA: 'Taraba',
  BO: 'Borno',
  YO: 'Yobe',
  JI: 'Jigawa',
  KT: 'Katsina',
  ZA: 'Zamfara',
  SO: 'Sokoto',
  KE: 'Kebbi',
  BY: 'Bayelsa',
};

function resolveCountryName(code: string): string {
  const upper = (code || '').trim().toUpperCase();
  if (!upper) return '';
  try {
    const dn = new Intl.DisplayNames(['en'], { type: 'region' });
    return dn.of(upper) || upper;
  } catch {
    return upper;
  }
}

function isPrivateOrLoopbackIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.trim();
  return (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    clean.startsWith('172.16.') ||
    clean.startsWith('fc00:') ||
    clean.startsWith('fe80:')
  );
}

function extractClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  return req.socket?.remoteAddress || '';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  const clientIp = extractClientIp(req);
  const vercelCountry = String(req.headers?.['x-vercel-ip-country'] || '').trim().toUpperCase();
  const vercelRegionRaw = String(req.headers?.['x-vercel-ip-country-region'] || '')
    .trim()
    .toUpperCase();
  const vercelCityRaw = String(req.headers?.['x-vercel-ip-city'] || '').trim();

  if (vercelCountry) {
    let decodedCity = vercelCityRaw;
    try {
      decodedCity = decodeURIComponent(vercelCityRaw);
    } catch {
      decodedCity = vercelCityRaw;
    }

    const regionName =
      vercelCountry === 'NG' && NIGERIA_STATE_NAMES[vercelRegionRaw]
        ? NIGERIA_STATE_NAMES[vercelRegionRaw]
        : vercelRegionRaw;

    return res.status(200).json({
      status: true,
      geo: {
        ip: clientIp || 'Edge Verified',
        countryCode: vercelCountry,
        countryName: resolveCountryName(vercelCountry),
        regionCode: vercelRegionRaw,
        regionName,
        city: decodedCity,
        source: 'vercel-edge',
        detectedAt: Date.now(),
      },
    });
  }

  // Fallback for local/non-edge environments: lookup public IP geolocation
  try {
    const targetPath = isPrivateOrLoopbackIp(clientIp) ? '' : encodeURIComponent(clientIp);
    const r = await fetch(`https://ipwho.is/${targetPath}`, {
      headers: { Accept: 'application/json' },
    });
    const data: any = await r.json();
    if (data && data.success !== false && data.country_code) {
      const cc = String(data.country_code).toUpperCase();
      const rc = String(data.region_code || '').toUpperCase();
      return res.status(200).json({
        status: true,
        geo: {
          ip: String(data.ip || clientIp || ''),
          countryCode: cc,
          countryName: String(data.country || resolveCountryName(cc)),
          regionCode: rc,
          regionName:
            cc === 'NG' && NIGERIA_STATE_NAMES[rc]
              ? NIGERIA_STATE_NAMES[rc]
              : String(data.region || rc),
          city: String(data.city || ''),
          source: 'ipwhois-server',
          detectedAt: Date.now(),
        },
      });
    }
  } catch (err) {
    console.error('[COORDINA /api/geo primary fallback error]:', err);
  }

  try {
    const targetPath = isPrivateOrLoopbackIp(clientIp)
      ? 'https://ipapi.co/json/'
      : `https://ipapi.co/${encodeURIComponent(clientIp)}/json/`;
    const r = await fetch(targetPath, {
      headers: { Accept: 'application/json', 'User-Agent': 'coordina-geo-check/1.0' },
    });
    const data: any = await r.json();
    if (data && data.country_code) {
      const cc = String(data.country_code).toUpperCase();
      const rc = String(data.region_code || '').toUpperCase();
      return res.status(200).json({
        status: true,
        geo: {
          ip: String(data.ip || clientIp || ''),
          countryCode: cc,
          countryName: String(data.country_name || resolveCountryName(cc)),
          regionCode: rc,
          regionName:
            cc === 'NG' && NIGERIA_STATE_NAMES[rc]
              ? NIGERIA_STATE_NAMES[rc]
              : String(data.region || rc),
          city: String(data.city || ''),
          source: 'ipapi-server',
          detectedAt: Date.now(),
        },
      });
    }
  } catch (err) {
    console.error('[COORDINA /api/geo secondary fallback error]:', err);
  }

  return res.status(200).json({
    status: false,
    message: 'Unable to resolve IP region at this moment.',
  });
}

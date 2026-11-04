import { useEffect, useState } from 'react';
import type { RegionRestriction } from '../types';
import { reportError } from './errors';

export interface VisitorGeo {
  ip: string;
  countryCode: string;
  countryName: string;
  regionCode: string;
  regionName: string;
  city: string;
  source: string;
  detectedAt: number;
}

export interface RegionPreset {
  id: string;
  title: string;
  subtitle: string;
  restriction: Omit<RegionRestriction, 'enabled'>;
}

export const SUPPORTED_COUNTRIES: { code: string; name: string }[] = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'SN', name: 'Senegal' },
  { code: 'BJ', name: 'Benin' },
  { code: 'TG', name: 'Togo' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'EG', name: 'Egypt' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
];

export const NIGERIAN_STATES: { code: string; name: string }[] = [
  { code: 'FC', name: 'Abuja (FCT)' },
  { code: 'LA', name: 'Lagos' },
  { code: 'RI', name: 'Rivers (Port Harcourt)' },
  { code: 'OY', name: 'Oyo (Ibadan)' },
  { code: 'OG', name: 'Ogun' },
  { code: 'KN', name: 'Kano' },
  { code: 'KD', name: 'Kaduna' },
  { code: 'EN', name: 'Enugu' },
  { code: 'AN', name: 'Anambra' },
  { code: 'DE', name: 'Delta' },
  { code: 'ED', name: 'Edo (Benin City)' },
  { code: 'AK', name: 'Akwa Ibom (Uyo)' },
  { code: 'CR', name: 'Cross River (Calabar)' },
  { code: 'IM', name: 'Imo (Owerri)' },
  { code: 'PL', name: 'Plateau (Jos)' },
  { code: 'KW', name: 'Kwara (Ilorin)' },
  { code: 'OS', name: 'Osun' },
  { code: 'ON', name: 'Ondo' },
  { code: 'EK', name: 'Ekiti' },
  { code: 'NA', name: 'Nasarawa' },
  { code: 'NI', name: 'Niger' },
  { code: 'KO', name: 'Kogi' },
  { code: 'BE', name: 'Benue' },
  { code: 'AB', name: 'Abia' },
  { code: 'EB', name: 'Ebonyi' },
  { code: 'BY', name: 'Bayelsa' },
  { code: 'BA', name: 'Bauchi' },
  { code: 'GO', name: 'Gombe' },
  { code: 'AD', name: 'Adamawa' },
  { code: 'TA', name: 'Taraba' },
  { code: 'BO', name: 'Borno' },
  { code: 'YO', name: 'Yobe' },
  { code: 'JI', name: 'Jigawa' },
  { code: 'KT', name: 'Katsina' },
  { code: 'ZA', name: 'Zamfara' },
  { code: 'SO', name: 'Sokoto' },
  { code: 'KE', name: 'Kebbi' },
];

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: 'abuja_fct',
    title: 'Abuja (FCT) Only',
    subtitle: 'Only attendees with an Abuja / FCT IP can buy tickets',
    restriction: {
      mode: 'state',
      label: 'Abuja (FCT), Nigeria',
      allowedCountries: ['NG'],
      allowedStates: ['Abuja (FCT)', 'FC'],
    },
  },
  {
    id: 'lagos_state',
    title: 'Lagos State Only',
    subtitle: 'Only attendees with a Lagos IP can buy tickets',
    restriction: {
      mode: 'state',
      label: 'Lagos State, Nigeria',
      allowedCountries: ['NG'],
      allowedStates: ['Lagos', 'LA'],
    },
  },
  {
    id: 'nigeria_only',
    title: 'Nigeria Nationwide',
    subtitle: 'Allow all 36 states & FCT; block foreign IPs & bots',
    restriction: {
      mode: 'country',
      label: 'Nigeria (All States & FCT)',
      allowedCountries: ['NG'],
    },
  },
  {
    id: 'rivers_ph',
    title: 'Rivers / Port Harcourt Only',
    subtitle: 'Restrict purchases to Rivers State IPs',
    restriction: {
      mode: 'state',
      label: 'Rivers State, Nigeria',
      allowedCountries: ['NG'],
      allowedStates: ['Rivers', 'RI', 'Port Harcourt'],
    },
  },
  {
    id: 'west_africa',
    title: 'West Africa Hub',
    subtitle: 'Nigeria, Ghana, Côte d’Ivoire, Senegal, Benin & Togo',
    restriction: {
      mode: 'multi',
      label: 'West Africa (NG, GH, CI, SN, BJ, TG)',
      allowedCountries: ['NG', 'GH', 'CI', 'SN', 'BJ', 'TG'],
    },
  },
  {
    id: 'uk_only',
    title: 'United Kingdom Only',
    subtitle: 'Exclusive to UK IP addresses (diaspora showcases)',
    restriction: {
      mode: 'country',
      label: 'United Kingdom',
      allowedCountries: ['GB'],
    },
  },
  {
    id: 'us_canada',
    title: 'US & Canada Only',
    subtitle: 'Exclusive to North American IP addresses',
    restriction: {
      mode: 'multi',
      label: 'United States & Canada',
      allowedCountries: ['US', 'CA'],
    },
  },
];

const NIGERIA_REGION_ALIASES: Record<string, string[]> = {
  FC: ['fct', 'abuja', 'federal capital territory', 'abuja fct', 'ng-fc'],
  LA: ['lagos', 'lagos state', 'ikeja', 'lekki', 'victoria island', 'ikoyi', 'yaba', 'surulere', 'ng-la'],
  RI: ['rivers', 'rivers state', 'port harcourt', 'ph', 'ng-ri'],
  OY: ['oyo', 'oyo state', 'ibadan', 'ng-oy'],
  KN: ['kano', 'kano state', 'ng-kn'],
  KD: ['kaduna', 'kaduna state', 'ng-kd'],
  EN: ['enugu', 'enugu state', 'ng-en'],
  AN: ['anambra', 'anambra state', 'awka', 'onitsha', 'ng-an'],
  DE: ['delta', 'delta state', 'asaba', 'warri', 'ng-de'],
  ED: ['edo', 'edo state', 'benin', 'benin city', 'ng-ed'],
  OG: ['ogun', 'ogun state', 'abeokuta', 'ng-og'],
  OS: ['osun', 'osun state', 'osogbo', 'ife', 'ng-os'],
  ON: ['ondo', 'ondo state', 'akure', 'ng-on'],
  EK: ['ekiti', 'ekiti state', 'ado ekiti', 'ng-ek'],
  KW: ['kwara', 'kwara state', 'ilorin', 'ng-kw'],
  PL: ['plateau', 'plateau state', 'jos', 'ng-pl'],
  AK: ['akwa ibom', 'uyo', 'ng-ak'],
  CR: ['cross river', 'calabar', 'ng-cr'],
  IM: ['imo', 'imo state', 'owerri', 'ng-im'],
  AB: ['abia', 'abia state', 'umuahia', 'aba', 'ng-ab'],
  EB: ['ebonyi', 'abakaliki', 'ng-eb'],
  BE: ['benue', 'makurdi', 'ng-be'],
  KO: ['kogi', 'lokoja', 'ng-ko'],
  NA: ['nasarawa', 'lafia', 'ng-na'],
  NI: ['niger', 'minna', 'ng-ni'],
  BA: ['bauchi', 'ng-ba'],
  GO: ['gombe', 'ng-go'],
  AD: ['adamawa', 'yola', 'ng-ad'],
  TA: ['taraba', 'jalingo', 'ng-ta'],
  BO: ['borno', 'maiduguri', 'ng-bo'],
  YO: ['yobe', 'damaturu', 'ng-yo'],
  JI: ['jigawa', 'dutse', 'ng-ji'],
  KT: ['katsina', 'ng-kt'],
  ZA: ['zamfara', 'gusau', 'ng-za'],
  SO: ['sokoto', 'ng-so'],
  KE: ['kebbi', 'birnin kebbi', 'ng-ke'],
  BY: ['bayelsa', 'yenagoa', 'ng-by'],
};

function norm(s: string | undefined | null): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandTargetAliases(token: string): string[] {
  const clean = norm(token);
  if (!clean) return [];
  const results = new Set<string>([clean]);
  for (const [code, aliases] of Object.entries(NIGERIA_REGION_ALIASES)) {
    const lcCode = code.toLowerCase();
    if (clean === lcCode || aliases.some((a) => norm(a) === clean || clean.includes(norm(a)))) {
      results.add(lcCode);
      for (const a of aliases) results.add(norm(a));
    }
  }
  return Array.from(results);
}

function expandBuyerTokens(geo: VisitorGeo): string[] {
  const tokens = new Set<string>();
  const rc = (geo.regionCode || '').toUpperCase().replace(/^[A-Z]{2}-/, '').trim();
  const rn = norm(geo.regionName);
  const ct = norm(geo.city);

  if (rc) tokens.add(rc.toLowerCase());
  if (rn) tokens.add(rn);
  if (ct) tokens.add(ct);

  if (geo.countryCode.toUpperCase() === 'NG') {
    if (rc && NIGERIA_REGION_ALIASES[rc]) {
      for (const a of NIGERIA_REGION_ALIASES[rc]) tokens.add(norm(a));
    }
    for (const [code, aliases] of Object.entries(NIGERIA_REGION_ALIASES)) {
      if (
        (rn && aliases.some((a) => rn === norm(a) || rn.includes(norm(a)))) ||
        (ct && aliases.some((a) => ct === norm(a)))
      ) {
        tokens.add(code.toLowerCase());
        for (const a of aliases) tokens.add(norm(a));
      }
    }
  }

  return Array.from(tokens).filter(Boolean);
}

export function formatVisitorLocation(geo?: VisitorGeo | null): string {
  if (!geo || !geo.countryCode) return 'Detecting IP region…';
  const parts = [geo.city, geo.regionName || geo.regionCode, geo.countryName || geo.countryCode]
    .map((p) => (p || '').trim())
    .filter(Boolean);
  const deduped: string[] = [];
  for (const p of parts) {
    if (!deduped.some((e) => e.toLowerCase() === p.toLowerCase())) {
      deduped.push(p);
    }
  }
  return deduped.join(', ') || geo.countryCode.toUpperCase();
}

export function evaluateEventRegionAccess(
  restriction: RegionRestriction | undefined | null,
  geo: VisitorGeo | null
): {
  restricted: boolean;
  allowed: boolean;
  reason?: string;
  userLocationLabel: string;
} {
  const userLocationLabel = formatVisitorLocation(geo);

  if (!restriction || !restriction.enabled) {
    return {
      restricted: false,
      allowed: true,
      userLocationLabel,
    };
  }

  if (!geo || !geo.countryCode) {
    return {
      restricted: true,
      allowed: false,
      reason: `Ticket purchases are restricted to ${restriction.label}. Confirming your IP region…`,
      userLocationLabel,
    };
  }

  const buyerCountry = geo.countryCode.trim().toUpperCase();
  const allowedCountries = (restriction.allowedCountries || [])
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (allowedCountries.length > 0 && !allowedCountries.includes(buyerCountry)) {
    return {
      restricted: true,
      allowed: false,
      reason: `Ticket sales for this event are restricted to ${restriction.label}. Your IP location (${userLocationLabel}) is outside the permitted region.`,
      userLocationLabel,
    };
  }

  const stateTargets = (restriction.allowedStates || []).map((s) => s.trim()).filter(Boolean);
  const cityTargets = (restriction.allowedCities || []).map((c) => c.trim()).filter(Boolean);

  if (stateTargets.length > 0 || cityTargets.length > 0) {
    const buyerTokens = expandBuyerTokens(geo);

    const stateMatched =
      stateTargets.length === 0 ||
      stateTargets.some((target) => {
        const targetAliases = expandTargetAliases(target);
        return targetAliases.some((alias) =>
          buyerTokens.some(
            (bt) =>
              bt === alias ||
              (alias.length >= 4 && bt.includes(alias)) ||
              (bt.length >= 4 && alias.includes(bt))
          )
        );
      });

    const cityMatched =
      cityTargets.length === 0 ||
      cityTargets.some((target) => {
        const cleanCity = norm(target);
        return buyerTokens.some(
          (bt) => bt === cleanCity || (cleanCity.length >= 4 && bt.includes(cleanCity))
        );
      });

    const subRegionOk =
      stateTargets.length > 0 && cityTargets.length > 0
        ? stateMatched || cityMatched
        : stateMatched && cityMatched;

    if (!subRegionOk) {
      return {
        restricted: true,
        allowed: false,
        reason: `Ticket sales for this event are restricted to ${restriction.label}. Your IP location (${userLocationLabel}) is outside this region.`,
        userLocationLabel,
      };
    }
  }

  return {
    restricted: true,
    allowed: true,
    userLocationLabel,
  };
}

export function toConvexBuyerGeo(geo: VisitorGeo | null) {
  if (!geo || !geo.countryCode) return undefined;
  return {
    ip: geo.ip || undefined,
    countryCode: geo.countryCode,
    countryName: geo.countryName || undefined,
    regionCode: geo.regionCode || undefined,
    regionName: geo.regionName || undefined,
    city: geo.city || undefined,
  };
}

export function isUserCoordinaPlus(user: any): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const org = user.organizer;
  if (!org) return false;
  if (org.coordinaPlusExpiresAt && org.coordinaPlusExpiresAt < Date.now()) {
    return false;
  }
  return Boolean(
    org.isCoordinaPlus ||
      org.coordinaPlus === true ||
      org.tier === 'coordina_plus' ||
      org.tier === 'enterprise' ||
      org.tier === 'verified_pro'
  );
}

let cachedGeo: VisitorGeo | null = null;
let inFlightGeo: Promise<VisitorGeo | null> | null = null;
const geoListeners = new Set<(geo: VisitorGeo | null) => void>();

function notifyGeoListeners(geo: VisitorGeo | null) {
  for (const fn of geoListeners) {
    try {
      fn(geo);
    } catch (err) {
      reportError('GeoListener', err);
    }
  }
}

const CACHE_TTL_MS = 5 * 60 * 1000;

export async function detectVisitorGeo(forceRefresh = false): Promise<VisitorGeo | null> {
  if (!forceRefresh && cachedGeo && Date.now() - cachedGeo.detectedAt < CACHE_TTL_MS) {
    return cachedGeo;
  }

  if (!forceRefresh && inFlightGeo) {
    return inFlightGeo;
  }

  inFlightGeo = (async () => {
    // 1. Primary: Vercel Edge Serverless Endpoint (/api/geo)
    try {
      const r = await fetch(`/api/geo?t=${Date.now()}`, {
        headers: { Accept: 'application/json' },
      });
      const contentType = r.headers.get('content-type') || '';
      if (r.ok && contentType.includes('application/json')) {
        const json = await r.json();
        if (json?.status && json?.geo?.countryCode) {
          cachedGeo = json.geo as VisitorGeo;
          notifyGeoListeners(cachedGeo);
          return cachedGeo;
        }
      }
    } catch (err) {
      reportError('GeoIP /api/geo', err);
    }

    // 2. Fallback for local Vite dev / mobile Capacitor runtime: ipwho.is
    try {
      const r = await fetch('https://ipwho.is/', {
        headers: { Accept: 'application/json' },
      });
      if (r.ok) {
        const data: any = await r.json();
        if (data && data.success !== false && data.country_code) {
          const cc = String(data.country_code).toUpperCase();
          const rc = String(data.region_code || '').toUpperCase();
          const ngState = NIGERIAN_STATES.find((s) => s.code === rc);
          cachedGeo = {
            ip: String(data.ip || ''),
            countryCode: cc,
            countryName: String(data.country || cc),
            regionCode: rc,
            regionName: cc === 'NG' && ngState ? ngState.name : String(data.region || rc),
            city: String(data.city || ''),
            source: 'ipwhois-client',
            detectedAt: Date.now(),
          };
          notifyGeoListeners(cachedGeo);
          return cachedGeo;
        }
      }
    } catch (err) {
      reportError('GeoIP ipwho.is', err);
    }

    // 3. Secondary HTTPS fallback: ipapi.co
    try {
      const r = await fetch('https://ipapi.co/json/', {
        headers: { Accept: 'application/json' },
      });
      if (r.ok) {
        const data: any = await r.json();
        if (data && data.country_code) {
          const cc = String(data.country_code).toUpperCase();
          const rc = String(data.region_code || '').toUpperCase();
          const ngState = NIGERIAN_STATES.find((s) => s.code === rc);
          cachedGeo = {
            ip: String(data.ip || ''),
            countryCode: cc,
            countryName: String(data.country_name || cc),
            regionCode: rc,
            regionName: cc === 'NG' && ngState ? ngState.name : String(data.region || rc),
            city: String(data.city || ''),
            source: 'ipapi-client',
            detectedAt: Date.now(),
          };
          notifyGeoListeners(cachedGeo);
          return cachedGeo;
        }
      }
    } catch (err) {
      reportError('GeoIP ipapi.co', err);
    }

    return cachedGeo;
  })().finally(() => {
    inFlightGeo = null;
  });

  return inFlightGeo;
}

export function useVisitorGeo(active = true) {
  const [geo, setGeo] = useState<VisitorGeo | null>(cachedGeo);
  const [loading, setLoading] = useState<boolean>(active && !cachedGeo);

  useEffect(() => {
    const listener = (next: VisitorGeo | null) => {
      setGeo(next);
      setLoading(false);
    };
    geoListeners.add(listener);

    if (active && !cachedGeo) {
      setLoading(true);
      detectVisitorGeo(false).finally(() => setLoading(false));
    }

    return () => {
      geoListeners.delete(listener);
    };
  }, [active]);

  const refreshGeo = async () => {
    setLoading(true);
    try {
      const fresh = await detectVisitorGeo(true);
      setGeo(fresh);
      return fresh;
    } finally {
      setLoading(false);
    }
  };

  return { geo, loading, refreshGeo };
}


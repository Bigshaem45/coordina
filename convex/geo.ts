import { v } from 'convex/values';

export const regionRestrictionValidator = v.object({
  enabled: v.boolean(),
  mode: v.union(v.literal('country'), v.literal('state'), v.literal('multi')),
  label: v.string(),
  allowedCountries: v.array(v.string()),
  allowedStates: v.optional(v.array(v.string())),
  allowedCities: v.optional(v.array(v.string())),
});

export const buyerGeoValidator = v.object({
  ip: v.optional(v.string()),
  countryCode: v.string(),
  countryName: v.optional(v.string()),
  regionCode: v.optional(v.string()),
  regionName: v.optional(v.string()),
  city: v.optional(v.string()),
});

export interface RegionRestrictionDoc {
  enabled: boolean;
  mode: 'country' | 'state' | 'multi';
  label: string;
  allowedCountries: string[];
  allowedStates?: string[];
  allowedCities?: string[];
}

export interface BuyerGeoInput {
  ip?: string;
  countryCode: string;
  countryName?: string;
  regionCode?: string;
  regionName?: string;
  city?: string;
}

/**
 * ISO-3166-2 Nigerian subdivision codes -> canonical aliases for accurate matching
 * across Vercel Edge headers (e.g. "FC", "LA") and IP geo providers ("Federal Capital Territory", "Abuja").
 */
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

function expandBuyerTokens(geo: BuyerGeoInput): string[] {
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

export function isOrganizerCoordinaPlus(org: any): boolean {
  if (!org) return false;
  if (org.coordinaPlusExpiresAt && org.coordinaPlusExpiresAt < Date.now()) {
    return false;
  }
  return Boolean(
    org.coordinaPlus === true ||
      org.tier === 'coordina_plus' ||
      org.tier === 'enterprise' ||
      org.tier === 'verified_pro'
  );
}

export function formatBuyerLocation(geo?: BuyerGeoInput | null): string {
  if (!geo || !geo.countryCode) return 'Unknown IP region';
  const parts = [geo.city, geo.regionName || geo.regionCode, geo.countryName || geo.countryCode]
    .map((p) => (p || '').trim())
    .filter(Boolean);
  // Deduplicate adjacent identical labels like "Lagos, Lagos, Nigeria"
  const deduped: string[] = [];
  for (const p of parts) {
    if (!deduped.some((existing) => existing.toLowerCase() === p.toLowerCase())) {
      deduped.push(p);
    }
  }
  return deduped.join(', ') || geo.countryCode.toUpperCase();
}

export function checkBuyerGeoAllowed(
  restriction: RegionRestrictionDoc | undefined | null,
  buyerGeo: BuyerGeoInput | undefined | null
): { allowed: boolean; reason?: string } {
  if (!restriction || !restriction.enabled) {
    return { allowed: true };
  }

  if (!buyerGeo || !buyerGeo.countryCode) {
    return {
      allowed: false,
      reason: `Ticket purchases for this event are restricted to ${restriction.label}. Please allow IP region verification (and disable ad/script blockers on geo lookup) to continue.`,
    };
  }

  const buyerCountry = buyerGeo.countryCode.trim().toUpperCase();
  const allowedCountries = (restriction.allowedCountries || [])
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  if (allowedCountries.length > 0 && !allowedCountries.includes(buyerCountry)) {
    return {
      allowed: false,
      reason: `Ticket sales are restricted to ${restriction.label}. Your IP location (${formatBuyerLocation(
        buyerGeo
      )}) is outside the permitted region.`,
    };
  }

  const stateTargets = (restriction.allowedStates || []).map((s) => s.trim()).filter(Boolean);
  const cityTargets = (restriction.allowedCities || []).map((c) => c.trim()).filter(Boolean);

  if (stateTargets.length > 0 || cityTargets.length > 0) {
    const buyerTokens = expandBuyerTokens(buyerGeo);

    const stateMatched =
      stateTargets.length === 0 ||
      stateTargets.some((target) => {
        const targetAliases = expandTargetAliases(target);
        return targetAliases.some((alias) =>
          buyerTokens.some(
            (bt) => bt === alias || (alias.length >= 4 && bt.includes(alias)) || (bt.length >= 4 && alias.includes(bt))
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

    // When both states and cities are provided in custom rules, matching either target qualifies
    const subRegionOk =
      stateTargets.length > 0 && cityTargets.length > 0
        ? stateMatched || cityMatched
        : stateMatched && cityMatched;

    if (!subRegionOk) {
      return {
        allowed: false,
        reason: `Ticket sales are restricted to ${restriction.label}. Your IP location (${formatBuyerLocation(
          buyerGeo
        )}) is outside this region.`,
      };
    }
  }

  return { allowed: true };
}


import { describe, expect, it } from 'vitest';
import { evaluateEventRegionAccess, REGION_PRESETS, type VisitorGeo } from './geo';
import type { RegionRestriction } from '../types';

const makeGeo = (overrides: Partial<VisitorGeo>): VisitorGeo => ({
  ip: '102.89.40.11',
  countryCode: 'NG',
  countryName: 'Nigeria',
  regionCode: 'FC',
  regionName: 'Abuja (FCT)',
  city: 'Abuja',
  source: 'vercel-edge',
  detectedAt: Date.now(),
  ...overrides,
});

describe('COORDINA Plus IP Region Lock enforcement', () => {
  it('allows global buyers when regionRestriction is disabled or undefined', () => {
    const londonGeo = makeGeo({
      countryCode: 'GB',
      countryName: 'United Kingdom',
      regionCode: 'ENG',
      regionName: 'England',
      city: 'London',
    });
    expect(evaluateEventRegionAccess(undefined, londonGeo).allowed).toBe(true);
    expect(
      evaluateEventRegionAccess(
        {
          enabled: false,
          mode: 'country',
          label: 'Nigeria',
          allowedCountries: ['NG'],
        },
        londonGeo
      ).allowed
    ).toBe(true);
  });

  it('fails closed when an event is region-locked and IP geolocation is unavailable', () => {
    const abujaPreset = REGION_PRESETS.find((p) => p.id === 'abuja_fct')!;
    const res = evaluateEventRegionAccess({ enabled: true, ...abujaPreset.restriction }, null);
    expect(res.restricted).toBe(true);
    expect(res.allowed).toBe(false);
  });

  it('enforces Abuja (FCT) Only across both ISO-3166-2 (FC) and full region names, blocking Lagos & foreign IPs', () => {
    const rule: RegionRestriction = {
      enabled: true,
      ...REGION_PRESETS.find((p) => p.id === 'abuja_fct')!.restriction,
    };

    // Vercel Edge header style (FC)
    expect(
      evaluateEventRegionAccess(
        rule,
        makeGeo({ countryCode: 'NG', regionCode: 'FC', regionName: '', city: 'Wuse' })
      ).allowed
    ).toBe(true);

    // Public Geo API style ("Federal Capital Territory")
    expect(
      evaluateEventRegionAccess(
        rule,
        makeGeo({
          countryCode: 'NG',
          regionCode: '',
          regionName: 'Federal Capital Territory',
          city: 'Abuja',
        })
      ).allowed
    ).toBe(true);

    // Blocked: Lagos State buyer
    expect(
      evaluateEventRegionAccess(
        rule,
        makeGeo({
          countryCode: 'NG',
          regionCode: 'LA',
          regionName: 'Lagos',
          city: 'Ikeja',
        })
      ).allowed
    ).toBe(false);

    // Blocked: US buyer
    expect(
      evaluateEventRegionAccess(
        rule,
        makeGeo({
          countryCode: 'US',
          countryName: 'United States',
          regionCode: 'NY',
          regionName: 'New York',
          city: 'New York',
        })
      ).allowed
    ).toBe(false);
  });

  it('enforces Lagos State Only and blocks Abuja & UK buyers', () => {
    const rule: RegionRestriction = {
      enabled: true,
      ...REGION_PRESETS.find((p) => p.id === 'lagos_state')!.restriction,
    };

    expect(
      evaluateEventRegionAccess(
        rule,
        makeGeo({ countryCode: 'NG', regionCode: 'LA', regionName: 'Lagos', city: 'Lekki' })
      ).allowed
    ).toBe(true);

    expect(
      evaluateEventRegionAccess(
        rule,
        makeGeo({ countryCode: 'NG', regionCode: 'FC', regionName: 'Abuja (FCT)', city: 'Abuja' })
      ).allowed
    ).toBe(false);
  });

  it('enforces Nigeria Nationwide (NG) and West Africa multi-country presets', () => {
    const ngRule: RegionRestriction = {
      enabled: true,
      ...REGION_PRESETS.find((p) => p.id === 'nigeria_only')!.restriction,
    };
    const westAfricaRule: RegionRestriction = {
      enabled: true,
      ...REGION_PRESETS.find((p) => p.id === 'west_africa')!.restriction,
    };

    const phBuyer = makeGeo({
      countryCode: 'NG',
      regionCode: 'RI',
      regionName: 'Rivers',
      city: 'Port Harcourt',
    });
    const accraBuyer = makeGeo({
      countryCode: 'GH',
      countryName: 'Ghana',
      regionCode: 'AA',
      regionName: 'Greater Accra',
      city: 'Accra',
    });

    expect(evaluateEventRegionAccess(ngRule, phBuyer).allowed).toBe(true);
    expect(evaluateEventRegionAccess(ngRule, accraBuyer).allowed).toBe(false);
    expect(evaluateEventRegionAccess(westAfricaRule, accraBuyer).allowed).toBe(true);
  });
});


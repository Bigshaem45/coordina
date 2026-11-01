import type { RiskAssessment, RiskLevel, VerificationStatus } from '../types';

export const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 65,
};

export function calculateRiskAssessment(params: {
  isNewOrganizer: boolean;
  hasCacNumber: boolean;
  isBvnNinVerified: boolean;
  isVenueConfirmed: boolean;
  maxTicketPrice: number;
  startDate: string;
  hasFlyer: boolean;
  hasVenueAgreement: boolean;
  organizerTrustScore: number;
}): RiskAssessment {
  let score = 0;
  const reasons: string[] = [];
  const now = new Date();
  const eventDate = new Date(params.startDate);
  const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  const flags = {
    newOrganizer: false,
    highTicketValue: false,
    unverifiedVenue: false,
    shortNotice: false,
    missingDocumentation: false,
  };

  if (!params.hasCacNumber || !params.isBvnNinVerified) {
    score += 30;
    flags.missingDocumentation = true;
    reasons.push('Organizer missing Corporate Affairs Commission (CAC) or verified Director Identity');
  } else {
    reasons.push('Organizer verified with valid CAC registration & Director identity');
  }

  if (params.isNewOrganizer) {
    score += 15;
    flags.newOrganizer = true;
    reasons.push('First-time event organizer on COORDINA platform');
  }

  if (params.organizerTrustScore < 4.0) {
    score += 15;
    reasons.push(`Low historical organizer trust rating (${params.organizerTrustScore}/5.0)`);
  }

  if (!params.isVenueConfirmed) {
    score += 25;
    flags.unverifiedVenue = true;
    reasons.push('Venue representative has not yet confirmed the booking reservation');
  } else {
    reasons.push('Venue representative independently confirmed reservation & date match');
  }

  if (!params.hasVenueAgreement) {
    score += 15;
    flags.missingDocumentation = true;
    reasons.push('No written venue lease/receipt or authorization agreement attached');
  }

  if (params.maxTicketPrice >= 50000) {
    score += 10;
    flags.highTicketValue = true;
    reasons.push(`High-value ticket tiers detected (up to ₦${params.maxTicketPrice.toLocaleString()})`);
  }

  if (hoursUntilEvent > 0 && hoursUntilEvent < 72) {
    score += 15;
    flags.shortNotice = true;
    reasons.push(`Submitted on short notice (${Math.round(hoursUntilEvent)} hours before event start)`);
  }

  const finalScore = Math.min(100, Math.max(5, score));

  let level: RiskLevel = 'Low';
  if (finalScore > RISK_THRESHOLDS.MEDIUM) {
    level = 'High';
  } else if (finalScore > RISK_THRESHOLDS.LOW) {
    level = 'Medium';
  }

  return {
    score: finalScore,
    level,
    reasons,
    flags,
  };
}

/** Honest status badge styling — Unverified events are boldly marked Unverified */
export function getVerificationMeta(status?: VerificationStatus | string | null) {
  switch (status) {
    case 'Coordina Trusted':
      return {
        label: 'Coordina Trusted',
        icon: 'verified_user',
        tone: 'neon' as const,
        bg: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        dot: 'bg-indigo-500',
        desc: 'Official COORDINA flagship trust badge: KYC, camera biometric liveness, and direct venue confirmation completed.',
      };
    case 'Event Verified':
      return {
        label: 'Event Verified',
        icon: 'verified',
        tone: 'neon' as const,
        bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-500',
        desc: 'Organizer credentials, event flyer, and supporting documentation have been verified by COORDINA compliance officers.',
      };
    case 'Venue Confirmed':
      return {
        label: 'Venue Confirmed',
        icon: 'storefront',
        tone: 'amber' as const,
        bg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
        dot: 'bg-sky-500',
        desc: 'Venue management confirmed the event reservation directly via COORDINA remote token.',
      };
    case 'Organizer Verified':
      return {
        label: 'Organizer Verified',
        icon: 'badge',
        tone: 'brand' as const,
        bg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-500',
        desc: 'Organizer identity, CAC registration, and director liveness have been validated.',
      };
    case 'Verification Pending':
    case 'pending':
      return {
        label: 'Verification Pending',
        icon: 'hourglass_empty',
        tone: 'slate' as const,
        bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/35',
        dot: 'bg-amber-500',
        desc: 'Under active review by COORDINA compliance officers and awaiting venue confirmation.',
      };
    case 'Verification Rejected':
    case 'rejected':
      return {
        label: 'Verification Rejected',
        icon: 'gpp_bad',
        tone: 'coral' as const,
        bg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        dot: 'bg-rose-500',
        desc: 'Submission failed authenticity checks or contained conflicting booking documentation.',
      };
    case 'Event Suspended':
      return {
        label: 'Event Suspended',
        icon: 'block',
        tone: 'coral' as const,
        bg: 'bg-red-950/20 text-red-600 dark:text-red-400 border-red-500/40',
        dot: 'bg-red-600',
        desc: 'Event suspended following compliance review or venue dispute.',
      };
    case 'Unverified':
    default:
      return {
        label: 'Unverified',
        icon: 'gpp_maybe',
        tone: 'amber' as const,
        bg: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/45',
        dot: 'bg-amber-500',
        desc: 'This event has not yet completed COORDINA remote KYC and venue confirmation.',
      };
  }
}

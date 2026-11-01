import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { BottomSheet, Button } from '../../design-system/ui';
import { useAuth, useStore } from '../../store';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { toast } from '../../lib/fx';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

const REPORT_REASONS = [
  {
    id: 'fake_event',
    label: 'Fake or Fraudulent Event',
    desc: 'Suspected fake organizer or phantom event.',
  },
  {
    id: 'venue_mismatch',
    label: 'Venue Location Mismatch',
    desc: 'Venue has denied hosting or has no booking record.',
  },
  {
    id: 'scalping',
    label: 'Ticket Scalping / Extortion',
    desc: 'Overcharging or unauthorized secondary ticket resale.',
  },
  {
    id: 'cancelled',
    label: 'Cancelled Without Notification',
    desc: 'Event called off but still selling passes.',
  },
  {
    id: 'inappropriate',
    label: 'Safety or Regulatory Violation',
    desc: 'Violates safety guidelines or local regulations.',
  },
  { id: 'other', label: 'Other Concern', desc: 'Other compliance or trust issue.' },
] as const;

export default function ReportModal({
  open,
  onClose,
  eventId,
  eventTitle,
}: ReportModalProps) {
  const { user } = useAuth();
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const nav = useNavigate();
  const loc = useLocation();
  const [reason, setReason] =
    useState<(typeof REPORT_REASONS)[number]['id']>('fake_event');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      toast('Please log in to file a compliance report.');
      nav(`/auth?mode=signin&redirect=${encodeURIComponent(loc.pathname)}`);
      return;
    }
    if (!user.emailVerified) {
      onClose();
      toast('Verify your email before filing a compliance report.');
      setVerifyModalOpen(true);
      return;
    }
    if (!details.trim()) {
      toast('Please provide a brief description of the issue');
      return;
    }

    setSubmitting(true);
    try {
      await convex.mutation(api.reports.submitReport, {
        userId: user._id as any,
        eventId: eventId as any,
        eventTitle,
        reason,
        details: details.trim(),
      });
      toast('Report submitted. COORDINA Trust & Safety team is reviewing.');
      onClose();
      setDetails('');
    } catch (err: any) {
      toast(err?.message || 'Unable to submit report right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Report Event to Trust & Safety">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500">Event</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{eventTitle}</p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Select Issue Category
          </label>
          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  reason === r.id
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-950 dark:text-rose-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-midnight-900 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={r.id}
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold">{r.label}</p>
                  <p className="text-[11px] opacity-75">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Provide Specific Details
          </label>
          <textarea
            aria-label="Report details"
            rows={3}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Explain why this event is suspected to be fraudulent or violating policy..."
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-midnight-900 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
            <Icon name="shield" className="text-sm text-brand-500" />
            <span>Zero-Tolerance Fraud Policy</span>
          </div>
          <p className="mt-1 leading-relaxed">
            COORDINA investigates every report. Verified organizer escrows are frozen immediately if booking fraud is substantiated.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="coral"
            className="flex-1"
            disabled={submitting || !details.trim()}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}

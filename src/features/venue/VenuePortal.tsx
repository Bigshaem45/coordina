import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { Button, Card } from '../../design-system/ui';
import { Logo } from '../../design-system/Logo';
import { useStore } from '../../store';
import { toast } from '../../lib/fx';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';

export default function VenuePortal() {
  const { token } = useParams<{ token: string }>();
  const verifications = useStore((s) => s.verifications);
  const confirmVenue = useStore((s) => s.confirmVenueBooking);

  // Find verification matching token or fallback to the first active venue confirmation request
  const record = verifications.find((v) => v.venueConfirmation.token === token) ?? verifications[0];
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);
  const [decision, setDecision] = useState<'Confirmed' | 'Declined' | null>(null);

  const handleConfirm = async (confirmed: boolean) => {
    confirmVenue(record.venueConfirmation.token, confirmed, notes.trim() || undefined);
    try {
      await convex.mutation(api.verification.confirmVenueBooking, {
        token: record.venueConfirmation.token,
        status: confirmed ? 'confirmed' : 'disputed',
        notes: notes.trim() || undefined,
      });
    } catch (e) {
      console.warn('Convex venue confirmation sync:', e);
    }
    setDecision(confirmed ? 'Confirmed' : 'Declined');
    setDone(true);
    toast(confirmed ? 'Booking verified and confirmed!' : 'Booking declined. Notice sent to organizer.');
  };

  if (!record) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <Icon name="error_outline" className="text-4xl text-rose-500" />
        <h1 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">Invalid or Expired Token</h1>
        <p className="muted mt-1 text-xs">This venue confirmation link is invalid or has already expired.</p>
        <Link to="/" className="mt-4">
          <Button size="sm">Go to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:py-12">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <Logo size={28} />
        <span className="rounded-full bg-neon-500/15 px-3 py-1 text-xs font-semibold text-neon-600 dark:text-neon-400">
          Venue Representative Portal
        </span>
      </div>

      <div className="mt-6 text-left">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Booking Confirmation Request</h1>
        <p className="muted mt-1 text-xs leading-relaxed">
          The event organizer below submitted an event taking place at your venue. Please independently confirm or decline whether their reservation and hall booking are valid.
        </p>
      </div>

      {done ? (
        <Card className="mt-6 p-6 text-center">
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              decision === 'Confirmed'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
            }`}
          >
            <Icon name={decision === 'Confirmed' ? 'check_circle' : 'cancel'} className="text-3xl" filled />
          </span>
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
            {decision === 'Confirmed' ? 'Booking Confirmed Successfully' : 'Booking Declined'}
          </h2>
          <p className="muted mt-1 text-xs leading-relaxed">
            {decision === 'Confirmed'
              ? 'Thank you! Your confirmation has been logged to the COORDINA verification desk. The event now displays the Venue Confirmed badge.'
              : 'Thank you for protecting attendees against unconfirmed reservations. This event has been rejected from public ticket sales.'}
          </p>
          <div className="mt-6">
            <Link to="/home">
              <Button variant="outline" size="sm">Return to Platform</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {/* Reservation Specification Details */}
          <Card className="divide-y divide-slate-100 p-5 dark:divide-slate-800">
            <div className="pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500">Event Details</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{record.eventTitle}</h2>
              <p className="muted text-xs mt-0.5">Category: {record.category}</p>
            </div>

            <div className="py-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="muted">Organizer</span>
                <strong className="text-slate-900 dark:text-white">{record.organizerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="muted">Organizer CAC</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{record.organizerIdentity.cacNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Venue Requested</span>
                <strong className="text-slate-900 dark:text-white">{record.venueName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="muted">Location</span>
                <span className="text-slate-800 dark:text-slate-200">{record.area}, {record.city}</span>
              </div>
            </div>

            <div className="pt-3 text-xs">
              <span className="muted">Current Request Status:</span>{' '}
              <strong
                className={
                  record.venueConfirmation.status === 'Confirmed'
                    ? 'text-emerald-600'
                    : record.venueConfirmation.status === 'Declined'
                    ? 'text-rose-600'
                    : 'text-amber-600'
                }
              >
                {record.venueConfirmation.status}
              </strong>
            </div>
          </Card>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Venue Representative Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deposit received, hall booked for 7pm to 11pm"
              className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-midnight-900 dark:text-slate-100"
            />
          </div>

          {/* Decision Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              onClick={() => handleConfirm(false)}
            >
              <Icon name="close" className="text-sm" /> Decline Booking
            </Button>
            <Button size="lg" onClick={() => handleConfirm(true)}>
              <Icon name="check" className="text-sm" /> Confirm Booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


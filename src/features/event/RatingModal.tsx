import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { BottomSheet, Button, Chip } from '../../design-system/ui';
import { useAuth, useStore } from '../../store';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';
import { toast } from '../../lib/fx';

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  onRatingSubmitted?: (rating: number) => void;
}

const REVIEW_TAGS = [
  '🔥 Electric Vibe',
  '🎵 Top-Tier Sound & DJ',
  '🎟️ Rapid Gate Entry',
  '🍹 Excellent Bar & Drinks',
  '👥 Packed Crowd',
  '✨ Aesthetic Setup',
  '⏱️ Delayed Schedule',
  '🚗 Easy Parking',
];

export default function RatingModal({
  open,
  onClose,
  eventId,
  eventTitle,
  onRatingSubmitted,
}: RatingModalProps) {
  const { user } = useAuth();
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);
  const nav = useNavigate();
  const loc = useLocation();
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(['🔥 Electric Vibe']);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      toast('Please log in to rate this event.');
      nav(`/auth?mode=signin&redirect=${encodeURIComponent(loc.pathname)}`);
      return;
    }
    if (!user.emailVerified) {
      onClose();
      toast('Verify your email before posting a review.');
      setVerifyModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await convex.mutation(api.reports.submitRating, {
        eventId: eventId as any,
        userId: user._id as any,
        rating: stars,
        tags: selectedTags,
        review: review.trim() || undefined,
      });
      toast(`Thank you! Rated ${stars} stars.`);
      onRatingSubmitted?.(res.avgRating);
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Could not submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Rate Your Event Experience">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center">
          <p className="text-xs text-slate-500">How was your time at</p>
          <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
            {eventTitle}?
          </p>

          <div className="my-4 flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => {
              const active = (hoverStars || stars) >= num;
              return (
                <button
                  key={num}
                  type="button"
                  onMouseEnter={() => setHoverStars(num)}
                  onMouseLeave={() => setHoverStars(0)}
                  onClick={() => setStars(num)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  aria-label={`${num} star`}
                >
                  <Icon
                    name="star"
                    className={`text-3xl transition-colors ${
                      active ? 'text-amber-400' : 'text-slate-300 dark:text-slate-700'
                    }`}
                    filled={active}
                  />
                </button>
              );
            })}
          </div>
          <span className="inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            {stars === 5
              ? 'Incredible Experience 🌟'
              : stars === 4
                ? 'Great Vibes 👍'
                : stars === 3
                  ? 'Decent / Average 😐'
                  : stars === 2
                    ? 'Room for Improvement 👎'
                    : 'Disappointing Experience 💔'}
          </span>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            What stood out? (Select highlights)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {REVIEW_TAGS.map((t) => (
              <Chip key={t} active={selectedTags.includes(t)} onClick={() => toggleTag(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Written Note (Optional)
          </label>
          <textarea
            aria-label="Written review"
            rows={2}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share tips for future attendees or compliment the sound & venue..."
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Posting...' : !user ? 'Sign In & Rate' : 'Submit Rating'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}

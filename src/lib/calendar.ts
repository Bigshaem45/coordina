import type { CEvent } from '../types';
import { getSpace } from '../data/mock';
import { mapLink } from './format';

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function buildICS(events: CEvent[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//COORDINA//EN', 'CALSCALE:GREGORIAN'];
  for (const e of events) {
    const sp = getSpace(e.spaceId);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}-${Date.now()}@coordina.ng`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(e.end)}`,
      `SUMMARY:${e.title}`,
      `LOCATION:${sp ? `${sp.name}, ${e.area}` : e.area}`,
      `DESCRIPTION:${e.description} Map: ${mapLink(e)}`,
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Event in 2 hours', 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Event tomorrow', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(events: CEvent[]) {
  const blob = new Blob([buildICS(events)], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'coordina-itinerary.ics';
  a.click();
  URL.revokeObjectURL(a.href);
}

export const googleCalLink = (e: CEvent) =>
  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${stamp(e.start)}/${stamp(e.end)}&location=${encodeURIComponent(e.area)}&details=${encodeURIComponent(mapLink(e))}`;

export function whatsappItinerary(events: CEvent[]) {
  const body = events
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    .map((e) => `• ${new Date(e.start).toLocaleString('en-NG', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}: ${e.title} @ ${e.area}`)
    .join('\n');
  return `https://wa.me/?text=${encodeURIComponent(`My COORDINA plan 🎉\n${body}\n\ncoordina.ng`)}`;
}


import type { CEvent } from '../types';
import { fmtDate, fmtTime, mapLink } from './format';

export const APP_BASE_URL = 'https://coordina-beta.vercel.app';

export const getEventShareUrl = (eventId: string) => `${APP_BASE_URL}/event/${eventId}`;

const stamp = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const eventLocation = (e: CEvent) =>
  e.venueName ? `${e.venueName}, ${e.area}, ${e.city}` : `${e.area}, ${e.city}`;

export function buildICS(events: CEvent[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//COORDINA//EN', 'CALSCALE:GREGORIAN'];
  for (const e of events) {
    const eventUrl = getEventShareUrl(e.id);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}-${Date.now()}@coordina.ng`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(e.end)}`,
      `SUMMARY:${e.title}`,
      `LOCATION:${eventLocation(e)}`,
      `DESCRIPTION:${e.description} | Link: ${eventUrl} | Directions: ${mapLink(e)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Event in 2 hours',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Event tomorrow',
      'END:VALARM',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(events: CEvent[]) {
  const blob = new Blob([buildICS(events)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download =
    events.length === 1
      ? `${events[0].title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
      : 'coordina-itinerary.ics';
  a.click();
  URL.revokeObjectURL(a.href);
}

export const googleCalLink = (e: CEvent) => {
  const location = eventLocation(e);
  const eventUrl = getEventShareUrl(e.id);
  const details = `${e.description}\n\nEvent link: ${eventUrl}\nDirections: ${mapLink(e)}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    e.title
  )}&dates=${stamp(e.start)}/${stamp(e.end)}&location=${encodeURIComponent(
    location
  )}&details=${encodeURIComponent(details)}`;
};

export function openCalendarEvent(e: CEvent) {
  window.open(googleCalLink(e), '_blank');
}

export function whatsappEvent(e: CEvent) {
  const eventUrl = getEventShareUrl(e.id);
  const venue = e.venueName ? `${e.venueName}, ${e.area}` : e.area;
  const dateStr = fmtDate(e.start, { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = fmtTime(e.start);

  const text = `Join me at *${e.title}* 🎉\n📅 ${dateStr} · ${timeStr}\n📍 ${venue}, ${e.city}\n\nGet your tickets & details here:\n👉 ${eventUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function whatsappItinerary(events: CEvent[]) {
  const body = [...events]
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    .map(
      (e) =>
        `• *${e.title}*\n  📅 ${fmtDate(e.start, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })} · ${fmtTime(e.start)}\n  📍 ${e.venueName ? `${e.venueName}, ${e.area}` : e.area}\n  👉 ${getEventShareUrl(e.id)}`
    )
    .join('\n\n');
  return `https://wa.me/?text=${encodeURIComponent(
    `Here is my COORDINA schedule 🎉\n\n${body}\n\nDiscover more events on Coordina: ${APP_BASE_URL}`
  )}`;
}

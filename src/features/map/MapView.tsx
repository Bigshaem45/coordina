import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { Icon } from '../../design-system/Icon';
import { AREAS, CATEGORY_ICON, minPrice } from '../../lib/constants';
import { Chip } from '../../design-system/ui';
import { useActiveCity, useAllEvents } from '../../store';
import { fmtTime, naira } from '../../lib/format';
import { useAddToPlan } from '../discover/EventCard';

const pin = (iconName: string, live: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="width:38px;height:38px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${
      live ? '#F43F5E' : '#4F46E5'
    };border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(15,23,42,.28)"><span class="material-symbols-rounded" style="transform:rotate(45deg);font-size:19px;color:#ffffff">${iconName}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -34],
  });

function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.8 });
  }, [lat, lng, zoom, map]);
  return null;
}

export default function MapView() {
  const city = useActiveCity();
  const all = useAllEvents().filter((e) => e.city === city);
  const [now, setNow] = useState(false);
  const [area, setArea] = useState<string | null>(null);
  const add = useAddToPlan();
  const areas = Object.keys(AREAS).filter((a) => AREAS[a].city === city);
  const t = Date.now();
  const list = all.filter(
    (e) =>
      (!now || (+new Date(e.start) <= t && +new Date(e.end) >= t)) &&
      (!area || e.area === area)
  );
  const centre = area
    ? AREAS[area]
    : { lat: city === 'Abuja' ? 9.06 : 6.52, lng: city === 'Abuja' ? 7.46 : 3.38 };
  const zoom = area ? 14 : city === 'Abuja' ? 12 : 11;

  return (
    <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px))] flex-col md:h-[calc(100vh-5.5rem)] md:py-4">
      <div className="space-y-2 px-4 py-3 md:px-0 md:pt-0">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          <Chip active={now} onClick={() => setNow(!now)}>
            <Icon
              name="fiber_manual_record"
              filled
              className={now ? 'text-white' : 'text-coral-500'}
            />{' '}
            Happening now
          </Chip>
          <Chip active={!area} onClick={() => setArea(null)}>
            All {city}
          </Chip>
          {areas.map((a) => (
            <Chip key={a} active={area === a} onClick={() => setArea(area === a ? null : a)}>
              {a} ({all.filter((e) => e.area === a).length})
            </Chip>
          ))}
        </div>
        {now && list.length === 0 && (
          <p className="muted text-xs">
            Nothing is live right this minute. Turn off “Happening now” to browse upcoming pins.
          </p>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden border-y border-slate-200 dark:border-slate-800 md:rounded-2xl md:border">
        <MapContainer
          center={[centre.lat, centre.lng]}
          zoom={zoom}
          className="z-0 h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyTo lat={centre.lat} lng={centre.lng} zoom={zoom} />
          {list.map((e) => {
            const live = +new Date(e.start) <= t && +new Date(e.end) >= t;
            return (
              <Marker
                key={e.id}
                position={[e.lat, e.lng]}
                icon={pin(CATEGORY_ICON[e.category], live)}
              >
                <Popup>
                  <div className="w-48 space-y-2 text-slate-900">
                    {e.image.startsWith('http') && (
                      <img
                        src={e.image}
                        alt={e.title}
                        className="h-24 w-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold leading-snug text-slate-900">
                        {e.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {fmtTime(e.start)} · {e.area}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-brand-600">
                        {minPrice(e) === 0 ? 'Free' : `From ${naira(minPrice(e))}`}
                      </p>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Link
                        to={`/event/${e.id}`}
                        className="flex-1 rounded-lg bg-slate-100 py-1.5 text-center text-xs font-medium !text-slate-800 no-underline hover:bg-slate-200"
                      >
                        Details
                      </Link>
                      <button
                        type="button"
                        onClick={() => add(e)}
                        className="flex-1 rounded-lg bg-brand-500 py-1.5 text-center text-xs font-medium text-white hover:bg-brand-600"
                      >
                        + Plan
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Icon } from '../../design-system/Icon';
import { Badge, Button, Card } from '../../design-system/ui';
import { useAllEvents, useStore } from '../../store';
import { convex } from '../../lib/convex';
import { api } from '../../../convex/_generated/api';

interface ScanResult {
  status: 'valid' | 'already_used' | 'invalid';
  message: string;
  ticketCode: string;
  attendeeName?: string;
  tierName?: string;
  eventTitle?: string;
  timestamp: string;
}

export default function GateScanner() {
  const user = useStore((s) => s.user);
  const tickets = useStore((s) => s.tickets);
  const checkInStore = useStore((s) => s.checkIn);
  const allEvents = useAllEvents();

  const [active, setActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const qrRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'coordina-gate-reader';

  // Play audio chime for feedback
  const playSound = (isSuccess: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isSuccess) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15); // E3
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  const triggerHaptic = async (isSuccess: boolean) => {
    try {
      await Haptics.notification({
        type: isSuccess ? NotificationType.Success : NotificationType.Error,
      });
    } catch {
      // Haptics optional on web
    }
  };

  // Validate scanned QR code payload
  const processCode = async (decodedText: string) => {
    if (scanning) return;
    setScanning(true);

    let extractedCode = decodedText.trim();
    let attendeeFromPayload = '';
    let tierFromPayload = '';
    let eventFromPayload = '';

    // Check if JSON payload
    try {
      if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        const parsed = JSON.parse(decodedText);
        extractedCode = parsed.ticketCode || extractedCode;
        attendeeFromPayload = parsed.attendeeName || '';
        tierFromPayload = parsed.tierName || '';
        eventFromPayload = parsed.eventTitle || '';
      }
    } catch {
      // Plain text code
    }

    // Clean prefix like "CD:TKT-" or "CD-"
    const cleanUpper = extractedCode.toUpperCase();
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let result: ScanResult;

    try {
      // 1. Try Live Convex backend validation first
      const backendRes = await convex.mutation(api.orders.checkInTicket, {
        ticketCode: extractedCode,
        scannerName: user?.name || 'Gate Officer 1',
      });

      if (backendRes.success && backendRes.ticket) {
        playSound(true);
        triggerHaptic(true);
        result = {
          status: 'valid',
          message: 'Access Granted · Valid Ticket',
          ticketCode: extractedCode,
          attendeeName: backendRes.ticket.attendeeName || attendeeFromPayload || 'Verified Attendee',
          tierName: backendRes.ticket.tierName || tierFromPayload || 'General Admission',
          eventTitle: (backendRes.ticket as any).eventTitle || eventFromPayload || 'Live Event Confirmed',
          timestamp: nowStr,
        };
      } else if (backendRes.ticket?.status === 'used' || backendRes.message?.includes('ALREADY USED')) {
        playSound(false);
        triggerHaptic(false);
        result = {
          status: 'already_used',
          message: backendRes.message || 'Ticket has ALREADY been scanned at the gate.',
          ticketCode: extractedCode,
          attendeeName: backendRes.ticket?.attendeeName,
          tierName: backendRes.ticket?.tierName,
          timestamp: nowStr,
        };
      } else {
        // Fallback to local store check (for offline wallet tickets)
        const localTicket = tickets.find(
          (t) =>
            t.id.toUpperCase() === cleanUpper ||
            t.id.toUpperCase() === cleanUpper.replace(/^CD:/, '') ||
            cleanUpper.includes(t.id.toUpperCase())
        );

        if (localTicket) {
          const usedSet = (window as any).__coordina_gate_scanned ?? new Set<string>();
          (window as any).__coordina_gate_scanned = usedSet;

          if (usedSet.has(localTicket.id)) {
            playSound(false);
            triggerHaptic(false);
            result = {
              status: 'already_used',
              message: 'Warning: Ticket already scanned on this device',
              ticketCode: localTicket.id,
              attendeeName: localTicket.owner || 'Attendee',
              tierName: localTicket.tierName,
              eventTitle: allEvents.find((e) => e.id === localTicket.eventId)?.title,
              timestamp: nowStr,
            };
          } else {
            usedSet.add(localTicket.id);
            checkInStore(localTicket.eventId);
            playSound(true);
            triggerHaptic(true);
            result = {
              status: 'valid',
              message: 'Access Granted (Offline Verified)',
              ticketCode: localTicket.id,
              attendeeName: localTicket.owner || 'Verified Guest',
              tierName: localTicket.tierName,
              eventTitle: allEvents.find((e) => e.id === localTicket.eventId)?.title,
              timestamp: nowStr,
            };
          }
        } else {
          playSound(false);
          triggerHaptic(false);
          result = {
            status: 'invalid',
            message: 'Invalid / Unrecognized ticket signature',
            ticketCode: extractedCode,
            timestamp: nowStr,
          };
        }
      }
    } catch {
      // Offline fallback when backend unreachable
      const localTicket = tickets.find(
        (t) =>
          t.id.toUpperCase() === cleanUpper ||
          t.id.toUpperCase() === cleanUpper.replace(/^CD:/, '') ||
          cleanUpper.includes(t.id.toUpperCase())
      );

      if (localTicket) {
        checkInStore(localTicket.eventId);
        playSound(true);
        triggerHaptic(true);
        result = {
          status: 'valid',
          message: 'Access Granted (Local Offline Pass)',
          ticketCode: localTicket.id,
          attendeeName: localTicket.owner || 'Verified Guest',
          tierName: localTicket.tierName,
          eventTitle: allEvents.find((e) => e.id === localTicket.eventId)?.title,
          timestamp: nowStr,
        };
      } else {
        playSound(false);
        triggerHaptic(false);
        result = {
          status: 'invalid',
          message: 'Ticket not found in local or remote registry',
          ticketCode: extractedCode,
          timestamp: nowStr,
        };
      }
    }

    setCurrentResult(result);
    setHistory((prev) => [result, ...prev.slice(0, 24)]);
    setScanning(false);
  };

  // Start camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!qrRef.current) {
        qrRef.current = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      await qrRef.current.start(
        { facingMode },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          processCode(decodedText);
        },
        () => {
          // ignore scan frame drops
        }
      );

      setActive(true);

      // Check torch capability
      try {
        const capabilities = qrRef.current.getRunningTrackCapabilities() as any;
        if (capabilities?.torch) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError(err?.message || 'Could not access device camera. Please check camera permissions.');
      setActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = async () => {
    if (qrRef.current && active) {
      try {
        await qrRef.current.stop();
      } catch (err) {
        console.warn('Camera stop error:', err);
      }
      setActive(false);
      setTorchOn(false);
    }
  };

  // Flip camera between front & back
  const flipCamera = async () => {
    await stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle torch/flash
  const toggleTorch = async () => {
    if (!qrRef.current || !hasTorch) return;
    try {
      await qrRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as any],
      });
      setTorchOn(!torchOn);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (qrRef.current && qrRef.current.isScanning) {
        qrRef.current.stop().catch(() => {});
      }
    };
  }, [facingMode]);

  const validCount = history.filter((h) => h.status === 'valid').length;
  const invalidCount = history.filter((h) => h.status !== 'valid').length;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-4 md:px-0">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Gate Pass Scanner</h1>
          <p className="muted text-xs">PWA High-Speed Gate Validation · Offline &amp; Real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neon">{validCount} Checked In</Badge>
          {invalidCount > 0 && <Badge tone="coral">{invalidCount} Denied</Badge>}
        </div>
      </div>

      {/* Camera Viewfinder Container */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-2xl">
        <div id={containerId} className="w-full aspect-square bg-slate-950" />

        {/* Reticle Overlay */}
        {active && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="relative h-60 w-60 rounded-2xl border-2 border-dashed border-brand-400 bg-brand-500/10 shadow-[0_0_30px_rgba(99,102,241,0.25)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 h-6 w-6 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 h-6 w-6 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-brand-400/80 animate-pulse" />
            </div>
          </div>
        )}

        {/* Camera Controls Overlay */}
        <div className="absolute bottom-4 inset-x-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={active ? stopCamera : startCamera}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/80 text-white backdrop-blur-md transition hover:bg-slate-800"
              title={active ? 'Pause Camera' : 'Start Camera'}
            >
              <Icon name={active ? 'pause' : 'play_arrow'} className="text-xl" />
            </button>
            <button
              type="button"
              onClick={flipCamera}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/80 text-white backdrop-blur-md transition hover:bg-slate-800"
              title="Flip Camera (Front/Back)"
            >
              <Icon name="flip_camera_ios" className="text-xl" />
            </button>
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl backdrop-blur-md transition ${
                  torchOn ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-900/80 text-white hover:bg-slate-800'
                }`}
                title="Toggle Flash / Torch"
              >
                <Icon name={torchOn ? 'flash_on' : 'flash_off'} className="text-xl" />
              </button>
            )}
          </div>
          <span className="rounded-full bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-200 backdrop-blur-md">
            {active ? '● Live Optical Engine' : '○ Camera Paused'}
          </span>
        </div>

        {/* Error overlay */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-slate-950/90 backdrop-blur-md">
            <Icon name="videocam_off" className="text-4xl text-coral-400" />
            <p className="mt-3 text-sm font-semibold">{cameraError}</p>
            <Button size="sm" className="mt-4" onClick={startCamera}>
              Retry Camera Permission
            </Button>
          </div>
        )}
      </div>

      {/* Live Scan Result High-Contrast Modal/Banner */}
      {currentResult && (
        <div
          role="status"
          className={`animate-in fade-in zoom-in-95 rounded-2xl border p-4 shadow-xl transition-all ${
            currentResult.status === 'valid'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100'
              : currentResult.status === 'already_used'
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-100'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  currentResult.status === 'valid'
                    ? 'bg-emerald-500 text-white'
                    : currentResult.status === 'already_used'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-rose-500 text-white'
                }`}
              >
                <Icon
                  name={
                    currentResult.status === 'valid'
                      ? 'check_circle'
                      : currentResult.status === 'already_used'
                      ? 'warning'
                      : 'error'
                  }
                  className="text-2xl"
                  filled
                />
              </div>
              <div>
                <p className="text-base font-bold">{currentResult.message}</p>
                <p className="font-mono text-xs opacity-80">{currentResult.ticketCode}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentResult(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <Icon name="close" />
            </button>
          </div>

          {(currentResult.attendeeName || currentResult.tierName) && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/60 p-3 text-xs dark:bg-slate-900/60">
              <div>
                <span className="opacity-70">Guest</span>
                <p className="font-semibold text-slate-900 dark:text-white">{currentResult.attendeeName || 'Guest'}</p>
              </div>
              <div>
                <span className="opacity-70">Pass Tier</span>
                <p className="font-semibold text-slate-900 dark:text-white">{currentResult.tierName || 'Regular'}</p>
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between text-[11px] opacity-75">
            <span>Scanned at {currentResult.timestamp}</span>
            <Button size="sm" variant="outline" onClick={() => setCurrentResult(null)}>
              Ready for Next Guest
            </Button>
          </div>
        </div>
      )}

      {/* Manual Code Input Option (fallback for broken guest screens) */}
      <Card className="p-4">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Manual Code Fallback (if camera unreadable)
        </label>
        <div className="mt-2 flex gap-2">
          <input
            aria-label="Manual ticket code"
            placeholder="e.g. CD-9482-TX or TKT-..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
          />
          <Button
            disabled={!manualCode.trim()}
            onClick={() => {
              processCode(manualCode);
              setManualCode('');
            }}
          >
            Verify
          </Button>
        </div>

        {/* Quick test chips from local wallet */}
        {tickets.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="muted">Quick Test Wallet Pass:</span>
            {tickets.slice(0, 3).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => processCode(t.id)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono hover:border-brand-500 dark:border-slate-700 dark:bg-midnight-900"
              >
                {t.id}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Gate Audit Log History */}
      {history.length > 0 && (
        <Card className="divide-y divide-slate-100 p-4 dark:divide-slate-800">
          <h2 className="pb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Recent Scans at this Gate ({history.length})
          </h2>
          {history.slice(0, 6).map((h, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-xs">
              <div className="flex items-center gap-2">
                <Icon
                  name={h.status === 'valid' ? 'check_circle' : 'cancel'}
                  className={h.status === 'valid' ? 'text-emerald-500' : 'text-rose-500'}
                />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {h.attendeeName || h.ticketCode}
                  </p>
                  <p className="muted font-mono text-[10px]">{h.ticketCode} · {h.timestamp}</p>
                </div>
              </div>
              <Badge tone={h.status === 'valid' ? 'neon' : 'coral'}>
                {h.status === 'valid' ? 'Admitted' : 'Rejected'}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

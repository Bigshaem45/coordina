import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Icon } from '../../design-system/Icon';
import { Badge, Button, Card, EmptyState } from '../../design-system/ui';
import { useAuth, useStore } from '../../store';
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
  const { user, isLoading } = useAuth();
  const setVerifyModalOpen = useStore((s) => s.setVerifyModalOpen);

  const authorized =
    Boolean(user) &&
    Boolean(user?.emailVerified) &&
    (user?.role === 'organiser' ||
      user?.role === 'venue_manager' ||
      user?.role === 'admin');

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

  const playSound = (isSuccess: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (isSuccess) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Audio context optional before gesture
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

  const processCode = async (decodedText: string) => {
    if (scanning || !user) return;
    setScanning(true);

    let displayCode = decodedText.trim();
    try {
      if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        const parsed = JSON.parse(decodedText);
        if (parsed.ticketCode) displayCode = parsed.ticketCode;
      }
    } catch {
      // Plain ticket code
    }

    const nowStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    let result: ScanResult;

    try {
      const backendRes = await convex.mutation(api.orders.checkInTicket, {
        ticketCode: decodedText.trim(),
        scannerUserId: user._id as any,
      });

      if (backendRes.success && backendRes.ticket) {
        playSound(true);
        triggerHaptic(true);
        result = {
          status: 'valid',
          message: backendRes.message || 'Access Granted · Valid Ticket',
          ticketCode: backendRes.ticket.ticketCode || displayCode,
          attendeeName: backendRes.ticket.attendeeName,
          tierName: backendRes.ticket.tierName,
          eventTitle: (backendRes.ticket as any).eventTitle,
          timestamp: nowStr,
        };
      } else if (
        backendRes.ticket?.status === 'used' ||
        backendRes.message?.includes('ALREADY')
      ) {
        playSound(false);
        triggerHaptic(false);
        result = {
          status: 'already_used',
          message: backendRes.message || 'Ticket has ALREADY been checked in.',
          ticketCode: backendRes.ticket?.ticketCode || displayCode,
          attendeeName: backendRes.ticket?.attendeeName,
          tierName: backendRes.ticket?.tierName,
          eventTitle: (backendRes.ticket as any)?.eventTitle,
          timestamp: nowStr,
        };
      } else {
        playSound(false);
        triggerHaptic(false);
        result = {
          status: 'invalid',
          message: backendRes.message || 'Invalid or unauthorized ticket signature.',
          ticketCode: displayCode,
          timestamp: nowStr,
        };
      }
    } catch (err: any) {
      playSound(false);
      triggerHaptic(false);
      result = {
        status: 'invalid',
        message: err?.message || 'Unable to verify ticket with COORDINA registry.',
        ticketCode: displayCode,
        timestamp: nowStr,
      };
    }

    setCurrentResult(result);
    setHistory((prev) => [result, ...prev.slice(0, 24)]);
    setScanning(false);
  };

  const startCamera = async () => {
    if (!authorized) return;
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
        () => {}
      );

      setActive(true);

      try {
        const capabilities = qrRef.current.getRunningTrackCapabilities() as any;
        if (capabilities?.torch) setHasTorch(true);
      } catch {
        setHasTorch(false);
      }
    } catch (err: any) {
      setCameraError(
        err?.message || 'Could not access device camera. Please check camera permissions.'
      );
      setActive(false);
    }
  };

  const stopCamera = async () => {
    if (qrRef.current && active) {
      try {
        await qrRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      setActive(false);
      setTorchOn(false);
    }
  };

  const flipCamera = async () => {
    await stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    if (!qrRef.current || !hasTorch) return;
    try {
      await qrRef.current.applyVideoConstraints({
        advanced: [{ torch: !torchOn } as any],
      });
      setTorchOn(!torchOn);
    } catch {
      // Ignore torch error
    }
  };

  useEffect(() => {
    if (!authorized) return;
    startCamera();
    return () => {
      if (qrRef.current && qrRef.current.isScanning) {
        qrRef.current.stop().catch(() => {});
      }
    };
  }, [facingMode, authorized]);

  if (!isLoading && !user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState
          icon="lock"
          title="Staff Sign-In Required"
          text="Log in with an Event Planner, Venue Manager, or Admin account to operate Gate Check-In."
          action={
            <Link to="/auth?mode=signin&redirect=/scanner">
              <Button>Log In</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (user && !user.emailVerified) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState
          icon="mark_email_unread"
          title="Email Verification Required"
          text="Verify your staff email address before scanning attendee tickets at the gate."
          action={
            <Button onClick={() => setVerifyModalOpen(true)}>Verify Email Now</Button>
          }
        />
      </div>
    );
  }

  if (user && !authorized) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <EmptyState
          icon="gpp_bad"
          title="Gate Scanner Restricted"
          text="Attendee accounts cannot scan or validate entry passes. Switch to an Event Planner or Venue Manager account."
          action={
            <Link to="/tickets">
              <Button variant="outline">Back to My Tickets</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const validCount = history.filter((h) => h.status === 'valid').length;
  const invalidCount = history.filter((h) => h.status !== 'valid').length;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-4 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Gate Pass Scanner
          </h1>
          <p className="muted text-xs">
            Officer: {user?.name} ({user?.role}) · Live Cryptographic Registry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neon">{validCount} Checked In</Badge>
          {invalidCount > 0 && <Badge tone="coral">{invalidCount} Denied</Badge>}
        </div>
      </div>

      {/* Camera Viewfinder */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-950 shadow-2xl">
        <div id={containerId} className="aspect-square w-full bg-slate-950" />

        {active && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="relative h-60 w-60 rounded-2xl border-2 border-dashed border-brand-400 bg-brand-500/10 shadow-[0_0_30px_rgba(99,102,241,0.25)]">
              <div className="absolute -left-1 -top-1 h-6 w-6 rounded-tl-lg border-l-4 border-t-4 border-brand-400" />
              <div className="absolute -right-1 -top-1 h-6 w-6 rounded-tr-lg border-r-4 border-t-4 border-brand-400" />
              <div className="absolute -bottom-1 -left-1 h-6 w-6 rounded-bl-lg border-b-4 border-l-4 border-brand-400" />
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-br-lg border-b-4 border-r-4 border-brand-400" />
              <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-brand-400/80" />
            </div>
          </div>
        )}

        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between">
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
              title="Flip Camera"
            >
              <Icon name="flip_camera_ios" className="text-xl" />
            </button>
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl backdrop-blur-md transition ${
                  torchOn
                    ? 'bg-amber-400 font-bold text-slate-950'
                    : 'bg-slate-900/80 text-white hover:bg-slate-800'
                }`}
                title="Toggle Torch"
              >
                <Icon name={torchOn ? 'flash_on' : 'flash_off'} className="text-xl" />
              </button>
            )}
          </div>
          <span className="rounded-full bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-slate-200 backdrop-blur-md">
            {active ? '● Live Optical Engine' : '○ Camera Paused'}
          </span>
        </div>

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center text-white backdrop-blur-md">
            <Icon name="videocam_off" className="text-4xl text-coral-400" />
            <p className="mt-3 text-sm font-semibold">{cameraError}</p>
            <Button size="sm" className="mt-4" onClick={startCamera}>
              Retry Camera Permission
            </Button>
          </div>
        )}
      </div>

      {/* Live Scan Result Banner */}
      {currentResult && (
        <div
          role="status"
          className={`rounded-2xl border p-4 shadow-xl transition-all ${
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

          {(currentResult.attendeeName ||
            currentResult.tierName ||
            currentResult.eventTitle) && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/60 p-3 text-xs dark:bg-slate-900/60">
              <div>
                <span className="opacity-70">Guest</span>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {currentResult.attendeeName || 'Guest'}
                </p>
              </div>
              <div>
                <span className="opacity-70">Pass Tier</span>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {currentResult.tierName || 'Standard'}
                </p>
              </div>
              {currentResult.eventTitle && (
                <div className="col-span-2">
                  <span className="opacity-70">Event</span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {currentResult.eventTitle}
                  </p>
                </div>
              )}
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

      {/* Manual Ticket Code Entry */}
      <Card className="p-4">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Manual Ticket Code Entry (if guest screen is damaged)
        </label>
        <div className="mt-2 flex gap-2">
          <input
            aria-label="Manual ticket code"
            placeholder="Enter pass code e.g. CD-1234-ABCD"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm uppercase text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-midnight-800 dark:text-slate-100"
          />
          <Button
            disabled={!manualCode.trim() || scanning}
            onClick={() => {
              processCode(manualCode);
              setManualCode('');
            }}
          >
            Verify
          </Button>
        </div>
      </Card>

      {history.length > 0 && (
        <Card className="divide-y divide-slate-100 p-4 dark:divide-slate-800">
          <h2 className="pb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Session Gate Log ({history.length})
          </h2>
          {history.slice(0, 8).map((h, i) => (
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
                  <p className="muted font-mono text-[10px]">
                    {h.ticketCode} · {h.timestamp}
                  </p>
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

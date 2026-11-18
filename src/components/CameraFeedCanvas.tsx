import React, {useEffect, useRef, useState} from 'react';
import {Camera as CameraIcon, Eye, Moon, Shield, ShieldAlert, Video} from 'lucide-react';
import type {SecurityCamera} from '../types/iot';

interface CameraFeedCanvasProps {
  camera: SecurityCamera;
  livingLightOn: boolean;
  canControl: boolean;
  driveToken?: string | null;
  onSaveToDrive?: (filename: string, blob: Blob) => Promise<void>;
  onUpdate: (
    id: string,
    patch: {armed?: boolean; nightVision?: boolean; streamUrl?: string; snapshot?: boolean; triggerMotion?: boolean}
  ) => Promise<unknown>;
}

export const CameraFeedCanvas: React.FC<CameraFeedCanvasProps> = ({
  camera,
  livingLightOn,
  canControl,
  driveToken,
  onSaveToDrive,
  onUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(camera.streamUrl);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setUrlDraft(camera.streamUrl);
  }, [camera.streamUrl]);

  // Live architectural camera stream synthesizer when no external MJPEG URL is configured
  useEffect(() => {
    if (camera.streamUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let rafId = 0;
    let lastDraw = 0;

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      if (now - lastDraw < 250) return; // 4 fps lightweight telemetry feed
      lastDraw = now;
      frame++;

      const w = canvas.width;
      const h = canvas.height;
      const ir = camera.nightVision;

      // Sky / ambient backdrop
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      if (ir) {
        grad.addColorStop(0, '#07130d');
        grad.addColorStop(1, '#0d2217');
      } else if (camera.id === 'cam-living' && livingLightOn) {
        grad.addColorStop(0, '#1e2b3c');
        grad.addColorStop(1, '#151e2c');
      } else {
        grad.addColorStop(0, '#0b1220');
        grad.addColorStop(1, '#121d30');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Perspective floor & room geometry
      ctx.strokeStyle = ir ? 'rgba(83,227,161,0.16)' : 'rgba(148,163,184,0.14)';
      ctx.lineWidth = 1;

      if (camera.id === 'cam-porch') {
        // Porch steps & doorway
        ctx.fillStyle = ir ? '#10291c' : '#19263a';
        ctx.fillRect(w * 0.34, h * 0.24, w * 0.32, h * 0.56);
        ctx.strokeRect(w * 0.34, h * 0.24, w * 0.32, h * 0.56);
        // Porch lantern glow
        ctx.fillStyle = ir ? 'rgba(83,227,161,0.28)' : 'rgba(250,204,21,0.25)';
        ctx.beginPath();
        ctx.arc(w * 0.27, h * 0.33, 18, 0, Math.PI * 2);
        ctx.fill();
        // Steps
        for (let s = 0; s < 3; s++) {
          ctx.fillStyle = ir ? `rgba(25,65,44,${0.6 - s * 0.12})` : `rgba(38,55,80,${0.7 - s * 0.14})`;
          ctx.fillRect(w * (0.25 - s * 0.04), h * (0.8 + s * 0.06), w * (0.5 + s * 0.08), h * 0.055);
        }
      } else if (camera.id === 'cam-living') {
        // Window & sofa silhouette
        ctx.fillStyle = ir ? '#0c2116' : '#101b2d';
        ctx.fillRect(w * 0.12, h * 0.18, w * 0.28, h * 0.36);
        ctx.strokeRect(w * 0.12, h * 0.18, w * 0.28, h * 0.36);
        // Ceiling lamp illumination synced with Relay Ch1
        if (livingLightOn) {
          const glow = ctx.createRadialGradient(w * 0.65, h * 0.18, 8, w * 0.65, h * 0.32, 130);
          glow.addColorStop(0, ir ? 'rgba(83,227,161,0.4)' : 'rgba(253,224,71,0.34)');
          glow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, w, h);
        }
        // Sofa & console
        ctx.fillStyle = ir ? '#143323' : '#1e2e46';
        ctx.fillRect(w * 0.45, h * 0.58, w * 0.42, h * 0.22);
        ctx.fillRect(w * 0.45, h * 0.5, w * 0.08, h * 0.3);
        ctx.fillRect(w * 0.79, h * 0.5, w * 0.08, h * 0.3);
      } else {
        // Garage bay & vehicle silhouette
        ctx.strokeRect(w * 0.1, h * 0.2, w * 0.8, h * 0.62);
        for (let line = 1; line <= 4; line++) {
          ctx.beginPath();
          ctx.moveTo(w * 0.1, h * (0.2 + line * 0.11));
          ctx.lineTo(w * 0.9, h * (0.2 + line * 0.11));
          ctx.stroke();
        }
        ctx.fillStyle = ir ? '#133122' : '#1c2b42';
        ctx.fillRect(w * 0.28, h * 0.56, w * 0.44, h * 0.26);
      }

      // Subtle scanlines for realistic CCTV sensor look
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      // Motion detection bounding box when active
      if (camera.motionDetected) {
        const dx = Math.sin(frame * 0.6) * 14;
        const bx = w * 0.42 + dx;
        const by = h * 0.36;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, 72, 92);
        ctx.fillStyle = '#ef4444';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText('MOTION DETECTED', bx, by - 6);
      }

      // OSD timestamp & channel label
      ctx.fillStyle = 'rgba(11,18,32,0.72)';
      ctx.fillRect(10, 10, 186, 22);
      ctx.fillStyle = ir ? '#53e3a1' : '#e2e8f0';
      ctx.font = '500 11px "JetBrains Mono", monospace';
      const ts = new Date().toLocaleTimeString([], {hour12: false});
      ctx.fillText(`${camera.id.toUpperCase()} · ${ts}`, 16, 25);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [camera.id, camera.nightVision, camera.motionDetected, camera.streamUrl, livingLightOn]);

  const handleSaveStreamUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate(camera.id, {streamUrl: urlDraft});
    setEditingUrl(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] overflow-hidden">
      <div className="relative aspect-video bg-[#0b1220]">
        {camera.streamUrl ? (
          <img
            src={camera.streamUrl}
            alt={`${camera.name} live feed`}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <canvas ref={canvasRef} width={480} height={270} className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{camera.name}</p>
            <p className="text-xs text-slate-300 truncate">
              {camera.location} · {camera.resolution}
            </p>
          </div>
          <span
            className={`text-xs font-mono font-medium whitespace-nowrap ${
              camera.motionDetected
                ? 'text-red-400'
                : camera.armed
                  ? 'text-emerald-400'
                  : 'text-slate-300'
            }`}
          >
            {camera.motionDetected ? 'ALERT' : camera.armed ? 'ARMED' : 'STANDBY'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">{camera.gpioNote}</span>
          <span className="font-mono tabular-nums shrink-0">
            {camera.nightVision ? 'IR ON' : 'DAY'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            disabled={!canControl}
            onClick={() => onUpdate(camera.id, {armed: !camera.armed})}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition disabled:opacity-40 ${
              camera.armed
                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-slate-200 dark:border-[#263750] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            {camera.armed ? 'Armed' : 'Arm'}
          </button>

          <button
            type="button"
            disabled={!canControl}
            onClick={() => onUpdate(camera.id, {nightVision: !camera.nightVision})}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition disabled:opacity-40 ${
              camera.nightVision
                ? 'border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                : 'border-slate-200 dark:border-[#263750] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            IR Mode
          </button>

          <button
            type="button"
            disabled={!canControl}
            onClick={() => onUpdate(camera.id, {triggerMotion: !camera.motionDetected})}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition disabled:opacity-40 ${
              camera.motionDetected
                ? 'border-red-500/60 bg-red-500/15 text-red-600 dark:text-red-400'
                : 'border-slate-200 dark:border-[#263750] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {camera.motionDetected ? 'Clear' : 'Test PIR'}
          </button>

          <button
            type="button"
            disabled={!canControl}
            onClick={() => setEditingUrl((v) => !v)}
            className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#263750] px-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition disabled:opacity-40"
          >
            <Video className="h-3.5 w-3.5" />
            Stream URL
          </button>
        </div>

        {editingUrl && (
          <form onSubmit={handleSaveStreamUrl} className="flex gap-2 pt-1">
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="http://192.168.1.55:81/stream"
              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-emerald-500 px-3.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Save
            </button>
          </form>
        )}

        <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-[#263750]/60">
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {savedMsg ??
              `Last motion: ${new Date(camera.lastMotionAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}`}
          </span>
          <button
            type="button"
            disabled={!canControl}
            onClick={async () => {
              await onUpdate(camera.id, {snapshot: true});
              if (canvasRef.current && driveToken && onSaveToDrive) {
                canvasRef.current.toBlob(async (blob) => {
                  if (!blob) return;
                  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                  await onSaveToDrive(`${camera.id}-${stamp}.png`, blob);
                  setSavedMsg('Saved to Google Drive');
                  setTimeout(() => setSavedMsg(null), 3000);
                }, 'image/png');
              } else if (canvasRef.current) {
                const url = canvasRef.current.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = `${camera.id}-snapshot.png`;
                a.click();
              }
            }}
            className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-40"
          >
            <CameraIcon className="h-3.5 w-3.5" />
            {driveToken ? 'Save to Drive' : 'Snapshot'}
          </button>
        </div>
      </div>
    </div>
  );
};

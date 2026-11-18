import React, {useState} from 'react';
import {
  Fan,
  Flame,
  Lightbulb,
  Lock,
  Minus,
  Plug,
  Plus,
  Power,
  Snowflake,
  Thermometer,
  Wind,
} from 'lucide-react';
import type {HomeState, HouseholdUser, ThermostatMode} from '../types/iot';
import {CameraFeedCanvas} from './CameraFeedCanvas';

interface DashboardViewProps {
  state: HomeState;
  activeUser: HouseholdUser | null;
  driveToken?: string | null;
  onSaveSnapshotToDrive?: (filename: string, blob: Blob) => Promise<void>;
  onToggleRelay: (channel: number, targetOn: boolean) => Promise<unknown>;
  onUpdateRelayMeta: (channel: number, patch: {name?: string; ratedWatts?: number}) => Promise<unknown>;
  onUpdateThermostat: (patch: {targetTemp?: number; mode?: ThermostatMode; autoFanLink?: boolean}) => Promise<unknown>;
  onUpdateCamera: (
    id: string,
    patch: {armed?: boolean; nightVision?: boolean; streamUrl?: string; snapshot?: boolean; triggerMotion?: boolean}
  ) => Promise<unknown>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  activeUser,
  driveToken,
  onSaveSnapshotToDrive,
  onToggleRelay,
  onUpdateRelayMeta,
  onUpdateThermostat,
  onUpdateCamera,
}) => {
  const [busyChannel, setBusyChannel] = useState<number | null>(null);
  const [editingChannel, setEditingChannel] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftWatts, setDraftWatts] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const activeRelaysCount = state.relays.filter((r) => r.state).length;
  const totalWatts = Number(
    (state.relays.reduce((sum, r) => sum + (r.state ? r.ratedWatts : 0), 0) + 6.5).toFixed(1)
  );
  const livingLightOn = state.relays[0]?.state ?? false;

  const handleRelayClick = async (channel: number, nextState: boolean) => {
    setBusyChannel(channel);
    setActionError(null);
    try {
      await onToggleRelay(channel, nextState);
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusyChannel(null);
    }
  };

  const handleThermostatStep = async (delta: number) => {
    setActionError(null);
    const next = Math.min(31, Math.max(16, Number((state.thermostat.targetTemp + delta).toFixed(1))));
    try {
      await onUpdateThermostat({targetTemp: next});
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const getCategoryIcon = (cat: string) => {
    if (cat === 'light') return Lightbulb;
    if (cat === 'climate') return Fan;
    return Plug;
  };

  return (
    <div className="space-y-8">
      {actionError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* Telemetry Summary Grid */}
      <section aria-label="Live Environment Telemetry" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-[#9eb0c9]">Temperature</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
            {state.thermostat.currentTemp.toFixed(1)}
            <span className="ml-1 text-base font-normal text-slate-500 dark:text-[#9eb0c9]">°C</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-[#9eb0c9]">DHT11 · GPIO 4</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-[#9eb0c9]">Relative Humidity</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
            {state.thermostat.currentHumidity}
            <span className="ml-1 text-base font-normal text-slate-500 dark:text-[#9eb0c9]">%</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-[#9eb0c9]">Indoor Comfort</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-[#9eb0c9]">Live Power Load</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
            {totalWatts.toFixed(0)}
            <span className="ml-1 text-base font-normal text-slate-500 dark:text-[#9eb0c9]">W</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-[#9eb0c9]">
            {activeRelaysCount} / {state.relays.length} relays active
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-[#9eb0c9]">ESP32 Wi-Fi Signal</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
            {state.hardware.rssi}
            <span className="ml-1 text-base font-normal text-slate-500 dark:text-[#9eb0c9]">dBm</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-[#9eb0c9] font-mono tabular-nums">
            {state.hardware.localIp}
          </p>
        </div>
      </section>

      {/* Main Split: Relays & Thermostat */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 4-Channel Relay Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Lights &amp; Relay Channels
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
                4-Channel Relay Module · GPIO 16, 17, 18, 19
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  state.relays.forEach((r) => {
                    if (!r.state && (activeUser?.role !== 'Guest' || r.guestAllowed)) {
                      handleRelayClick(r.channel, true);
                    }
                  });
                }}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] px-3.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-emerald-500/60 transition whitespace-nowrap"
              >
                All On
              </button>
              <button
                type="button"
                onClick={() => {
                  state.relays.forEach((r) => {
                    if (r.state && (activeUser?.role !== 'Guest' || r.guestAllowed)) {
                      handleRelayClick(r.channel, false);
                    }
                  });
                }}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] px-3.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-red-500/60 transition whitespace-nowrap"
              >
                All Off
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {state.relays.map((relay) => {
              const Icon = getCategoryIcon(relay.category);
              const guestLocked = activeUser?.role === 'Guest' && !relay.guestAllowed;
              const isEditing = editingChannel === relay.channel;

              return (
                <div
                  key={relay.channel}
                  className={`rounded-2xl border p-5 transition-colors ${
                    relay.state
                      ? 'border-emerald-500/50 bg-emerald-500/[0.06] dark:bg-[#172838]'
                      : 'border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          relay.state
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-100 dark:bg-[#0b1220] text-slate-500 dark:text-[#9eb0c9]'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {relay.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-[#9eb0c9] font-mono tabular-nums">
                          GPIO {relay.gpio} · Ch {relay.channel} · {relay.ratedWatts} W
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busyChannel === relay.channel || guestLocked}
                      onClick={() => handleRelayClick(relay.channel, !relay.state)}
                      aria-label={`Toggle ${relay.name}`}
                      className={`min-h-[44px] min-w-[76px] shrink-0 rounded-xl px-4 text-xs font-bold transition active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                        relay.state
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'bg-slate-200 dark:bg-[#263750] text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-[#314665]'
                      }`}
                    >
                      {guestLocked ? <Lock className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      {relay.state ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#263750]/60 flex items-center justify-between text-xs text-slate-500 dark:text-[#9eb0c9]">
                    <span className="tabular-nums">
                      {relay.dailyKwh.toFixed(2)} kWh today · {relay.activeLow ? 'Active-LOW' : 'Active-HIGH'}
                    </span>
                    {activeUser?.role === 'Admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingChannel(null);
                          } else {
                            setEditingChannel(relay.channel);
                            setDraftName(relay.name);
                            setDraftWatts(String(relay.ratedWatts));
                          }
                        }}
                        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                    )}
                  </div>

                  {isEditing && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await onUpdateRelayMeta(relay.channel, {
                          name: draftName,
                          ratedWatts: Number(draftWatts) || relay.ratedWatts,
                        });
                        setEditingChannel(null);
                      }}
                      className="mt-3 flex flex-col sm:flex-row gap-2"
                    >
                      <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="flex-1 min-h-[40px] rounded-lg border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-2.5 text-xs text-slate-900 dark:text-white"
                        placeholder="Appliance name"
                      />
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        value={draftWatts}
                        onChange={(e) => setDraftWatts(e.target.value)}
                        className="w-24 min-h-[40px] rounded-lg border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-2.5 text-xs font-mono text-slate-900 dark:text-white"
                        placeholder="Watts"
                      />
                      <button
                        type="submit"
                        className="min-h-[40px] rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-slate-950"
                      >
                        Save
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive HVAC Thermostat */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Climate Thermostat
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
                DHT11 Feedback · Linked to Relay Ch 3
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
              {state.thermostat.hvacActive ? 'COOLING ACTIVE' : 'IDLE'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 dark:bg-[#0b1220] border border-slate-200 dark:border-[#263750] p-5">
            <button
              type="button"
              disabled={!activeUser?.canAdjustThermostat}
              onClick={() => handleThermostatStep(-0.5)}
              aria-label="Decrease target temperature"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] text-slate-700 dark:text-white hover:border-emerald-500 transition disabled:opacity-40"
            >
              <Minus className="h-5 w-5" />
            </button>

            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">Target Setpoint</p>
              <p className="mt-1 text-4xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                {state.thermostat.targetTemp.toFixed(1)}°C
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#9eb0c9] font-mono tabular-nums">
                Measured: {state.thermostat.currentTemp.toFixed(1)}°C · {state.thermostat.currentHumidity}% RH
              </p>
            </div>

            <button
              type="button"
              disabled={!activeUser?.canAdjustThermostat}
              onClick={() => handleThermostatStep(0.5)}
              aria-label="Increase target temperature"
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] text-slate-700 dark:text-white hover:border-emerald-500 transition disabled:opacity-40"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div>
            <input
              type="range"
              min={16}
              max={31}
              step={0.5}
              disabled={!activeUser?.canAdjustThermostat}
              value={state.thermostat.targetTemp}
              onChange={(e) => onUpdateThermostat({targetTemp: Number(e.target.value)})}
              aria-label="Target temperature slider"
              className="w-full accent-emerald-500 h-2 cursor-pointer disabled:opacity-40"
            />
            <div className="mt-1 flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
              <span>16°C</span>
              <span>23.5°C</span>
              <span>31°C</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 rounded-xl bg-slate-100 dark:bg-[#0b1220] p-1">
            {(
              [
                {id: 'auto', label: 'Auto', Icon: Thermometer},
                {id: 'cool', label: 'Cool', Icon: Snowflake},
                {id: 'heat', label: 'Heat', Icon: Flame},
                {id: 'fan', label: 'Fan', Icon: Wind},
                {id: 'eco', label: 'Eco', Icon: Power},
              ] as const
            ).map(({id, label, Icon}) => (
              <button
                key={id}
                type="button"
                disabled={!activeUser?.canAdjustThermostat}
                onClick={() => onUpdateThermostat({mode: id})}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium transition disabled:opacity-40 ${
                  state.thermostat.mode === id
                    ? 'bg-white dark:bg-[#1e2d47] text-slate-900 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-[#9eb0c9] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-[#263750]/60">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Auto-Trigger Ventilation Fan
              </p>
              <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
                Switches GPIO 18 ON when DHT11 exceeds setpoint +0.5°C
              </p>
            </div>
            <button
              type="button"
              disabled={!activeUser?.canAdjustThermostat}
              onClick={() => onUpdateThermostat({autoFanLink: !state.thermostat.autoFanLink})}
              className={`min-h-[44px] min-w-[68px] rounded-xl px-3 text-xs font-bold transition disabled:opacity-40 ${
                state.thermostat.autoFanLink
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-200 dark:bg-[#263750] text-slate-700 dark:text-slate-300'
              }`}
            >
              {state.thermostat.autoFanLink ? 'LINKED' : 'MANUAL'}
            </button>
          </div>
        </div>
      </section>

      {/* Remote Security Cameras */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Security Cameras &amp; Motion Nodes
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
              Remote monitoring with IR night vision, PIR alerts, and custom ESP32-CAM MJPEG URLs
            </p>
          </div>
          {!activeUser?.canViewCameras && (
            <span className="text-xs font-medium text-amber-500">
              Restricted for {activeUser?.role} profile
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {state.cameras.map((cam) => (
            <CameraFeedCanvas
              key={cam.id}
              camera={cam}
              livingLightOn={livingLightOn}
              canControl={Boolean(activeUser?.canViewCameras)}
              driveToken={driveToken}
              onSaveToDrive={onSaveSnapshotToDrive}
              onUpdate={onUpdateCamera}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

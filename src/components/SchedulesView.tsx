import React, {useState} from 'react';
import {Clock, Plus, Repeat, Timer, Trash2} from 'lucide-react';
import type {HomeState, HouseholdUser, ScheduleRule} from '../types/iot';

interface SchedulesViewProps {
  state: HomeState;
  activeUser: HouseholdUser | null;
  onCreateSchedule: (payload: Partial<ScheduleRule>) => Promise<unknown>;
  onToggleSchedule: (id: string, enabled: boolean) => Promise<unknown>;
  onDeleteSchedule: (id: string) => Promise<unknown>;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  state,
  activeUser,
  onCreateSchedule,
  onToggleSchedule,
  onDeleteSchedule,
}) => {
  const canManage = Boolean(activeUser?.canManageSchedules);

  const [name, setName] = useState('');
  const [channel, setChannel] = useState(1);
  const [type, setType] = useState<'daily' | 'interval' | 'countdown'>('daily');
  const [startTime, setStartTime] = useState('18:30');
  const [endTime, setEndTime] = useState('23:00');
  const [days, setDays] = useState<string[]>(ALL_DAYS);
  const [everyMins, setEveryMins] = useState(60);
  const [durationMins, setDurationMins] = useState(15);
  const [countdownMins, setCountdownMins] = useState(30);
  const [action, setAction] = useState<'on' | 'off' | 'cycle'>('off');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg(null);
    try {
      await onCreateSchedule({
        name: name.trim() || `${state.relays[channel - 1]?.name || 'Relay'} ${type}`,
        channel,
        type,
        enabled: true,
        action: type === 'interval' ? 'cycle' : type === 'countdown' ? action : 'on',
        startTime,
        endTime,
        days,
        intervalEveryMins: everyMins,
        intervalDurationMins: durationMins,
        countdownRemainingSecs: countdownMins * 60,
      });
      setName('');
    } catch (err) {
      setErrMsg((err as Error).message);
    }
  };

  const toggleDay = (day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const formatRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Create Schedule / Interval Form */}
      <form
        onSubmit={handleCreate}
        className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 space-y-5"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Create Appliance Scheduler
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
            Server-executed time windows, repeating intervals, and countdown timers
          </p>
        </div>

        {!canManage && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300">
            Active profile ({activeUser?.role}) cannot modify schedules. Switch to an Admin profile in Access &amp; Alerts.
          </div>
        )}

        {errMsg && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-500">
            {errMsg}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#9eb0c9] mb-1.5">
              Schedule Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nightly Porch Lighting"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#9eb0c9] mb-1.5">
              Target Relay Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(Number(e.target.value))}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-sm text-slate-900 dark:text-white"
            >
              {state.relays.map((r) => (
                <option key={r.channel} value={r.channel}>
                  Ch {r.channel} · {r.name} (GPIO {r.gpio})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#9eb0c9] mb-1.5">
              Timer Mode
            </label>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 dark:bg-[#0b1220] p-1">
              {[
                {id: 'daily', label: 'Daily Window'},
                {id: 'interval', label: 'Interval Loop'},
                {id: 'countdown', label: 'Countdown'},
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id as 'daily' | 'interval' | 'countdown')}
                  className={`min-h-[40px] rounded-lg text-xs font-medium transition ${
                    type === opt.id
                      ? 'bg-white dark:bg-[#1e2d47] text-slate-900 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-[#9eb0c9]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {type === 'daily' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-[#9eb0c9] mb-1">Turn ON</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-[#9eb0c9] mb-1">Turn OFF</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-[#9eb0c9] mb-1.5">Active Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`min-h-[38px] px-2.5 rounded-lg text-xs font-medium border transition ${
                        days.includes(d)
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'border-slate-200 dark:border-[#263750] text-slate-500'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'interval' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-[#9eb0c9] mb-1">
                  Run Every (mins)
                </label>
                <input
                  type="number"
                  min={5}
                  max={720}
                  value={everyMins}
                  onChange={(e) => setEveryMins(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-[#9eb0c9] mb-1">
                  Stay ON For (mins)
                </label>
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {type === 'countdown' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-[#9eb0c9] mb-1">
                  Delay (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={countdownMins}
                  onChange={(e) => setCountdownMins(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-[#9eb0c9] mb-1">
                  Action at 00:00
                </label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as 'on' | 'off')}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-sm text-slate-900 dark:text-white"
                >
                  <option value="off">Turn OFF</option>
                  <option value="on">Turn ON</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canManage}
          className="w-full min-h-[46px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add Schedule Rule
        </button>
      </form>

      {/* Active Schedules List */}
      <div className="lg:col-span-7 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Active Appliance Schedules
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
            {state.schedules.filter((s) => s.enabled).length} of {state.schedules.length} rules armed on hub
          </p>
        </div>

        {state.schedules.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-10 text-center text-sm text-slate-500 dark:text-[#9eb0c9]">
            No appliance schedules configured yet.
          </div>
        ) : (
          <div className="space-y-3">
            {state.schedules.map((sch) => {
              const relay = state.relays.find((r) => r.channel === sch.channel);
              const Icon = sch.type === 'interval' ? Repeat : sch.type === 'countdown' ? Timer : Clock;
              return (
                <div
                  key={sch.id}
                  className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#0b1220] text-emerald-500">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {sch.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-[#9eb0c9]">
                        {relay?.name || `Channel ${sch.channel}`} · GPIO {relay?.gpio ?? '?'}
                      </p>
                      <p className="mt-1 text-xs font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {sch.type === 'daily' &&
                          `ON ${sch.startTime} -> OFF ${sch.endTime} · ${sch.days.length === 7 ? 'Every day' : sch.days.join(', ')}`}
                        {sch.type === 'interval' &&
                          `Pulse ON ${sch.intervalDurationMins}m every ${sch.intervalEveryMins}m`}
                        {sch.type === 'countdown' &&
                          `Countdown ${formatRemaining(sch.countdownRemainingSecs)} -> Turn ${sch.action.toUpperCase()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => onToggleSchedule(sch.id, !sch.enabled)}
                      className={`min-h-[44px] min-w-[78px] rounded-xl px-3.5 text-xs font-bold transition disabled:opacity-40 ${
                        sch.enabled
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-200 dark:bg-[#263750] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {sch.enabled ? 'ACTIVE' : 'PAUSED'}
                    </button>
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => onDeleteSchedule(sch.id)}
                      aria-label={`Delete ${sch.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 dark:border-[#263750] text-slate-500 hover:text-red-500 hover:border-red-500/50 transition disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

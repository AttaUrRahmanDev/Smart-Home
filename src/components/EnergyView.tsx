import React, {useMemo, useState} from 'react';
import {Download, Search, TrendingUp, Zap} from 'lucide-react';
import type {HomeState} from '../types/iot';

interface EnergyViewProps {
  state: HomeState;
  onUpdateElectricityRate: (rate: number) => Promise<unknown>;
}

export const EnergyView: React.FC<EnergyViewProps> = ({state, onUpdateElectricityRate}) => {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [rateDraft, setRateDraft] = useState(String(state.hardware.electricityRatePerKwh));

  const history = state.telemetryHistory;
  const maxWatts = useMemo(
    () => Math.max(100, ...history.map((p) => p.totalWatts)),
    [history]
  );

  const totalDailyKwh = useMemo(
    () => state.relays.reduce((sum, r) => sum + r.dailyKwh, 0),
    [state.relays]
  );
  const totalLifetimeKwh = useMemo(
    () => state.relays.reduce((sum, r) => sum + r.totalKwh, 0),
    [state.relays]
  );
  const currentWatts = useMemo(
    () => Number((state.relays.reduce((sum, r) => sum + (r.state ? r.ratedWatts : 0), 0) + 6.5).toFixed(1)),
    [state.relays]
  );

  const estDailyCost = totalDailyKwh * state.hardware.electricityRatePerKwh;
  const estMonthlyCost = estDailyCost * 30;

  // Build SVG polyline/area coordinates
  const svgWidth = 760;
  const svgHeight = 220;
  const padX = 16;
  const padY = 18;
  const chartW = svgWidth - padX * 2;
  const chartH = svgHeight - padY * 2;

  const points = useMemo(() => {
    if (history.length === 0) return [];
    return history.map((pt, idx) => {
      const x = padX + (idx / Math.max(1, history.length - 1)) * chartW;
      const y = padY + chartH - (pt.totalWatts / (maxWatts * 1.12)) * chartH;
      return {x, y, pt};
    });
  }, [history, chartW, chartH, maxWatts]);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padY + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padY + chartH).toFixed(1)} Z`
      : '';

  const filteredLogs = useMemo(() => {
    return state.usageLogs.filter((log) => {
      const matchesSource = sourceFilter === 'all' || log.source === sourceFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        log.device.toLowerCase().includes(q) ||
        log.event.toLowerCase().includes(q) ||
        log.actor.toLowerCase().includes(q);
      return matchesSource && matchesSearch;
    });
  }, [state.usageLogs, sourceFilter, search]);

  const activeHover = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : points[points.length - 1];

  return (
    <div className="space-y-8">
      {/* KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-5">
          <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">Real-Time Draw</p>
          <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {currentWatts.toFixed(0)} <span className="text-base font-normal text-slate-400">W</span>
          </p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Updates every 5s</p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-5">
          <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">Today&apos;s Energy</p>
          <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {totalDailyKwh.toFixed(2)} <span className="text-base font-normal text-slate-400">kWh</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#9eb0c9] font-mono tabular-nums">
            Est. ${estDailyCost.toFixed(2)} today
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-5">
          <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">Projected Monthly</p>
          <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            ${estMonthlyCost.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#9eb0c9] font-mono tabular-nums">
            At ${state.hardware.electricityRatePerKwh.toFixed(2)}/kWh
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-5">
          <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">Cumulative Total</p>
          <p className="mt-2 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {totalLifetimeKwh.toFixed(1)} <span className="text-base font-normal text-slate-400">kWh</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#9eb0c9]">All 4 relay circuits</p>
        </div>
      </section>

      {/* Power Trend Chart + Per-Device Share */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Real-Time Power Consumption Trend
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
                Rolling wattmeter history across all 4 GPIO relay loads
              </p>
            </div>
            {activeHover && (
              <div className="text-right font-mono tabular-nums">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {activeHover.pt.totalWatts.toFixed(1)} W
                </p>
                <p className="text-[11px] text-slate-500 dark:text-[#9eb0c9]">
                  {activeHover.pt.label} · {activeHover.pt.temperature.toFixed(1)}°C
                </p>
              </div>
            )}
          </div>

          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-56 select-none"
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id="powerFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#53e3a1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#53e3a1" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {[0.25, 0.5, 0.75, 1].map((frac) => {
                const y = padY + chartH * (1 - frac);
                const labelVal = Math.round(maxWatts * 1.12 * frac);
                return (
                  <g key={frac}>
                    <line
                      x1={padX}
                      y1={y}
                      x2={svgWidth - padX}
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-200 dark:text-[#263750]"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padX}
                      y={y - 4}
                      fontSize="10"
                      className="fill-slate-400 font-mono"
                    >
                      {labelVal}W
                    </text>
                  </g>
                );
              })}

              {areaPath && <path d={areaPath} fill="url(#powerFill)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#53e3a1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Hover targets */}
              {points.map((p, idx) => (
                <g key={p.pt.timestamp + idx}>
                  <rect
                    x={p.x - chartW / Math.max(2, points.length * 2)}
                    y={padY}
                    width={chartW / Math.max(1, points.length)}
                    height={chartH}
                    fill="transparent"
                    onMouseEnter={() => setHoverIdx(idx)}
                  />
                  {(hoverIdx === idx || (hoverIdx === null && idx === points.length - 1)) && (
                    <>
                      <line
                        x1={p.x}
                        y1={padY}
                        x2={p.x}
                        y2={padY + chartH}
                        stroke="#53e3a1"
                        strokeOpacity="0.35"
                        strokeDasharray="3 3"
                      />
                      <circle cx={p.x} cy={p.y} r="5" fill="#53e3a1" stroke="#0b1220" strokeWidth="2" />
                    </>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Appliance Breakdown + Tariff Rate */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              Appliance Share
            </h2>
          </div>

          <div className="space-y-4">
            {state.relays.map((relay) => {
              const pct = totalDailyKwh > 0 ? Math.round((relay.dailyKwh / totalDailyKwh) * 100) : 0;
              return (
                <div key={relay.channel} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {relay.name}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 dark:text-[#9eb0c9]">
                      {relay.dailyKwh.toFixed(2)} kWh ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#0b1220] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        relay.state ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                      style={{width: `${Math.max(4, pct)}%`}}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const parsed = Number(rateDraft);
              if (!Number.isNaN(parsed) && parsed >= 0) {
                onUpdateElectricityRate(parsed);
              }
            }}
            className="pt-4 border-t border-slate-100 dark:border-[#263750]/60 space-y-2"
          >
            <label className="block text-xs font-medium text-slate-600 dark:text-[#9eb0c9]">
              Utility Tariff ($ / kWh)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={rateDraft}
                onChange={(e) => setRateDraft(e.target.value)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-sm font-mono text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="min-h-[44px] rounded-xl bg-slate-900 dark:bg-emerald-500 px-4 text-xs font-semibold text-white dark:text-slate-950"
              >
                Update
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Usage Record Logs */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-[#263750] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Usage Record Logs
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
              Audit trail of relay switching, automated schedules, voice actions, and power draw
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter device or user..."
                className="min-h-[44px] w-48 rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] pl-9 pr-3 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-[#0b1220] p-1">
              {['all', 'manual', 'schedule', 'voice', 'automation'].map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSourceFilter(src)}
                  className={`min-h-[36px] rounded-lg px-2.5 text-xs font-medium capitalize transition ${
                    sourceFilter === src
                      ? 'bg-white dark:bg-[#1e2d47] text-slate-900 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-[#9eb0c9]'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>

            <a
              href="/api/logs/export"
              download="volthome-usage-logs.csv"
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#263750] px-3.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-emerald-500/60"
            >
              <Download className="h-4 w-4 text-emerald-500" />
              Export CSV
            </a>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#263750] text-xs text-slate-500 dark:text-[#9eb0c9]">
                <th className="py-3 px-5 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium">Device</th>
                <th className="py-3 px-4 font-medium">Event</th>
                <th className="py-3 px-4 font-medium">Actor</th>
                <th className="py-3 px-4 font-medium">Source</th>
                <th className="py-3 px-5 font-medium text-right">Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#263750]/60 text-sm">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-500 dark:text-[#9eb0c9]">
                    No usage logs match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 30).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#18263d]/60 transition-colors">
                    <td className="py-3 px-5 text-xs font-mono tabular-nums text-slate-500 dark:text-[#9eb0c9] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {log.device}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{log.event}</td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-[#9eb0c9]">{log.actor}</td>
                    <td className="py-3 px-4 text-xs capitalize text-slate-500 dark:text-[#9eb0c9]">{log.source}</td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-emerald-400">
                      {log.watts} W
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

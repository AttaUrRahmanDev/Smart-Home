import React, {useState} from 'react';
import type {User} from 'firebase/auth';
import {Bell, Globe, Plus, Server, ShieldCheck, Trash2, UserPlus, Users, Wifi} from 'lucide-react';
import type {AlertRule, ConnectionMode, HomeState, HouseholdUser, UserRole} from '../types/iot';
import {GoogleDrivePanel} from './GoogleDrivePanel';

interface AccessAlertsViewProps {
  state: HomeState;
  activeUser: HouseholdUser | null;
  activeUserId: string;
  onSelectUser: (id: string) => void;
  onCreateUser: (payload: Partial<HouseholdUser>) => Promise<unknown>;
  onUpdateUser: (id: string, patch: Partial<HouseholdUser>) => Promise<unknown>;
  onDeleteUser: (id: string) => Promise<unknown>;
  notifPermission: NotificationPermission;
  onRequestNotif: () => Promise<NotificationPermission>;
  onCreateAlertRule: (payload: Partial<AlertRule>) => Promise<unknown>;
  onToggleAlertRule: (id: string, patch: Partial<AlertRule>) => Promise<unknown>;
  onDeleteAlertRule: (id: string) => Promise<unknown>;
  onSendTestAlert: (device: string, message: string) => Promise<unknown>;
  onMarkAllRead: () => Promise<unknown>;
  connSettings: {
    mode: ConnectionMode;
    lanIp: string;
    pythonAnywhereUrl: string;
    apiKey: string;
  };
  onUpdateConnSettings: (patch: Partial<{mode: ConnectionMode; lanIp: string; pythonAnywhereUrl: string; apiKey: string}>) => void;
  externalError: string | null;
  driveUser: User | null;
  driveToken: string | null;
  onDriveSignIn: () => Promise<void>;
  onDriveSignOut: () => Promise<void>;
  onRestoreBackup: (json: Partial<HomeState>) => Promise<void>;
}

export const AccessAlertsView: React.FC<AccessAlertsViewProps> = ({
  state,
  activeUser,
  activeUserId,
  onSelectUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  notifPermission,
  onRequestNotif,
  onCreateAlertRule,
  onToggleAlertRule,
  onDeleteAlertRule,
  onSendTestAlert,
  onMarkAllRead,
  connSettings,
  onUpdateConnSettings,
  externalError,
  driveUser,
  driveToken,
  onDriveSignIn,
  onDriveSignOut,
  onRestoreBackup,
}) => {
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Member');

  const [alertName, setAlertName] = useState('');
  const [alertCondition, setAlertCondition] = useState<AlertRule['condition']>('temp_above');
  const [alertThreshold, setAlertThreshold] = useState(28);
  const [alertChannel, setAlertChannel] = useState<number>(4);

  const [lanDraft, setLanDraft] = useState(connSettings.lanIp);
  const [paDraft, setPaDraft] = useState(connSettings.pythonAnywhereUrl);
  const [keyDraft, setKeyDraft] = useState(connSettings.apiKey);

  const isAdmin = activeUser?.role === 'Admin';

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    await onCreateUser({name: newUserName.trim(), role: newUserRole});
    setNewUserName('');
  };

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateAlertRule({
      name: alertName.trim() || 'Custom Device Event Alert',
      condition: alertCondition,
      threshold: Number(alertThreshold),
      channel: alertCondition === 'relay_on_change' ? alertChannel : null,
      enabled: true,
      pushEnabled: true,
    });
    setAlertName('');
  };

  return (
    <div className="space-y-8">
      {/* Connectivity Switcher: App Server vs Local LAN vs PythonAnywhere */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-500" />
            Connectivity Mode (Cloud Server &amp; Offline Local LAN)
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
            Switch between the built-in App Server WebSocket, direct offline ESP32 Wi-Fi LAN, or your PythonAnywhere Flask web app
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'server' as ConnectionMode,
              title: 'App Server (Live Sync)',
              desc: 'Real-time WebSocket hub + server schedules & energy history.',
              Icon: Server,
            },
            {
              id: 'lan' as ConnectionMode,
              title: 'Local LAN (Offline Wi-Fi)',
              desc: 'Direct browser-to-ESP32 HTTP polling on your 2.4 GHz router.',
              Icon: Wifi,
            },
            {
              id: 'pythonanywhere' as ConnectionMode,
              title: 'PythonAnywhere Cloud',
              desc: 'Remote internet control via your free Flask SQLite web app.',
              Icon: Globe,
            },
          ].map(({id, title, desc, Icon}) => {
            const active = connSettings.mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onUpdateConnSettings({mode: id})}
                className={`min-h-[84px] rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${active ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {active ? 'ACTIVE' : 'SELECT'}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-[#9eb0c9]">{desc}</p>
              </button>
            );
          })}
        </div>

        {connSettings.mode === 'lan' && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="url"
              value={lanDraft}
              onChange={(e) => setLanDraft(e.target.value)}
              placeholder="http://192.168.1.45"
              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3.5 text-sm font-mono text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => onUpdateConnSettings({lanIp: lanDraft})}
              className="min-h-[44px] rounded-xl bg-emerald-500 px-5 text-xs font-semibold text-slate-950"
            >
              Connect ESP32 IP
            </button>
          </div>
        )}

        {connSettings.mode === 'pythonanywhere' && (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <input
              type="url"
              value={paDraft}
              onChange={(e) => setPaDraft(e.target.value)}
              placeholder="https://yourusername.pythonanywhere.com"
              className="sm:col-span-6 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3.5 text-sm font-mono text-slate-900 dark:text-white"
            />
            <input
              type="text"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="X-API-Key secret"
              className="sm:col-span-4 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3.5 text-sm font-mono text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => onUpdateConnSettings({pythonAnywhereUrl: paDraft, apiKey: keyDraft})}
              className="sm:col-span-2 min-h-[44px] rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-slate-950"
            >
              Save
            </button>
          </div>
        )}

        {externalError && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-300">
            {externalError}
          </div>
        )}
      </section>

      {/* Multi-User Access & Push Notifications Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Household Users */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                Household Access &amp; Roles
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
                Switch active home profile or configure Admin, Member, and Guest permissions
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {state.users.map((usr) => {
              const isSelected = usr.id === activeUserId;
              return (
                <div
                  key={usr.id}
                  className={`rounded-xl border p-4 space-y-3 transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/[0.06]'
                      : 'border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {usr.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
                        Role: {usr.role} ·{' '}
                        {[
                          usr.canControlLights && 'Lights',
                          usr.canAdjustThermostat && 'Thermostat',
                          usr.canViewCameras && 'Cameras',
                          usr.canManageSchedules && 'Schedules',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectUser(usr.id)}
                        className={`min-h-[40px] rounded-xl px-3 text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950'
                            : 'border border-slate-300 dark:border-[#263750] text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Use Profile'}
                      </button>
                      {isAdmin && state.users.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteUser(usr.id)}
                          aria-label={`Remove ${usr.name}`}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-[#263750] text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/70 dark:border-[#263750]/70">
                      {(
                        [
                          ['canControlLights', 'Lights'],
                          ['canAdjustThermostat', 'Thermostat'],
                          ['canViewCameras', 'Cameras'],
                          ['canManageSchedules', 'Schedules'],
                        ] as const
                      ).map(([field, label]) => (
                        <button
                          key={field}
                          type="button"
                          onClick={() => onUpdateUser(usr.id, {[field]: !usr[field]})}
                          className={`min-h-[34px] rounded-lg px-2.5 text-[11px] font-medium border transition ${
                            usr[field]
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'border-slate-200 dark:border-[#263750] text-slate-400'
                          }`}
                        >
                          {usr[field] ? '✓ ' : ''}
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {isAdmin && (
            <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-2 pt-2">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Member name"
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-sm text-slate-900 dark:text-white"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-sm text-slate-900 dark:text-white"
              >
                <option value="Member">Member</option>
                <option value="Guest">Guest</option>
                <option value="Admin">Admin</option>
              </select>
              <button
                type="submit"
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-slate-950"
              >
                <UserPlus className="h-4 w-4" />
                Add
              </button>
            </form>
          )}
        </section>

        {/* Custom Push Notifications */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-500" />
                Device Push Notification Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
                Mobile PWA alerts for temperature spikes, power surges, motion &amp; relay events
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRequestNotif}
                className={`min-h-[40px] rounded-xl px-3.5 text-xs font-semibold transition ${
                  notifPermission === 'granted'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                    : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {notifPermission === 'granted' ? 'Push Enabled' : 'Enable Push Alerts'}
              </button>
              <button
                type="button"
                onClick={() => onSendTestAlert('Front Porch Cam', 'Test push alert from VoltHome IoT.')}
                className="min-h-[40px] rounded-xl border border-slate-200 dark:border-[#263750] px-3 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                Test Alert
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {state.alertRules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {rule.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#9eb0c9] font-mono">
                    {rule.condition === 'temp_above' && `Trigger if DHT11 >= ${rule.threshold}°C`}
                    {rule.condition === 'power_above' && `Trigger if Load >= ${rule.threshold} W`}
                    {rule.condition === 'motion_detected' && 'Trigger on armed camera PIR motion'}
                    {rule.condition === 'relay_on_change' &&
                      `Trigger on ${rule.channel ? `Relay Ch ${rule.channel}` : 'any relay'} switch`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleAlertRule(rule.id, {enabled: !rule.enabled})}
                    className={`min-h-[38px] rounded-lg px-3 text-xs font-bold ${
                      rule.enabled
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-[#263750] text-slate-500'
                    }`}
                  >
                    {rule.enabled ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteAlertRule(rule.id)}
                    aria-label={`Delete ${rule.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddAlert} className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2">
            <input
              type="text"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder="Rule name"
              className="sm:col-span-4 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-3 text-xs text-slate-900 dark:text-white"
            />
            <select
              value={alertCondition}
              onChange={(e) => setAlertCondition(e.target.value as AlertRule['condition'])}
              className="sm:col-span-4 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-2.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="temp_above">Temp Above (°C)</option>
              <option value="power_above">Power Above (W)</option>
              <option value="relay_on_change">Relay Switched</option>
              <option value="motion_detected">Camera Motion</option>
            </select>
            {alertCondition === 'relay_on_change' ? (
              <select
                value={alertChannel}
                onChange={(e) => setAlertChannel(Number(e.target.value))}
                className="sm:col-span-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-2 text-xs text-slate-900 dark:text-white"
              >
                {state.relays.map((r) => (
                  <option key={r.channel} value={r.channel}>
                    Ch {r.channel}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="sm:col-span-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] px-2.5 text-xs font-mono text-slate-900 dark:text-white"
              />
            )}
            <button
              type="submit"
              className="sm:col-span-2 min-h-[44px] inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-500 px-3 text-xs font-semibold text-slate-950"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </form>

          {/* Recent Alert Events Feed */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#263750]/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Recent Alert Events ({state.notifications.filter((n) => !n.read).length} unread)
              </span>
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
              {state.notifications.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                    n.read
                      ? 'border-slate-200 dark:border-[#263750] opacity-75'
                      : 'border-emerald-500/40 bg-emerald-500/[0.05]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{n.title}</span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-600 dark:text-[#9eb0c9]">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Google Drive Cloud Backup & File Browser */}
      <GoogleDrivePanel
        state={state}
        driveUser={driveUser}
        driveToken={driveToken}
        onSignIn={onDriveSignIn}
        onSignOut={onDriveSignOut}
        onRestoreBackup={onRestoreBackup}
      />
    </div>
  );
};

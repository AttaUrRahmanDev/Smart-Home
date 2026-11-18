import React, {useEffect, useState} from 'react';
import type {User} from 'firebase/auth';
import {
  Activity,
  Bell,
  Clock,
  Cpu,
  HardDrive,
  Home,
  Mic,
  Moon,
  Sun,
  Users,
  WifiOff,
} from 'lucide-react';
import {useIoTHub} from './hooks/useIoTHub';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import {
  initDriveAuth,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  uploadBlobToDrive,
} from './lib/googleDriveAuth';
import {PWAInstallButton} from './components/PWAInstallButton';
import {DashboardView} from './components/DashboardView';
import {EnergyView} from './components/EnergyView';
import {SchedulesView} from './components/SchedulesView';
import {HardwareCodeView} from './components/HardwareCodeView';
import {AccessAlertsView} from './components/AccessAlertsView';
import {VoiceCommandBar} from './components/VoiceCommandBar';
import type {HomeState} from './types/iot';

type TabId = 'dashboard' | 'energy' | 'schedules' | 'hardware' | 'access';

const NAV_ITEMS: Array<{id: TabId; label: string; mobileLabel: string; Icon: React.FC<{className?: string}>}> = [
  {id: 'dashboard', label: 'Dashboard', mobileLabel: 'Home', Icon: Home},
  {id: 'energy', label: 'Energy', mobileLabel: 'Energy', Icon: Activity},
  {id: 'schedules', label: 'Schedules', mobileLabel: 'Timers', Icon: Clock},
  {id: 'hardware', label: 'ESP32 & Code', mobileLabel: 'Code', Icon: Cpu},
  {id: 'access', label: 'Drive & Access', mobileLabel: 'Drive', Icon: Users},
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [driveUser, setDriveUser] = useState<User | null>(null);
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  const {
    state,
    wsConnected,
    connSettings,
    updateConnSettings,
    externalError,
    activeUser,
    activeUserId,
    setActiveUserId,
    notifPermission,
    requestNotifications,
    lastVoiceFeedback,
    toggleRelay,
    updateRelayMeta,
    updateThermostat,
    updateCamera,
    createSchedule,
    toggleSchedule,
    deleteSchedule,
    createAlertRule,
    toggleAlertRule,
    deleteAlertRule,
    sendTestAlert,
    markNotificationsRead,
    createUser,
    updateUser,
    deleteUser,
    updateHardwareConfig,
    executeVoiceCommand,
  } = useIoTHub();

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    return initDriveAuth(
      (user, token) => {
        setDriveUser(user);
        setDriveToken(token);
      },
      () => {
        setDriveUser(null);
        setDriveToken(null);
      }
    );
  }, []);

  const handleDriveSignIn = async () => {
    const res = await signInWithGoogleDrive();
    setDriveUser(res.user);
    setDriveToken(res.accessToken);
  };

  const handleDriveSignOut = async () => {
    await signOutGoogleDrive();
    setDriveUser(null);
    setDriveToken(null);
  };

  const handleSaveSnapshotToDrive = async (filename: string, blob: Blob) => {
    if (!driveToken) return;
    await uploadBlobToDrive(driveToken, filename, blob, 'image/png');
  };

  const handleRestoreBackup = async (backup: Partial<HomeState>) => {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(backup),
    });
    if (!res.ok) {
      throw new Error('Failed restoring home configuration');
    }
  };

  const unreadAlerts = state?.notifications.filter((n) => !n.read).length ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b1220] text-slate-900 dark:text-[#eef5ff] pb-24 md:pb-10 transition-colors">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 md:h-16 border-b border-slate-200 dark:border-[#263750] bg-white/90 dark:bg-[#0d1728]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            VoltHome
          </button>

          <nav className="hidden md:flex items-center gap-6" aria-label="Primary Navigation">
            {NAV_ITEMS.map(({id, label}) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isActive
                      ? 'border-emerald-500 text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-500 dark:text-[#9eb0c9] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              className="min-h-[40px] inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition whitespace-nowrap shrink-0"
            >
              <Mic className="h-4 w-4" />
              Voice Control
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 space-y-6">
        <section
          aria-label="Workspace Controls"
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#263750]"
        >
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {activeTab === 'dashboard' && 'Smart Home Control'}
              {activeTab === 'energy' && 'Energy & Usage Reports'}
              {activeTab === 'schedules' && 'Appliance Schedulers'}
              {activeTab === 'hardware' && 'ESP32 Pinout, Cameras & Firmware'}
              {activeTab === 'access' && 'Google Drive, Access & Network'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-[#9eb0c9]">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                <span
                  className={`h-2 w-2 rounded-full ${
                    connSettings.mode === 'server'
                      ? wsConnected
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                      : externalError
                        ? 'bg-red-500'
                        : 'bg-emerald-500'
                  }`}
                />
                {connSettings.mode === 'server' && (wsConnected ? 'App Server Live' : 'Reconnecting')}
                {connSettings.mode === 'lan' && `Local LAN (${connSettings.lanIp})`}
                {connSettings.mode === 'pythonanywhere' && 'PythonAnywhere Cloud'}
              </span>
              <span aria-hidden="true">·</span>
              <span>ESP32-WROOM-32 + ESP32-CAM</span>
              {driveToken && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('access')}
                    className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <HardDrive className="h-3.5 w-3.5" />
                    Drive Connected
                  </button>
                </>
              )}
              {unreadAlerts > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('access')}
                    className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    {unreadAlerts} unread alert{unreadAlerts > 1 ? 's' : ''}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!driveToken && (
              <button
                type="button"
                onClick={handleDriveSignIn}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#263750] bg-white px-3.5 text-xs font-medium text-slate-800 hover:bg-slate-50 transition whitespace-nowrap"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Sign in with Google
              </button>
            )}

            {state && (
              <select
                aria-label="Switch active household profile"
                value={activeUserId}
                onChange={(e) => setActiveUserId(e.target.value)}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] px-3 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {state.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] text-slate-700 dark:text-slate-200 hover:border-emerald-500/60 transition"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <PWAInstallButton />
          </div>
        </section>

        {!isOnline && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-300">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              Browser is offline. Cached device state is displayed—switch to Local LAN mode in Drive &amp; Access if controlling an ESP32 on an offline Wi-Fi router.
            </span>
          </div>
        )}

        {!state ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-32 rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                state={state}
                activeUser={activeUser}
                driveToken={driveToken}
                onSaveSnapshotToDrive={handleSaveSnapshotToDrive}
                onToggleRelay={toggleRelay}
                onUpdateRelayMeta={updateRelayMeta}
                onUpdateThermostat={updateThermostat}
                onUpdateCamera={updateCamera}
              />
            )}
            {activeTab === 'energy' && (
              <EnergyView
                state={state}
                onUpdateElectricityRate={(rate) => updateHardwareConfig({electricityRatePerKwh: rate})}
              />
            )}
            {activeTab === 'schedules' && (
              <SchedulesView
                state={state}
                activeUser={activeUser}
                onCreateSchedule={createSchedule}
                onToggleSchedule={toggleSchedule}
                onDeleteSchedule={deleteSchedule}
              />
            )}
            {activeTab === 'hardware' && <HardwareCodeView />}
            {activeTab === 'access' && (
              <AccessAlertsView
                state={state}
                activeUser={activeUser}
                activeUserId={activeUserId}
                onSelectUser={setActiveUserId}
                onCreateUser={createUser}
                onUpdateUser={updateUser}
                onDeleteUser={deleteUser}
                notifPermission={notifPermission}
                onRequestNotif={requestNotifications}
                onCreateAlertRule={createAlertRule}
                onToggleAlertRule={toggleAlertRule}
                onDeleteAlertRule={deleteAlertRule}
                onSendTestAlert={sendTestAlert}
                onMarkAllRead={markNotificationsRead}
                connSettings={connSettings}
                onUpdateConnSettings={updateConnSettings}
                externalError={externalError}
                driveUser={driveUser}
                driveToken={driveToken}
                onDriveSignIn={handleDriveSignIn}
                onDriveSignOut={handleDriveSignOut}
                onRestoreBackup={handleRestoreBackup}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Fixed Bottom Thumb Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-[#263750] bg-white/95 dark:bg-[#0d1728]/95 backdrop-blur-md pb-safe"
      >
        <div className="grid grid-cols-5 h-16 items-center">
          {NAV_ITEMS.map(({id, mobileLabel, Icon}) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-[#9eb0c9]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Voice Command Modal */}
      <VoiceCommandBar
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onExecute={(cmd) => executeVoiceCommand(cmd, (tab) => setActiveTab(tab as TabId))}
        lastFeedback={lastVoiceFeedback}
      />
    </div>
  );
}

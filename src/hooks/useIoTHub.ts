import {useCallback, useEffect, useRef, useState} from 'react';
import type {
  AlertRule,
  ConnectionMode,
  HomeState,
  HouseholdUser,
  NotificationItem,
  ScheduleRule,
  ThermostatMode,
} from '../types/iot';

const CACHE_KEY = 'volthome_cached_state_v1';
const SETTINGS_KEY = 'volthome_conn_settings_v1';

interface ConnectionSettings {
  mode: ConnectionMode;
  lanIp: string;
  pythonAnywhereUrl: string;
  apiKey: string;
}

const DEFAULT_SETTINGS: ConnectionSettings = {
  mode: 'server',
  lanIp: 'http://192.168.1.45',
  pythonAnywhereUrl: 'https://yourusername.pythonanywhere.com',
  apiKey: 'CHANGE_THIS_SHARED_SECRET',
};

export function useIoTHub() {
  const [state, setState] = useState<HomeState | null>(() => {
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      return saved ? (JSON.parse(saved) as HomeState) : null;
    } catch {
      return null;
    }
  });

  const [connSettings, setConnSettings] = useState<ConnectionSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? {...DEFAULT_SETTINGS, ...JSON.parse(saved)} : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [activeUserId, setActiveUserId] = useState<string>('usr-admin');
  const [wsConnected, setWsConnected] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [lastVoiceFeedback, setLastVoiceFeedback] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const wsRef = useRef<WebSocket | null>(null);
  const activeUserRef = useRef(activeUserId);
  activeUserRef.current = activeUserId;

  const updateConnSettings = useCallback((patch: Partial<ConnectionSettings>) => {
    setConnSettings((prev) => {
      const next = {...prev, ...patch};
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
    setExternalError(null);
  }, []);

  const triggerBrowserPush = useCallback((item: NotificationItem) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(item.title, {
            body: item.message,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: item.device,
          });
        });
      } else {
        new Notification(item.title, {
          body: item.message,
          icon: '/pwa-192x192.png',
        });
      }
    } catch {
      // Ignore notification fallback errors in restricted iframes
    }
  }, []);

  const requestNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied' as NotificationPermission;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    return perm;
  }, []);

  // Save state to localStorage for offline resilience
  useEffect(() => {
    if (state) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(state));
      } catch {
        // ignore quota
      }
    }
  }, [state]);

  // Initial HTTP fetch + WebSocket connection for App Server
  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const loadInitial = async () => {
      try {
        const res = await fetch('/api/state', {cache: 'no-store'});
        if (res.ok && !cancelled) {
          const data = (await res.json()) as HomeState;
          setState(data);
        }
      } catch {
        // Offline cache already loaded if present
      }
    };
    loadInitial();

    const connectWs = () => {
      if (cancelled) return;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'state:sync') {
            setState(msg.payload as HomeState);
          } else if (msg.type === 'relay:updated') {
            setState((prev) => (prev ? {...prev, ...msg.payload} : prev));
          } else if (msg.type === 'thermostat:updated') {
            setState((prev) => (prev ? {...prev, thermostat: msg.payload} : prev));
          } else if (msg.type === 'camera:updated') {
            setState((prev) => (prev ? {...prev, cameras: msg.payload} : prev));
          } else if (msg.type === 'schedules:updated') {
            setState((prev) => (prev ? {...prev, schedules: msg.payload} : prev));
          } else if (msg.type === 'users:updated') {
            setState((prev) => (prev ? {...prev, users: msg.payload} : prev));
          } else if (msg.type === 'hardware:updated') {
            setState((prev) => (prev ? {...prev, hardware: msg.payload} : prev));
          } else if (msg.type === 'telemetry:point') {
            const p = msg.payload;
            setState((prev) => {
              if (!prev) return prev;
              // Only overwrite live sensor values when in 'server' mode
              if (connSettings.mode !== 'server') return prev;
              return {
                ...prev,
                relays: p.relays ?? prev.relays,
                thermostat: p.thermostat ?? prev.thermostat,
                hardware: p.hardware ?? prev.hardware,
                telemetryHistory: [...prev.telemetryHistory.slice(-47), p.point],
              };
            });
          } else if (msg.type === 'alert:triggered') {
            const alertItem = msg.payload as NotificationItem;
            setState((prev) =>
              prev ? {...prev, notifications: [alertItem, ...prev.notifications].slice(0, 40)} : prev
            );
            triggerBrowserPush(alertItem);
          }
        } catch {
          // ignore malformed ws frame
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!cancelled) {
          reconnectTimer = setTimeout(connectWs, 2500);
        }
      };
    };

    connectWs();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [connSettings.mode, triggerBrowserPush]);

  // External polling loop when user switches to Direct LAN ESP32 or PythonAnywhere Cloud
  useEffect(() => {
    if (connSettings.mode === 'server') {
      setExternalError(null);
      return;
    }

    let stopped = false;
    const baseUrl =
      connSettings.mode === 'lan'
        ? connSettings.lanIp.replace(/\/+$/, '')
        : connSettings.pythonAnywhereUrl.replace(/\/+$/, '');

    const pollExternal = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/status`, {
          cache: 'no-store',
          headers: connSettings.mode === 'pythonanywhere' ? {'X-API-Key': connSettings.apiKey} : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (stopped) return;
        setExternalError(null);
        setState((prev) => {
          if (!prev) return prev;
          const nextRelays = prev.relays.map((r, i) => ({
            ...r,
            state: Array.isArray(data.relays) ? Boolean(data.relays[i]) : r.state,
          }));
          const watts =
            typeof data.watts === 'number'
              ? data.watts
              : nextRelays.reduce((s, r) => s + (r.state ? r.ratedWatts : 0), 0) + 6.5;
          const now = new Date();
          const point = {
            timestamp: now.toISOString(),
            label: now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'}),
            totalWatts: Number(watts.toFixed(1)),
            temperature: typeof data.temperature === 'number' ? data.temperature : prev.thermostat.currentTemp,
            humidity: typeof data.humidity === 'number' ? data.humidity : prev.thermostat.currentHumidity,
            rssi: typeof data.rssi === 'number' ? data.rssi : prev.hardware.rssi,
            channelWatts: [
              nextRelays[0]?.state ? nextRelays[0].ratedWatts : 0,
              nextRelays[1]?.state ? nextRelays[1].ratedWatts : 0,
              nextRelays[2]?.state ? nextRelays[2].ratedWatts : 0,
              nextRelays[3]?.state ? nextRelays[3].ratedWatts : 0,
            ] as [number, number, number, number],
          };
          return {
            ...prev,
            relays: nextRelays,
            thermostat: {
              ...prev.thermostat,
              currentTemp: point.temperature,
              currentHumidity: point.humidity,
              targetTemp: typeof data.targetTemp === 'number' ? data.targetTemp : prev.thermostat.targetTemp,
            },
            hardware: {
              ...prev.hardware,
              rssi: point.rssi,
              esp32Connected: true,
              lastSyncAt: now.toISOString(),
            },
            telemetryHistory: [...prev.telemetryHistory.slice(-47), point],
          };
        });
      } catch (err) {
        if (!stopped) {
          setExternalError(
            connSettings.mode === 'lan'
              ? `Cannot reach ESP32 at ${baseUrl}/api/status (${(err as Error).message}). Ensure phone/PC is on same 2.4GHz Wi-Fi and CORS headers are enabled.`
              : `Cannot reach PythonAnywhere at ${baseUrl}/api/status (${(err as Error).message}).`
          );
        }
      }
    };

    pollExternal();
    const timer = setInterval(pollExternal, connSettings.mode === 'lan' ? 2000 : 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [connSettings]);

  const activeUser =
    state?.users.find((u) => u.id === activeUserId) ?? state?.users[0] ?? null;

  const toggleRelay = useCallback(
    async (channel: number, targetOn: boolean, source: 'manual' | 'voice' = 'manual') => {
      if (connSettings.mode === 'lan' || connSettings.mode === 'pythonanywhere') {
        const base =
          connSettings.mode === 'lan'
            ? connSettings.lanIp.replace(/\/+$/, '')
            : connSettings.pythonAnywhereUrl.replace(/\/+$/, '');
        const res = await fetch(`${base}/api/relay?ch=${channel}&state=${targetOn ? 'on' : 'off'}`, {
          method: 'POST',
          headers: connSettings.mode === 'pythonanywhere' ? {'X-API-Key': connSettings.apiKey} : {},
        });
        if (!res.ok) throw new Error('External relay request failed');
        setState((prev) =>
          prev
            ? {
                ...prev,
                relays: prev.relays.map((r) => (r.channel === channel ? {...r, state: targetOn} : r)),
              }
            : prev
        );
        return {ok: true};
      }

      const res = await fetch(`/api/relay?ch=${channel}&state=${targetOn ? 'on' : 'off'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Actor-Id': activeUserRef.current,
        },
        body: JSON.stringify({channel, state: targetOn, actorId: activeUserRef.current, source}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Relay command rejected');
      return json;
    },
    [connSettings]
  );

  const updateRelayMeta = useCallback(
    async (channel: number, patch: {name?: string; ratedWatts?: number; guestAllowed?: boolean; activeLow?: boolean}) => {
      const res = await fetch(`/api/relay/${channel}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(patch),
      });
      return res.json();
    },
    []
  );

  const updateThermostat = useCallback(
    async (patch: {targetTemp?: number; mode?: ThermostatMode; autoFanLink?: boolean; source?: string}) => {
      if (connSettings.mode === 'pythonanywhere') {
        const base = connSettings.pythonAnywhereUrl.replace(/\/+$/, '');
        await fetch(`${base}/api/thermostat`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'X-API-Key': connSettings.apiKey},
          body: JSON.stringify(patch),
        });
      }
      const res = await fetch('/api/thermostat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-Actor-Id': activeUserRef.current},
        body: JSON.stringify({...patch, actorId: activeUserRef.current}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Thermostat update rejected');
      return json;
    },
    [connSettings]
  );

  const updateCamera = useCallback(
    async (
      id: string,
      patch: {armed?: boolean; nightVision?: boolean; streamUrl?: string; snapshot?: boolean; triggerMotion?: boolean}
    ) => {
      const res = await fetch(`/api/cameras/${id}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-Actor-Id': activeUserRef.current},
        body: JSON.stringify({...patch, actorId: activeUserRef.current}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Camera command rejected');
      return json;
    },
    []
  );

  const createSchedule = useCallback(async (payload: Partial<ScheduleRule>) => {
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Actor-Id': activeUserRef.current},
      body: JSON.stringify({...payload, actorId: activeUserRef.current}),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed creating schedule');
    return json;
  }, []);

  const toggleSchedule = useCallback(async (id: string, enabled: boolean) => {
    await fetch(`/api/schedules/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({enabled}),
    });
  }, []);

  const deleteSchedule = useCallback(async (id: string) => {
    await fetch(`/api/schedules/${id}`, {method: 'DELETE'});
  }, []);

  const createAlertRule = useCallback(async (payload: Partial<AlertRule>) => {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.alertRules) {
      setState((prev) => (prev ? {...prev, alertRules: json.alertRules} : prev));
    }
  }, []);

  const toggleAlertRule = useCallback(async (id: string, patch: Partial<AlertRule>) => {
    const res = await fetch(`/api/alerts/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (json.alertRules) {
      setState((prev) => (prev ? {...prev, alertRules: json.alertRules} : prev));
    }
  }, []);

  const deleteAlertRule = useCallback(async (id: string) => {
    const res = await fetch(`/api/alerts/${id}`, {method: 'DELETE'});
    const json = await res.json();
    if (json.alertRules) {
      setState((prev) => (prev ? {...prev, alertRules: json.alertRules} : prev));
    }
  }, []);

  const sendTestAlert = useCallback(async (device: string, message: string) => {
    await fetch('/api/alerts/test', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({device, message}),
    });
  }, []);

  const markNotificationsRead = useCallback(async () => {
    const res = await fetch('/api/notifications/read-all', {method: 'POST'});
    const json = await res.json();
    if (json.notifications) {
      setState((prev) => (prev ? {...prev, notifications: json.notifications} : prev));
    }
  }, []);

  const createUser = useCallback(async (payload: Partial<HouseholdUser>) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    return res.json();
  }, []);

  const updateUser = useCallback(async (id: string, patch: Partial<HouseholdUser>) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(patch),
    });
    return res.json();
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const res = await fetch(`/api/users/${id}`, {method: 'DELETE'});
    return res.json();
  }, []);

  const updateHardwareConfig = useCallback(async (patch: {localIp?: string; electricityRatePerKwh?: number}) => {
    await fetch('/api/hardware', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(patch),
    });
  }, []);

  const executeVoiceCommand = useCallback(
    async (rawText: string, onNavigate?: (tab: string) => void): Promise<string> => {
      const cmd = rawText.toLowerCase().trim();
      let reply = `Did not recognize "${rawText}". Try "Turn on living room light" or "Set thermostat to 22 degrees".`;

      const speak = (msg: string) => {
        setLastVoiceFeedback(msg);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(msg);
            utter.rate = 1.05;
            window.speechSynthesis.speak(utter);
          } catch {
            // ignore tts errors
          }
        }
      };

      const wantOn = /\b(on|enable|start|activate)\b/.test(cmd);
      const wantOff = /\b(off|disable|stop|deactivate)\b/.test(cmd);

      if (/\ball\s+(lights|devices|relays)\b/.test(cmd) && (wantOn || wantOff)) {
        const target = wantOn;
        for (const ch of [1, 2, 3, 4]) {
          await toggleRelay(ch, target, 'voice').catch(() => null);
        }
        reply = `All four relay channels turned ${target ? 'ON' : 'OFF'}.`;
        speak(reply);
        return reply;
      }

      if (/living/.test(cmd) && (wantOn || wantOff)) {
        await toggleRelay(1, wantOn, 'voice');
        reply = `Living room light on GPIO 16 turned ${wantOn ? 'ON' : 'OFF'}.`;
        speak(reply);
        return reply;
      }

      if (/bedroom/.test(cmd) && (wantOn || wantOff)) {
        await toggleRelay(2, wantOn, 'voice');
        reply = `Bedroom light on GPIO 17 turned ${wantOn ? 'ON' : 'OFF'}.`;
        speak(reply);
        return reply;
      }

      if (/fan|ventilation/.test(cmd) && (wantOn || wantOff)) {
        await toggleRelay(3, wantOn, 'voice');
        reply = `Ventilation fan on GPIO 18 turned ${wantOn ? 'ON' : 'OFF'}.`;
        speak(reply);
        return reply;
      }

      if (/aux|auxiliary|ac|heater|outlet/.test(cmd) && (wantOn || wantOff)) {
        await toggleRelay(4, wantOn, 'voice');
        reply = `Auxiliary load on GPIO 19 turned ${wantOn ? 'ON' : 'OFF'}.`;
        speak(reply);
        return reply;
      }

      const tempMatch = cmd.match(/(?:thermostat|temperature|temp|set)\D*(\d{2})(?:\.(\d))?/);
      if (tempMatch) {
        const val = Number(`${tempMatch[1]}.${tempMatch[2] || '0'}`);
        if (val >= 16 && val <= 31) {
          await updateThermostat({targetTemp: val, source: 'voice'});
          reply = `Thermostat target set to ${val}°C.`;
          speak(reply);
          return reply;
        }
      }

      if (/energy|power|watt|usage|report/.test(cmd)) {
        onNavigate?.('energy');
        reply = 'Opening Energy & Power Consumption Reports.';
        speak(reply);
        return reply;
      }
      if (/schedule|timer|automation/.test(cmd)) {
        onNavigate?.('schedules');
        reply = 'Opening Appliance Schedulers.';
        speak(reply);
        return reply;
      }
      if (/pin|code|esp32|pythonanywhere|firmware|wiring/.test(cmd)) {
        onNavigate?.('hardware');
        reply = 'Opening ESP32 Pinout and Firmware Studio.';
        speak(reply);
        return reply;
      }
      if (/camera|security|porch|garage/.test(cmd)) {
        onNavigate?.('dashboard');
        reply = 'Showing live security cameras on Home Dashboard.';
        speak(reply);
        return reply;
      }

      speak(reply);
      return reply;
    },
    [toggleRelay, updateThermostat]
  );

  return {
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
  };
}

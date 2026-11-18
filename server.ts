import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {WebSocketServer, WebSocket} from 'ws';
import {createServer as createViteServer} from 'vite';
import type {
  AlertRule,
  HomeState,
  HouseholdUser,
  NotificationItem,
  ScheduleRule,
  TelemetryPoint,
  UsageLogEntry,
} from './src/types/iot.ts';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'home-state.json');

function buildInitialTelemetry(): TelemetryPoint[] {
  const now = Date.now();
  const points: TelemetryPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const ts = new Date(now - i * 30 * 60 * 1000);
    const hour = ts.getHours();
    const label = ts.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    const livingOn = hour >= 17 || hour <= 7;
    const bedOn = hour >= 20 || hour <= 6;
    const fanOn = hour >= 12 && hour <= 21;
    const auxOn = hour >= 18 && hour <= 22;
    const c1 = livingOn ? 18 : 0;
    const c2 = bedOn ? 14 : 0;
    const c3 = fanOn ? 55 : 0;
    const c4 = auxOn ? 840 : 0;
    const wave = Math.sin((i / 24) * Math.PI * 2);
    points.push({
      timestamp: ts.toISOString(),
      label,
      totalWatts: Number((c1 + c2 + c3 + c4 + 6.5).toFixed(1)),
      temperature: Number((24.2 + wave * 1.4).toFixed(1)),
      humidity: Math.round(52 - wave * 4),
      rssi: -58 + Math.round(wave * 3),
      channelWatts: [c1, c2, c3, c4],
    });
  }
  return points;
}

function createInitialState(): HomeState {
  const nowIso = new Date().toISOString();
  return {
    relays: [
      {
        channel: 1,
        gpio: 16,
        name: 'Living room light',
        room: 'Living Room',
        category: 'light',
        state: true,
        activeLow: true,
        ratedWatts: 18,
        dailyKwh: 0.14,
        totalKwh: 4.82,
        lastToggledAt: nowIso,
        lastToggledBy: 'Aarav (Admin)',
        guestAllowed: true,
      },
      {
        channel: 2,
        gpio: 17,
        name: 'Bedroom light',
        room: 'Master Bedroom',
        category: 'light',
        state: false,
        activeLow: true,
        ratedWatts: 14,
        dailyKwh: 0.08,
        totalKwh: 2.91,
        lastToggledAt: nowIso,
        lastToggledBy: 'System',
        guestAllowed: true,
      },
      {
        channel: 3,
        gpio: 18,
        name: 'Ventilation fan',
        room: 'Living Room',
        category: 'climate',
        state: false,
        activeLow: true,
        ratedWatts: 55,
        dailyKwh: 0.31,
        totalKwh: 11.45,
        lastToggledAt: nowIso,
        lastToggledBy: 'Auto Thermostat',
        guestAllowed: false,
      },
      {
        channel: 4,
        gpio: 19,
        name: 'Auxiliary load',
        room: 'Utility Bay',
        category: 'appliance',
        state: true,
        activeLow: true,
        ratedWatts: 840,
        dailyKwh: 2.45,
        totalKwh: 48.2,
        lastToggledAt: nowIso,
        lastToggledBy: 'Aarav (Admin)',
        guestAllowed: false,
      },
    ],
    thermostat: {
      currentTemp: 24.8,
      currentHumidity: 52,
      targetTemp: 23.5,
      mode: 'auto',
      autoFanLink: true,
      hysteresis: 0.5,
      hvacActive: false,
    },
    cameras: [
      {
        id: 'cam-porch',
        name: 'Front Porch Cam',
        location: 'Main Entrance',
        gpioNote: 'ESP32-CAM AI-Thinker · GPIO 0/32',
        online: true,
        armed: true,
        nightVision: false,
        motionDetected: false,
        streamUrl: '',
        lastMotionAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        lastSnapshotAt: nowIso,
        resolution: '1280x720 · 15 fps',
      },
      {
        id: 'cam-living',
        name: 'Living Room Cam',
        location: 'Interior Hall',
        gpioNote: 'ESP32-CAM Node 2 · Local RTSP/MJPEG',
        online: true,
        armed: false,
        nightVision: false,
        motionDetected: false,
        streamUrl: '',
        lastMotionAt: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
        lastSnapshotAt: nowIso,
        resolution: '1280x720 · 15 fps',
      },
      {
        id: 'cam-garage',
        name: 'Garage Entry Cam',
        location: 'Side Driveway',
        gpioNote: 'ESP32-CAM Node 3 · PIR GPIO 13',
        online: true,
        armed: true,
        nightVision: true,
        motionDetected: false,
        streamUrl: '',
        lastMotionAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        lastSnapshotAt: nowIso,
        resolution: '800x600 · IR Active',
      },
    ],
    telemetryHistory: buildInitialTelemetry(),
    usageLogs: [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        device: 'Living room light',
        channel: 1,
        event: 'Switched ON (GPIO 16 LOW)',
        actor: 'Aarav',
        watts: 18,
        kwhDelta: 0.006,
        source: 'manual',
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        device: 'Auxiliary load',
        channel: 4,
        event: 'Switched ON (GPIO 19 LOW)',
        actor: 'Aarav',
        watts: 840,
        kwhDelta: 0.168,
        source: 'manual',
      },
      {
        id: 'log-3',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        device: 'Ventilation fan',
        channel: 3,
        event: 'Switched OFF · Temp below 25.0°C',
        actor: 'Thermostat Rule',
        watts: 0,
        kwhDelta: 0.045,
        source: 'automation',
      },
    ],
    schedules: [
      {
        id: 'sch-evening-lights',
        name: 'Evening Porch & Living Lights',
        channel: 1,
        type: 'daily',
        enabled: true,
        action: 'on',
        startTime: '18:30',
        endTime: '23:15',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        intervalEveryMins: 60,
        intervalDurationMins: 15,
        countdownRemainingSecs: 0,
        lastRunAt: null,
      },
      {
        id: 'sch-air-cycle',
        name: 'Hourly Ventilation Purge',
        channel: 3,
        type: 'interval',
        enabled: true,
        action: 'cycle',
        startTime: '08:00',
        endTime: '22:00',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        intervalEveryMins: 60,
        intervalDurationMins: 10,
        countdownRemainingSecs: 0,
        lastRunAt: null,
      },
      {
        id: 'sch-aux-safety',
        name: 'Auxiliary Load Auto-Cutoff',
        channel: 4,
        type: 'countdown',
        enabled: false,
        action: 'off',
        startTime: '00:00',
        endTime: '00:00',
        days: [],
        intervalEveryMins: 30,
        intervalDurationMins: 30,
        countdownRemainingSecs: 1800,
        lastRunAt: null,
      },
    ],
    alertRules: [
      {
        id: 'alert-temp',
        name: 'High Indoor Temperature (DHT11)',
        channel: null,
        condition: 'temp_above',
        threshold: 28,
        enabled: true,
        pushEnabled: true,
        cooldownMins: 10,
        lastTriggeredAt: null,
      },
      {
        id: 'alert-power',
        name: 'High Whole-Home Power Draw',
        channel: null,
        condition: 'power_above',
        threshold: 1000,
        enabled: true,
        pushEnabled: true,
        cooldownMins: 5,
        lastTriggeredAt: null,
      },
      {
        id: 'alert-motion',
        name: 'Security Camera Motion Alert',
        channel: null,
        condition: 'motion_detected',
        threshold: 1,
        enabled: true,
        pushEnabled: true,
        cooldownMins: 1,
        lastTriggeredAt: null,
      },
      {
        id: 'alert-aux',
        name: 'Auxiliary Load State Change',
        channel: 4,
        condition: 'relay_on_change',
        threshold: 1,
        enabled: true,
        pushEnabled: true,
        cooldownMins: 0,
        lastTriggeredAt: null,
      },
    ],
    notifications: [
      {
        id: 'notif-init-1',
        timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        title: 'ESP32 Node Online',
        message: 'DHT11 telemetry active on GPIO 4 · 4-channel relay board ready.',
        severity: 'info',
        device: 'ESP32-WROOM-32',
        read: false,
      },
    ],
    users: [
      {
        id: 'usr-admin',
        name: 'Aarav Sharma',
        role: 'Admin',
        pin: '1234',
        canControlLights: true,
        canAdjustThermostat: true,
        canViewCameras: true,
        canManageSchedules: true,
        lastActiveAt: nowIso,
      },
      {
        id: 'usr-member',
        name: 'Maya Patel',
        role: 'Member',
        pin: '4321',
        canControlLights: true,
        canAdjustThermostat: true,
        canViewCameras: true,
        canManageSchedules: false,
        lastActiveAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
      {
        id: 'usr-guest',
        name: 'Guest Access',
        role: 'Guest',
        pin: '0000',
        canControlLights: true,
        canAdjustThermostat: false,
        canViewCameras: false,
        canManageSchedules: false,
        lastActiveAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
      },
    ],
    hardware: {
      boardName: 'ESP32-WROOM-32 DevKit',
      firmwareVersion: '2.4.0-hybrid',
      rssi: -57,
      localIp: '192.168.1.45',
      uptimeSecs: 14820,
      lastSyncAt: nowIso,
      esp32Connected: true,
      electricityRatePerKwh: 0.14,
    },
  };
}

function loadState(): HomeState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as HomeState;
      if (parsed && Array.isArray(parsed.relays) && parsed.thermostat && Array.isArray(parsed.cameras)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not load persisted home-state.json, initializing defaults:', err);
  }
  return createInitialState();
}

let state: HomeState = loadState();
let saveTimer: NodeJS.Timeout | null = null;

function persistState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, {recursive: true});
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed saving home-state.json:', err);
    }
  }, 250);
}

const wssClients = new Set<WebSocket>();

function broadcast(type: string, payload: unknown) {
  const msg = JSON.stringify({type, payload});
  for (const client of wssClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

function pushNotification(item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) {
  const full: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false,
    ...item,
  };
  state.notifications = [full, ...state.notifications].slice(0, 40);
  broadcast('alert:triggered', full);
  persistState();
}

function appendUsageLog(entry: Omit<UsageLogEntry, 'id' | 'timestamp'>) {
  const full: UsageLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  state.usageLogs = [full, ...state.usageLogs].slice(0, 120);
}

function computeCurrentTotalWatts(): number {
  const relaySum = state.relays.reduce((sum, r) => sum + (r.state ? r.ratedWatts : 0), 0);
  return Number((relaySum + 6.5).toFixed(1));
}

function findUser(actorId?: string): HouseholdUser | undefined {
  if (!actorId) return state.users[0];
  return state.users.find((u) => u.id === actorId) ?? state.users[0];
}

function applyRelayChange(
  channelNum: number,
  targetOn: boolean,
  actorName: string,
  source: UsageLogEntry['source']
): {ok: boolean; error?: string} {
  const relay = state.relays.find((r) => r.channel === channelNum);
  if (!relay) return {ok: false, error: 'Invalid relay channel (expected 1-4)'};

  const changed = relay.state !== targetOn;
  relay.state = targetOn;
  relay.lastToggledAt = new Date().toISOString();
  relay.lastToggledBy = actorName;

  if (changed) {
    appendUsageLog({
      device: relay.name,
      channel: relay.channel,
      event: `Switched ${targetOn ? 'ON' : 'OFF'} (GPIO ${relay.gpio} ${
        relay.activeLow ? (targetOn ? 'LOW' : 'HIGH') : targetOn ? 'HIGH' : 'LOW'
      })`,
      actor: actorName,
      watts: targetOn ? relay.ratedWatts : 0,
      kwhDelta: 0,
      source,
    });

    // Check per-channel alert rules
    for (const rule of state.alertRules) {
      if (rule.enabled && rule.condition === 'relay_on_change' && (rule.channel === null || rule.channel === relay.channel)) {
        const now = Date.now();
        const last = rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).getTime() : 0;
        if (now - last >= rule.cooldownMins * 60 * 1000) {
          rule.lastTriggeredAt = new Date().toISOString();
          pushNotification({
            title: `${relay.name} ${targetOn ? 'Activated' : 'Turned Off'}`,
            message: `GPIO ${relay.gpio} changed by ${actorName} (${targetOn ? `${relay.ratedWatts} W draw` : '0 W idle'}).`,
            severity: relay.channel === 4 && targetOn ? 'warning' : 'info',
            device: relay.name,
          });
        }
      }
    }
  }

  broadcast('relay:updated', {relays: state.relays, usageLogs: state.usageLogs});
  persistState();
  return {ok: true};
}

function evaluateAutomationAndTelemetry() {
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = dayNames[now.getDay()];

  // 1. Evaluate active schedules
  let scheduleChanged = false;
  for (const sch of state.schedules) {
    if (!sch.enabled) continue;

    if (sch.type === 'countdown' && sch.countdownRemainingSecs > 0) {
      sch.countdownRemainingSecs = Math.max(0, sch.countdownRemainingSecs - 5);
      scheduleChanged = true;
      if (sch.countdownRemainingSecs === 0) {
        sch.enabled = false;
        sch.lastRunAt = now.toISOString();
        applyRelayChange(sch.channel, sch.action === 'on', `Timer: ${sch.name}`, 'schedule');
      }
    } else if (sch.type === 'daily' && (sch.days.length === 0 || sch.days.includes(today))) {
      const targetRelay = state.relays.find((r) => r.channel === sch.channel);
      if (targetRelay) {
        const inWindow =
          sch.startTime <= sch.endTime
            ? hhmm >= sch.startTime && hhmm < sch.endTime
            : hhmm >= sch.startTime || hhmm < sch.endTime;
        if (hhmm === sch.startTime && !targetRelay.state) {
          sch.lastRunAt = now.toISOString();
          applyRelayChange(sch.channel, true, `Schedule: ${sch.name}`, 'schedule');
          scheduleChanged = true;
        } else if (hhmm === sch.endTime && targetRelay.state && inWindow === false) {
          sch.lastRunAt = now.toISOString();
          applyRelayChange(sch.channel, false, `Schedule: ${sch.name}`, 'schedule');
          scheduleChanged = true;
        }
      }
    } else if (sch.type === 'interval') {
      const minuteOfDay = now.getHours() * 60 + now.getMinutes();
      const mod = minuteOfDay % Math.max(1, sch.intervalEveryMins);
      const shouldBeOn = mod < sch.intervalDurationMins;
      const targetRelay = state.relays.find((r) => r.channel === sch.channel);
      if (targetRelay && targetRelay.state !== shouldBeOn && now.getSeconds() < 6) {
        sch.lastRunAt = now.toISOString();
        applyRelayChange(sch.channel, shouldBeOn, `Interval: ${sch.name}`, 'schedule');
        scheduleChanged = true;
      }
    }
  }
  if (scheduleChanged) {
    broadcast('schedules:updated', state.schedules);
  }

  // 2. Thermostat Auto-Fan Link (Channel 3 Ventilation Fan)
  const therm = state.thermostat;
  // Gentle physical drift based on HVAC/fan state when no external ESP32 pushed in last 15s
  const lastEspSync = new Date(state.hardware.lastSyncAt).getTime();
  const fanRelay = state.relays.find((r) => r.channel === 3);
  if (Date.now() - lastEspSync > 12000) {
    const coolingEffect = fanRelay?.state ? -0.05 : 0.02;
    therm.currentTemp = Number(Math.min(34, Math.max(17, therm.currentTemp + coolingEffect)).toFixed(1));
  }

  if (therm.autoFanLink && therm.mode !== 'fan') {
    const needsCooling = therm.currentTemp >= therm.targetTemp + therm.hysteresis;
    const cooledDown = therm.currentTemp <= therm.targetTemp - therm.hysteresis;
    if (needsCooling && fanRelay && !fanRelay.state) {
      therm.hvacActive = true;
      applyRelayChange(3, true, 'Thermostat Auto-Link', 'automation');
    } else if (cooledDown && fanRelay && fanRelay.state) {
      therm.hvacActive = false;
      applyRelayChange(3, false, 'Thermostat Auto-Link', 'automation');
    }
  } else {
    therm.hvacActive = Boolean(fanRelay?.state);
  }

  // 3. Accumulate kWh for active relays (5s interval = 5 / 3600 hours)
  const hoursSlice = 5 / 3600;
  for (const r of state.relays) {
    if (r.state) {
      const kwh = r.ratedWatts * 0.001 * hoursSlice;
      r.dailyKwh = Number((r.dailyKwh + kwh).toFixed(4));
      r.totalKwh = Number((r.totalKwh + kwh).toFixed(4));
    }
  }

  // 4. Push real-time telemetry point every 15 seconds (or on 3rd tick)
  state.hardware.uptimeSecs += 5;
  const totalWatts = computeCurrentTotalWatts();
  const point: TelemetryPoint = {
    timestamp: now.toISOString(),
    label: now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'}),
    totalWatts,
    temperature: therm.currentTemp,
    humidity: therm.currentHumidity,
    rssi: state.hardware.rssi,
    channelWatts: [
      state.relays[0]?.state ? state.relays[0].ratedWatts : 0,
      state.relays[1]?.state ? state.relays[1].ratedWatts : 0,
      state.relays[2]?.state ? state.relays[2].ratedWatts : 0,
      state.relays[3]?.state ? state.relays[3].ratedWatts : 0,
    ],
  };

  state.telemetryHistory = [...state.telemetryHistory.slice(-47), point];

  // 5. Evaluate threshold alerts
  for (const rule of state.alertRules) {
    if (!rule.enabled) continue;
    const last = rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt).getTime() : 0;
    if (now.getTime() - last < rule.cooldownMins * 60 * 1000) continue;

    if (rule.condition === 'temp_above' && therm.currentTemp >= rule.threshold) {
      rule.lastTriggeredAt = now.toISOString();
      pushNotification({
        title: `Temperature Threshold Exceeded (${therm.currentTemp}°C)`,
        message: `DHT11 on GPIO 4 reached ${therm.currentTemp}°C (limit ${rule.threshold}°C).`,
        severity: 'warning',
        device: 'DHT11 Sensor',
      });
    } else if (rule.condition === 'power_above' && totalWatts >= rule.threshold) {
      rule.lastTriggeredAt = now.toISOString();
      pushNotification({
        title: `Peak Power Alert (${totalWatts} W)`,
        message: `Total load crossed ${rule.threshold} W threshold.`,
        severity: 'critical',
        device: 'Power Monitor',
      });
    }
  }

  broadcast('telemetry:point', {
    point,
    relays: state.relays,
    thermostat: state.thermostat,
    hardware: state.hardware,
  });
  persistState();
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Actor-Id');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // PDF-compatible ESP32 status endpoint
  app.get('/api/status', (_req, res) => {
    res.json({
      temperature: state.thermostat.currentTemp,
      humidity: state.thermostat.currentHumidity,
      rssi: state.hardware.rssi,
      relays: state.relays.map((r) => r.state),
      watts: computeCurrentTotalWatts(),
      targetTemp: state.thermostat.targetTemp,
    });
  });

  // Full application state
  app.get('/api/state', (_req, res) => {
    res.json(state);
  });

  // PDF-compatible + rich relay toggle endpoint
  app.post('/api/relay', (req, res) => {
    const chParam = req.query.ch ?? req.body?.channel;
    const stateParam = req.query.state ?? req.body?.state;
    const actorId = (req.headers['x-actor-id'] as string) || req.body?.actorId;
    const source = (req.body?.source as UsageLogEntry['source']) || 'manual';

    const ch = Number(chParam);
    const targetOn =
      typeof stateParam === 'boolean'
        ? stateParam
        : String(stateParam).toLowerCase() === 'on' || String(stateParam) === 'true' || String(stateParam) === '1';

    const user = findUser(actorId);
    const relay = state.relays.find((r) => r.channel === ch);
    if (!relay) {
      res.status(400).json({ok: false, error: 'Invalid channel (1-4)'});
      return;
    }
    if (user && user.role === 'Guest' && !relay.guestAllowed) {
      res.status(403).json({ok: false, error: `Guest role cannot control ${relay.name}`});
      return;
    }
    if (user && !user.canControlLights && relay.category === 'light') {
      res.status(403).json({ok: false, error: 'User lacks lighting control permission'});
      return;
    }

    const result = applyRelayChange(ch, targetOn, user ? user.name : 'App User', source);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json({ok: true, channel: ch, state: targetOn, relays: state.relays});
  });

  // Update relay metadata (name, ratedWatts, guestAllowed)
  app.patch('/api/relay/:ch', (req, res) => {
    const ch = Number(req.params.ch);
    const relay = state.relays.find((r) => r.channel === ch);
    if (!relay) {
      res.status(404).json({ok: false, error: 'Relay not found'});
      return;
    }
    if (typeof req.body?.name === 'string' && req.body.name.trim()) {
      relay.name = req.body.name.trim();
    }
    if (typeof req.body?.ratedWatts === 'number' && req.body.ratedWatts >= 0) {
      relay.ratedWatts = req.body.ratedWatts;
    }
    if (typeof req.body?.guestAllowed === 'boolean') {
      relay.guestAllowed = req.body.guestAllowed;
    }
    if (typeof req.body?.activeLow === 'boolean') {
      relay.activeLow = req.body.activeLow;
    }
    broadcast('relay:updated', {relays: state.relays, usageLogs: state.usageLogs});
    persistState();
    res.json({ok: true, relay});
  });

  // Thermostat endpoint
  app.post('/api/thermostat', (req, res) => {
    const actorId = (req.headers['x-actor-id'] as string) || req.body?.actorId;
    const user = findUser(actorId);
    if (user && !user.canAdjustThermostat) {
      res.status(403).json({ok: false, error: `${user.role} role cannot adjust thermostat`});
      return;
    }
    const {targetTemp, mode, autoFanLink} = req.body ?? {};
    if (typeof targetTemp === 'number' && targetTemp >= 15 && targetTemp <= 32) {
      state.thermostat.targetTemp = Number(targetTemp.toFixed(1));
    }
    if (mode && ['auto', 'cool', 'heat', 'fan', 'eco'].includes(mode)) {
      state.thermostat.mode = mode;
    }
    if (typeof autoFanLink === 'boolean') {
      state.thermostat.autoFanLink = autoFanLink;
    }
    appendUsageLog({
      device: 'HVAC Thermostat',
      channel: null,
      event: `Target ${state.thermostat.targetTemp}°C · Mode ${state.thermostat.mode.toUpperCase()}`,
      actor: user ? user.name : 'App User',
      watts: computeCurrentTotalWatts(),
      kwhDelta: 0,
      source: req.body?.source || 'manual',
    });
    broadcast('thermostat:updated', state.thermostat);
    persistState();
    res.json({ok: true, thermostat: state.thermostat});
  });

  // Security Camera controls
  app.post('/api/cameras/:id', (req, res) => {
    const actorId = (req.headers['x-actor-id'] as string) || req.body?.actorId;
    const user = findUser(actorId);
    if (user && !user.canViewCameras) {
      res.status(403).json({ok: false, error: `${user.role} role cannot modify cameras`});
      return;
    }
    const cam = state.cameras.find((c) => c.id === req.params.id);
    if (!cam) {
      res.status(404).json({ok: false, error: 'Camera not found'});
      return;
    }
    if (typeof req.body?.armed === 'boolean') cam.armed = req.body.armed;
    if (typeof req.body?.nightVision === 'boolean') cam.nightVision = req.body.nightVision;
    if (typeof req.body?.streamUrl === 'string') cam.streamUrl = req.body.streamUrl.trim();
    if (req.body?.snapshot) cam.lastSnapshotAt = new Date().toISOString();
    if (typeof req.body?.triggerMotion === 'boolean') {
      cam.motionDetected = req.body.triggerMotion;
      if (req.body.triggerMotion) {
        cam.lastMotionAt = new Date().toISOString();
        if (cam.armed) {
          pushNotification({
            title: `Motion Detected: ${cam.name}`,
            message: `${cam.location} sensor triggered (${cam.gpioNote}).`,
            severity: 'critical',
            device: cam.name,
          });
        }
      }
    }
    broadcast('camera:updated', state.cameras);
    persistState();
    res.json({ok: true, camera: cam});
  });

  // Schedules CRUD
  app.post('/api/schedules', (req, res) => {
    const actorId = (req.headers['x-actor-id'] as string) || req.body?.actorId;
    const user = findUser(actorId);
    if (user && !user.canManageSchedules) {
      res.status(403).json({ok: false, error: `${user.role} role cannot manage schedules`});
      return;
    }
    const body = req.body as Partial<ScheduleRule>;
    const created: ScheduleRule = {
      id: `sch-${Date.now()}`,
      name: body.name?.trim() || 'New Appliance Timer',
      channel: Number(body.channel || 1),
      type: body.type || 'daily',
      enabled: body.enabled ?? true,
      action: body.action || 'on',
      startTime: body.startTime || '18:00',
      endTime: body.endTime || '22:00',
      days: Array.isArray(body.days) ? body.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      intervalEveryMins: Number(body.intervalEveryMins || 60),
      intervalDurationMins: Number(body.intervalDurationMins || 15),
      countdownRemainingSecs: Number(body.countdownRemainingSecs || 900),
      lastRunAt: null,
    };
    state.schedules = [created, ...state.schedules];
    broadcast('schedules:updated', state.schedules);
    persistState();
    res.json({ok: true, schedule: created});
  });

  app.patch('/api/schedules/:id', (req, res) => {
    const sch = state.schedules.find((s) => s.id === req.params.id);
    if (!sch) {
      res.status(404).json({ok: false, error: 'Schedule not found'});
      return;
    }
    Object.assign(sch, req.body);
    broadcast('schedules:updated', state.schedules);
    persistState();
    res.json({ok: true, schedule: sch});
  });

  app.delete('/api/schedules/:id', (req, res) => {
    state.schedules = state.schedules.filter((s) => s.id !== req.params.id);
    broadcast('schedules:updated', state.schedules);
    persistState();
    res.json({ok: true});
  });

  // Alert Rules & Notifications
  app.post('/api/alerts', (req, res) => {
    const body = req.body as Partial<AlertRule>;
    const created: AlertRule = {
      id: `alert-${Date.now()}`,
      name: body.name?.trim() || 'Custom Device Alert',
      channel: body.channel ?? null,
      condition: body.condition || 'relay_on_change',
      threshold: Number(body.threshold ?? 1),
      enabled: body.enabled ?? true,
      pushEnabled: body.pushEnabled ?? true,
      cooldownMins: Number(body.cooldownMins ?? 5),
      lastTriggeredAt: null,
    };
    state.alertRules = [created, ...state.alertRules];
    persistState();
    res.json({ok: true, alertRules: state.alertRules});
  });

  app.patch('/api/alerts/:id', (req, res) => {
    const rule = state.alertRules.find((r) => r.id === req.params.id);
    if (!rule) {
      res.status(404).json({ok: false, error: 'Alert rule not found'});
      return;
    }
    Object.assign(rule, req.body);
    persistState();
    res.json({ok: true, alertRules: state.alertRules});
  });

  app.delete('/api/alerts/:id', (req, res) => {
    state.alertRules = state.alertRules.filter((r) => r.id !== req.params.id);
    persistState();
    res.json({ok: true, alertRules: state.alertRules});
  });

  app.post('/api/alerts/test', (req, res) => {
    const device = req.body?.device || 'Front Porch Cam';
    const message = req.body?.message || 'Test alert event triggered from VoltHome console.';
    pushNotification({
      title: `Alert Test · ${device}`,
      message,
      severity: 'warning',
      device,
    });
    res.json({ok: true});
  });

  app.post('/api/notifications/read-all', (_req, res) => {
    state.notifications = state.notifications.map((n) => ({...n, read: true}));
    persistState();
    res.json({ok: true, notifications: state.notifications});
  });

  // Household Users (Multi-User Access)
  app.post('/api/users', (req, res) => {
    const body = req.body as Partial<HouseholdUser>;
    const role = body.role || 'Member';
    const created: HouseholdUser = {
      id: `usr-${Date.now()}`,
      name: body.name?.trim() || 'New Member',
      role,
      pin: body.pin || '1111',
      canControlLights: body.canControlLights ?? true,
      canAdjustThermostat: body.canAdjustThermostat ?? role !== 'Guest',
      canViewCameras: body.canViewCameras ?? role !== 'Guest',
      canManageSchedules: body.canManageSchedules ?? role === 'Admin',
      lastActiveAt: new Date().toISOString(),
    };
    state.users = [...state.users, created];
    broadcast('users:updated', state.users);
    persistState();
    res.json({ok: true, users: state.users});
  });

  app.patch('/api/users/:id', (req, res) => {
    const usr = state.users.find((u) => u.id === req.params.id);
    if (!usr) {
      res.status(404).json({ok: false, error: 'User not found'});
      return;
    }
    Object.assign(usr, req.body);
    broadcast('users:updated', state.users);
    persistState();
    res.json({ok: true, users: state.users});
  });

  app.delete('/api/users/:id', (req, res) => {
    if (state.users.length <= 1) {
      res.status(400).json({ok: false, error: 'At least one Admin must remain'});
      return;
    }
    state.users = state.users.filter((u) => u.id !== req.params.id);
    broadcast('users:updated', state.users);
    persistState();
    res.json({ok: true, users: state.users});
  });

  // Hardware ESP32 Direct Sync Endpoint (ESP32 calls this over Wi-Fi)
  app.post('/api/esp32/sync', (req, res) => {
    const {temperature, humidity, rssi, localIp, uptimeSecs} = req.body ?? {};
    if (typeof temperature === 'number' && !Number.isNaN(temperature)) {
      state.thermostat.currentTemp = Number(temperature.toFixed(1));
    }
    if (typeof humidity === 'number' && !Number.isNaN(humidity)) {
      state.thermostat.currentHumidity = Math.round(humidity);
    }
    if (typeof rssi === 'number') state.hardware.rssi = rssi;
    if (typeof localIp === 'string') state.hardware.localIp = localIp;
    if (typeof uptimeSecs === 'number') state.hardware.uptimeSecs = uptimeSecs;
    state.hardware.lastSyncAt = new Date().toISOString();
    state.hardware.esp32Connected = true;

    broadcast('hardware:updated', state.hardware);
    broadcast('thermostat:updated', state.thermostat);
    persistState();

    res.json({
      ok: true,
      relays: state.relays.map((r) => r.state),
      targetTemp: state.thermostat.targetTemp,
    });
  });

  // Update electricity rate / ESP32 LAN IP
  app.patch('/api/hardware', (req, res) => {
    if (typeof req.body?.localIp === 'string') state.hardware.localIp = req.body.localIp.trim();
    if (typeof req.body?.electricityRatePerKwh === 'number' && req.body.electricityRatePerKwh >= 0) {
      state.hardware.electricityRatePerKwh = req.body.electricityRatePerKwh;
    }
    broadcast('hardware:updated', state.hardware);
    persistState();
    res.json({ok: true, hardware: state.hardware});
  });

  // Restore configuration from Google Drive backup JSON
  app.post('/api/restore', (req, res) => {
    const body = req.body as Partial<HomeState>;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ok: false, error: 'Invalid backup payload'});
      return;
    }
    if (Array.isArray(body.relays) && body.relays.length === 4) {
      state.relays = body.relays;
    }
    if (body.thermostat && typeof body.thermostat.targetTemp === 'number') {
      state.thermostat = {...state.thermostat, ...body.thermostat};
    }
    if (Array.isArray(body.schedules)) {
      state.schedules = body.schedules;
    }
    if (Array.isArray(body.alertRules)) {
      state.alertRules = body.alertRules;
    }
    if (body.hardware) {
      state.hardware = {...state.hardware, ...body.hardware};
    }
    broadcast('state:sync', state);
    persistState();
    res.json({ok: true, state});
  });

  // CSV Export of Usage Record Logs
  app.get('/api/logs/export', (_req, res) => {
    const header = 'Timestamp,Device,Channel,Event,Actor,Watts,Source\n';
    const rows = state.usageLogs
      .map(
        (l) =>
          `"${l.timestamp}","${l.device.replace(/"/g, '""')}",${l.channel ?? ''},"${l.event.replace(/"/g, '""')}","${l.actor.replace(/"/g, '""')}",${l.watts},"${l.source}"`
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="volthome-usage-logs.csv"');
    res.send(header + rows);
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({noServer: true});

  server.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (socket) => {
    wssClients.add(socket);
    socket.send(JSON.stringify({type: 'state:sync', payload: state}));
    socket.on('close', () => {
      wssClients.delete(socket);
    });
  });

  setInterval(evaluateAutomationAndTelemetry, 5000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
          path: '/vite-hmr',
        },
        ws: {
          server,
          path: '/vite-hmr',
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`VoltHome IoT Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export type UserRole = 'Admin' | 'Member' | 'Guest';

export type ConnectionMode = 'server' | 'lan' | 'pythonanywhere';

export type ThermostatMode = 'auto' | 'cool' | 'heat' | 'fan' | 'eco';

export interface RelayChannel {
  channel: number; // 1..4
  gpio: number; // 16, 17, 18, 19
  name: string;
  room: string;
  category: 'light' | 'climate' | 'outlet' | 'appliance';
  state: boolean;
  activeLow: boolean;
  ratedWatts: number;
  dailyKwh: number;
  totalKwh: number;
  lastToggledAt: string;
  lastToggledBy: string;
  guestAllowed: boolean;
}

export interface ThermostatState {
  currentTemp: number;
  currentHumidity: number;
  targetTemp: number;
  mode: ThermostatMode;
  autoFanLink: boolean;
  hysteresis: number;
  hvacActive: boolean;
}

export interface SecurityCamera {
  id: string;
  name: string;
  location: string;
  gpioNote: string;
  online: boolean;
  armed: boolean;
  nightVision: boolean;
  motionDetected: boolean;
  streamUrl: string;
  lastMotionAt: string;
  lastSnapshotAt: string;
  resolution: string;
}

export interface TelemetryPoint {
  timestamp: string;
  label: string;
  totalWatts: number;
  temperature: number;
  humidity: number;
  rssi: number;
  channelWatts: [number, number, number, number];
}

export interface UsageLogEntry {
  id: string;
  timestamp: string;
  device: string;
  channel: number | null;
  event: string;
  actor: string;
  watts: number;
  kwhDelta: number;
  source: 'manual' | 'schedule' | 'voice' | 'automation' | 'esp32';
}

export interface ScheduleRule {
  id: string;
  name: string;
  channel: number;
  type: 'daily' | 'interval' | 'countdown';
  enabled: boolean;
  action: 'on' | 'off' | 'cycle';
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  days: string[]; // ['Mon','Tue',...]
  intervalEveryMins: number;
  intervalDurationMins: number;
  countdownRemainingSecs: number;
  lastRunAt: string | null;
}

export interface AlertRule {
  id: string;
  name: string;
  channel: number | null;
  condition: 'temp_above' | 'power_above' | 'motion_detected' | 'relay_on_change' | 'esp32_offline';
  threshold: number;
  enabled: boolean;
  pushEnabled: boolean;
  cooldownMins: number;
  lastTriggeredAt: string | null;
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  device: string;
  read: boolean;
}

export interface HouseholdUser {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  canControlLights: boolean;
  canAdjustThermostat: boolean;
  canViewCameras: boolean;
  canManageSchedules: boolean;
  lastActiveAt: string;
}

export interface HardwareTelemetry {
  boardName: string;
  firmwareVersion: string;
  rssi: number;
  localIp: string;
  uptimeSecs: number;
  lastSyncAt: string;
  esp32Connected: boolean;
  electricityRatePerKwh: number;
}

export interface HomeState {
  relays: RelayChannel[];
  thermostat: ThermostatState;
  cameras: SecurityCamera[];
  telemetryHistory: TelemetryPoint[];
  usageLogs: UsageLogEntry[];
  schedules: ScheduleRule[];
  alertRules: AlertRule[];
  notifications: NotificationItem[];
  users: HouseholdUser[];
  hardware: HardwareTelemetry;
}

export interface WsServerMessage {
  type:
    | 'state:sync'
    | 'relay:updated'
    | 'thermostat:updated'
    | 'camera:updated'
    | 'telemetry:point'
    | 'alert:triggered'
    | 'schedules:updated'
    | 'users:updated'
    | 'hardware:updated';
  payload: unknown;
}

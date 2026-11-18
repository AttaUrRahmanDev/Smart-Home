export interface Esp32PinSpec {
  gpio: string;
  label: string;
  device: string;
  direction: 'Input' | 'Output' | 'Power' | 'Camera';
  side: 'left' | 'right';
  order: number;
  notes: string;
  category: 'core' | 'relay' | 'sensor' | 'expansion' | 'power';
}

export const ESP32_PINS: Esp32PinSpec[] = [
  {
    gpio: '3V3',
    label: '3.3V Regulated Out',
    device: 'DHT11 VCC / Pull-up Rail',
    direction: 'Power',
    side: 'left',
    order: 1,
    notes: 'Powers 3.3V-compatible DHT11 module. Never feed 5V into GPIO pins.',
    category: 'power',
  },
  {
    gpio: 'EN',
    label: 'CHIP_PU / Reset',
    device: 'Board Enable',
    direction: 'Input',
    side: 'left',
    order: 2,
    notes: 'Pulled high internally. Momentary pull to GND resets the ESP32.',
    category: 'core',
  },
  {
    gpio: 'GPIO 36',
    label: 'VP (ADC1_CH0)',
    device: 'ZMPT101B AC Voltage (Optional)',
    direction: 'Input',
    side: 'left',
    order: 3,
    notes: 'Input-only ADC1 channel. Safe with Wi-Fi active (unlike ADC2).',
    category: 'expansion',
  },
  {
    gpio: 'GPIO 34',
    label: 'ADC1_CH6',
    device: 'ACS712 / SCT-013 Current Sensor',
    direction: 'Input',
    side: 'left',
    order: 4,
    notes: 'Input-only ADC1 pin for real-time wattage measurement (with 3.3V voltage divider).',
    category: 'expansion',
  },
  {
    gpio: 'GPIO 32',
    label: 'ADC1_CH4 / Touch',
    device: 'HC-SR501 PIR Motion Sensor',
    direction: 'Input',
    side: 'left',
    order: 5,
    notes: 'Triggers security motion alert & porch light automation.',
    category: 'expansion',
  },
  {
    gpio: 'GPIO 25',
    label: 'DAC1 / PWM',
    device: 'Active Piezo Siren / Buzzer',
    direction: 'Output',
    side: 'left',
    order: 6,
    notes: 'Optional local alarm tone when armed camera/PIR detects intrusion.',
    category: 'expansion',
  },
  {
    gpio: 'GPIO 4',
    label: 'DHT11 DATA',
    device: 'DHT11 Temperature & Humidity',
    direction: 'Input',
    side: 'right',
    order: 1,
    notes: 'Primary sensor pin from project guide. Add 4.7kΩ–10kΩ pull-up resistor to 3V3 if using a bare 4-pin DHT11.',
    category: 'sensor',
  },
  {
    gpio: 'GPIO 16',
    label: 'Relay IN1 (RX2)',
    device: 'Ch 1 · Living Room Light',
    direction: 'Output',
    side: 'right',
    order: 2,
    notes: 'Relay Channel 1. Active-LOW on most optocoupled relay boards (LOW = ON, HIGH = OFF).',
    category: 'relay',
  },
  {
    gpio: 'GPIO 17',
    label: 'Relay IN2 (TX2)',
    device: 'Ch 2 · Bedroom Light',
    direction: 'Output',
    side: 'right',
    order: 3,
    notes: 'Relay Channel 2. Configured OUTPUT and forced OFF early in setup() to avoid boot flicker.',
    category: 'relay',
  },
  {
    gpio: 'GPIO 18',
    label: 'Relay IN3 (V_SPI_CLK)',
    device: 'Ch 3 · Ventilation Fan',
    direction: 'Output',
    side: 'right',
    order: 4,
    notes: 'Relay Channel 3. Linked to DHT11 Thermostat Auto-Fan hysteresis rule.',
    category: 'relay',
  },
  {
    gpio: 'GPIO 19',
    label: 'Relay IN4 (V_SPI_MISO)',
    device: 'Ch 4 · Auxiliary Load / AC',
    direction: 'Output',
    side: 'right',
    order: 5,
    notes: 'Relay Channel 4. Use a suitably rated enclosed relay/contactor for heavy inductive loads.',
    category: 'relay',
  },
  {
    gpio: 'GND',
    label: 'Common Ground',
    device: 'DHT11 GND + Relay Logic GND',
    direction: 'Power',
    side: 'right',
    order: 6,
    notes: 'Share common ground between ESP32, DHT11, and relay module logic input.',
    category: 'power',
  },
];

export const ESP32_CAM_PINS: Esp32PinSpec[] = [
  {
    gpio: '5V',
    label: '5V Power Input (2A)',
    device: 'Dedicated 5V/2A Regulator',
    direction: 'Power',
    side: 'left',
    order: 1,
    notes: 'CRITICAL: ESP32-CAM spikes to 400mA+ during Wi-Fi JPEG stream. Never power from weak USB-TTL 3.3V—use 5V with a 470µF cap.',
    category: 'power',
  },
  {
    gpio: 'GND',
    label: 'Common Ground',
    device: 'PSU GND + FTDI GND + PIR GND',
    direction: 'Power',
    side: 'left',
    order: 2,
    notes: 'Shared ground reference for camera power, FTDI programmer, and HC-SR501 PIR sensor.',
    category: 'power',
  },
  {
    gpio: 'GPIO 12',
    label: 'HS2_DATA2 (Boot Strap)',
    device: 'MicroSD Card D2 (Leave float on boot)',
    direction: 'Camera',
    side: 'left',
    order: 3,
    notes: 'Boot strapping pin! Must stay LOW at power-up or flash boot fails. Do not attach pull-ups here.',
    category: 'core',
  },
  {
    gpio: 'GPIO 13',
    label: 'PIR Motion Input / SD D3',
    device: 'HC-SR501 PIR Motion Sensor OUT',
    direction: 'Input',
    side: 'left',
    order: 4,
    notes: 'Best free GPIO on ESP32-CAM when using 1-bit SD mode or streaming-only! Connect HC-SR501 OUT (3.3V logic).',
    category: 'sensor',
  },
  {
    gpio: 'GPIO 15',
    label: 'SD CMD / Aux Trigger',
    device: 'Optional External Buzzer / Status',
    direction: 'Output',
    side: 'left',
    order: 5,
    notes: 'Free if MicroSD is disabled. Outputs short pulse or triggers remote relay API on motion.',
    category: 'expansion',
  },
  {
    gpio: 'GPIO 14',
    label: 'SD CLK',
    device: 'MicroSD Clock (Reserved if SD used)',
    direction: 'Camera',
    side: 'left',
    order: 6,
    notes: 'Used by onboard MicroSD slot; leave free if logging JPEGs locally to SD.',
    category: 'core',
  },
  {
    gpio: 'GPIO 4',
    label: 'High-Power Flash LED',
    device: 'Onboard White SMD Flash LED',
    direction: 'Output',
    side: 'right',
    order: 1,
    notes: 'Drives the bright onboard LED via transistor. Controllable remotely via /flash?state=on|off.',
    category: 'relay',
  },
  {
    gpio: 'GPIO 2',
    label: 'SD D0 / Flash Mode',
    device: 'MicroSD Data 0',
    direction: 'Camera',
    side: 'right',
    order: 2,
    notes: 'Must be LOW or floating while flashing via GPIO 0.',
    category: 'core',
  },
  {
    gpio: 'GPIO 0',
    label: 'Flash Boot Jumper / XCLK',
    device: 'Connect to GND ONLY when uploading',
    direction: 'Input',
    side: 'right',
    order: 3,
    notes: 'Short GPIO 0 to GND to enter UART flashing mode, then REMOVE jumper and press RST to run camera stream.',
    category: 'core',
  },
  {
    gpio: 'GPIO 3',
    label: 'U0RXD (Serial RX)',
    device: 'FTDI Programmer TX',
    direction: 'Input',
    side: 'right',
    order: 4,
    notes: 'Connect to TX pin of USB-to-TTL (FTDI/CP2102) adapter when flashing.',
    category: 'core',
  },
  {
    gpio: 'GPIO 1',
    label: 'U0TXD (Serial TX)',
    device: 'FTDI Programmer RX',
    direction: 'Output',
    side: 'right',
    order: 5,
    notes: 'Connect to RX pin of USB-to-TTL adapter for flashing & 115200 baud serial IP output.',
    category: 'core',
  },
  {
    gpio: 'GPIO 33',
    label: 'Onboard Red LED (Active-LOW)',
    device: 'Status Indicator LED',
    direction: 'Output',
    side: 'right',
    order: 6,
    notes: 'Small rear red status LED (LOW = ON, HIGH = OFF) used to indicate Wi-Fi & stream heartbeat.',
    category: 'expansion',
  },
];

export interface CodeTemplateFile {
  id: 'esp32_local' | 'esp32_hybrid' | 'esp32_cam_stream' | 'esp32_cam_cloud' | 'pythonanywhere' | 'android_kotlin';
  title: string;
  filename: string;
  language: string;
  platform: string;
  summary: string;
  libraries: string[];
  steps: string[];
  code: string;
}

export const CODE_TEMPLATES: CodeTemplateFile[] = [
  {
    id: 'esp32_local',
    title: 'ESP32 Local LAN Web Server (PDF + CORS)',
    filename: 'esp32_local_smarthome.ino',
    language: 'cpp',
    platform: 'Arduino IDE · ESP32 Dev Module',
    summary:
      'Matches the ESP32 Smart Home Project Guide (GPIO 4 DHT11, GPIO 16–19 4-Channel Relay) with CORS enabled so this Android/PWA dashboard can talk directly to your ESP32 IP offline over local Wi-Fi.',
    libraries: ['WiFi.h (Espressif ESP32 core)', 'WebServer.h (Espressif ESP32 core)', 'DHT sensor library by Adafruit', 'Adafruit Unified Sensor'],
    steps: [
      'Install Espressif ESP32 board package in Arduino IDE Boards Manager and select "ESP32 Dev Module".',
      'Install "DHT sensor library" + "Adafruit Unified Sensor" from Library Manager.',
      'Update WIFI_SSID and WIFI_PASSWORD, verify RELAY_ACTIVE_LOW (true for standard opto-isolated modules).',
      'Upload at 115200 baud, copy the printed IP (e.g. 192.168.1.45), and select Local LAN mode in VoltHome.',
    ],
    code: `#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

// ---- 1. Update these for your 2.4 GHz Wi-Fi network ----
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ---- 2. Hardware Pin Map (from Project Guide) ----
#define DHT_PIN   4
#define DHT_TYPE  DHT11
const uint8_t relayPins[4] = {16, 17, 18, 19}; // IN1..IN4

// Many relay boards are active-LOW. Test with no mains load first!
const bool RELAY_ACTIVE_LOW = true;

DHT dht(DHT_PIN, DHT_TYPE);
WebServer server(80);
bool relayState[4] = {false, false, false, false};

void sendCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void setRelay(uint8_t index, bool on) {
  if (index >= 4) return;
  relayState[index] = on;
  const uint8_t onLevel  = RELAY_ACTIVE_LOW ? LOW  : HIGH;
  const uint8_t offLevel = RELAY_ACTIVE_LOW ? HIGH : LOW;
  digitalWrite(relayPins[index], on ? onLevel : offLevel);
}

void handleOptions() {
  sendCorsHeaders();
  server.send(204);
}

void handleStatus() {
  sendCorsHeaders();
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  String json = "{";
  json += "\\"temperature\\":";
  json += isnan(t) ? "null" : String(t, 1);
  json += ",\\"humidity\\":";
  json += isnan(h) ? "null" : String(h, 1);
  json += ",\\"rssi\\":" + String(WiFi.RSSI());
  json += ",\\"ip\\":\\"" + WiFi.localIP().toString() + "\\"";
  json += ",\\"relays\\":[";
  for (int i = 0; i < 4; i++) {
    json += relayState[i] ? "true" : "false";
    if (i < 3) json += ",";
  }
  json += "]}";
  server.send(200, "application/json", json);
}

void handleRelay() {
  sendCorsHeaders();
  if (!server.hasArg("ch") || !server.hasArg("state")) {
    server.send(400, "text/plain", "Missing ch or state");
    return;
  }
  int ch = server.arg("ch").toInt();
  String st = server.arg("state");
  st.toLowerCase();
  if (ch < 1 || ch > 4 || (st != "on" && st != "off")) {
    server.send(400, "text/plain", "Invalid channel or state");
    return;
  }
  setRelay(ch - 1, st == "on");
  server.send(200, "application/json", "{\\"ok\\":true}");
}

void setup() {
  Serial.begin(115200);
  dht.begin();

  // Force all relays OFF immediately on boot
  for (int i = 0; i < 4; i++) {
    pinMode(relayPins[i], OUTPUT);
    setRelay(i, false);
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("ESP32 Local LAN IP: http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi failed. Check 2.4GHz SSID/password.");
  }

  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/api/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/relay", HTTP_POST, handleRelay);
  server.on("/api/relay", HTTP_OPTIONS, handleOptions);
  server.begin();
}

void loop() {
  server.handleClient();
}`,
  },
  {
    id: 'esp32_hybrid',
    title: 'ESP32 Hybrid Cloud (PythonAnywhere) + Local LAN',
    filename: 'esp32_cloud_local_hybrid.ino',
    language: 'cpp',
    platform: 'Arduino IDE · Dual Cloud & Offline Mode',
    summary:
      'Connects your ESP32 to your PythonAnywhere Flask web app (or this App Server) over HTTPS every 3 seconds to upload DHT11/PIR/power data and pull remote commands—while keeping the local port 80 LAN server active for offline Wi-Fi fallback!',
    libraries: ['WiFi.h', 'WebServer.h', 'HTTPClient.h', 'WiFiClientSecure.h', 'ArduinoJson (v7)', 'DHT.h'],
    steps: [
      'Install "ArduinoJson" by Benoit Blanchon via Arduino Library Manager.',
      'Set CLOUD_SYNC_URL to "https://yourusername.pythonanywhere.com/api/esp32/sync" (or your App Server URL + "/api/esp32/sync").',
      'Set API_SECRET to match the token configured in your PythonAnywhere Flask app.',
      'If internet drops, the ESP32 automatically keeps serving /api/status and /api/relay on your local LAN!',
    ],
    code: `#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ---- 1. Wi-Fi & Cloud Server Config ----
const char* WIFI_SSID      = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* CLOUD_SYNC_URL = "https://yourusername.pythonanywhere.com/api/esp32/sync";
const char* API_SECRET     = "CHANGE_THIS_SHARED_SECRET";

// ---- 2. Hardware Pins ----
#define DHT_PIN   4
#define DHT_TYPE  DHT11
#define PIR_PIN   32   // Optional HC-SR501 motion sensor
#define ACS_PIN   34   // Optional ACS712 / ZMPT current ADC
const uint8_t relayPins[4] = {16, 17, 18, 19};
const bool RELAY_ACTIVE_LOW = true;

DHT dht(DHT_PIN, DHT_TYPE);
WebServer server(80);
bool relayState[4] = {false, false, false, false};
unsigned long lastCloudSync = 0;
const unsigned long SYNC_INTERVAL_MS = 3000;

void setRelay(uint8_t idx, bool on) {
  if (idx >= 4) return;
  relayState[idx] = on;
  const uint8_t onLevel  = RELAY_ACTIVE_LOW ? LOW  : HIGH;
  const uint8_t offLevel = RELAY_ACTIVE_LOW ? HIGH : LOW;
  digitalWrite(relayPins[idx], on ? onLevel : offLevel);
}

void sendCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleLocalStatus() {
  sendCors();
  JsonDocument doc;
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  doc["temperature"] = isnan(t) ? nullptr : serialized(String(t, 1));
  doc["humidity"]    = isnan(h) ? nullptr : serialized(String(h, 1));
  doc["rssi"]        = WiFi.RSSI();
  doc["motion"]      = digitalRead(PIR_PIN) == HIGH;
  JsonArray arr = doc["relays"].to<JsonArray>();
  for (int i = 0; i < 4; i++) arr.add(relayState[i]);
  String out;
  serializeJson(doc, out);
  server.send(200, "application/json", out);
}

void handleLocalRelay() {
  sendCors();
  int ch = server.arg("ch").toInt();
  String st = server.arg("state");
  st.toLowerCase();
  if (ch < 1 || ch > 4 || (st != "on" && st != "off")) {
    server.send(400, "text/plain", "Invalid parameters");
    return;
  }
  setRelay(ch - 1, st == "on");
  server.send(200, "application/json", "{\\"ok\\":true}");
}

void syncWithCloudServer() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure(); // Note: For production, pin PythonAnywhere root CA cert!
  HTTPClient http;
  if (!http.begin(client, CLOUD_SYNC_URL)) return;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_SECRET);

  JsonDocument payload;
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) payload["temperature"] = t;
  if (!isnan(h)) payload["humidity"]    = h;
  payload["rssi"]       = WiFi.RSSI();
  payload["localIp"]    = WiFi.localIP().toString();
  payload["uptimeSecs"] = millis() / 1000;
  payload["motion"]     = digitalRead(PIR_PIN) == HIGH;
  payload["adcRaw"]     = analogRead(ACS_PIN);

  String body;
  serializeJson(payload, body);
  int code = http.POST(body);

  if (code == 200) {
    JsonDocument resp;
    if (!deserializeJson(resp, http.getString())) {
      JsonArray desired = resp["relays"].as<JsonArray>();
      for (int i = 0; i < 4 && i < (int)desired.size(); i++) {
        bool targetOn = desired[i].as<bool>();
        if (targetOn != relayState[i]) {
          setRelay(i, targetOn);
        }
      }
    }
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(PIR_PIN, INPUT);
  for (int i = 0; i < 4; i++) {
    pinMode(relayPins[i], OUTPUT);
    setRelay(i, false);
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.print("\\nConnected! Local LAN IP: http://");
  Serial.println(WiFi.localIP());

  server.on("/api/status", HTTP_GET, handleLocalStatus);
  server.on("/api/status", HTTP_OPTIONS, []() { sendCors(); server.send(204); });
  server.on("/api/relay", HTTP_POST, handleLocalRelay);
  server.on("/api/relay", HTTP_OPTIONS, []() { sendCors(); server.send(204); });
  server.begin();
}

void loop() {
  server.handleClient(); // Local LAN always stays responsive!
  if (millis() - lastCloudSync >= SYNC_INTERVAL_MS) {
    lastCloudSync = millis();
    syncWithCloudServer();
  }
}`,
  },
  {
    id: 'esp32_cam_stream',
    title: 'ESP32-CAM Live MJPEG Stream + Flash & PIR (Separate Node)',
    filename: 'esp32_cam_mjpeg_pir.ino',
    language: 'cpp',
    platform: 'Arduino IDE · AI Thinker ESP32-CAM (OV2640)',
    summary:
      'Dedicated firmware for a separate AI-Thinker ESP32-CAM board. Serves live MJPEG video at http://CAM-IP:81/stream (paste directly into any VoltHome camera card Stream URL), JPEG snapshot at /capture, flash LED control at /flash?state=on, and PIR motion state on GPIO 13.',
    libraries: ['esp_camera.h (Espressif ESP32 core)', 'WiFi.h', 'esp_http_server.h'],
    steps: [
      'Select Board: "AI Thinker ESP32-CAM" in Arduino IDE -> Tools -> Board -> ESP32 Arduino.',
      'Connect FTDI USB-TTL: 5V->5V (or dedicated 5V/2A PSU), GND->GND, U0R->TX, U0T->RX, and short GPIO 0 to GND while uploading.',
      'Remove GPIO 0->GND jumper after upload, press RST, open Serial Monitor (115200 baud) to read your camera IP.',
      'Paste http://<CAM-IP>:81/stream into any Camera Card -> "Stream URL" on VoltHome Dashboard.',
    ],
    code: `#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"

// ---- 1. Wi-Fi Credentials ----
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ---- 2. AI-Thinker ESP32-CAM OV2640 Pin Map ----
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ---- 3. Peripheral Pins on ESP32-CAM ----
#define FLASH_LED_PIN      4   // High-power white SMD flash LED
#define PIR_MOTION_PIN    13   // External HC-SR501 PIR sensor OUT
#define STATUS_LED_PIN    33   // Rear red LED (Active-LOW)

httpd_handle_t camera_httpd = NULL;
httpd_handle_t stream_httpd = NULL;

static const char* STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=volthomeframe";
static const char* STREAM_BOUNDARY = "\\r\\n--volthomeframe\\r\\n";
static const char* STREAM_PART = "Content-Type: image/jpeg\\r\\nContent-Length: %u\\r\\n\\r\\n";

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  res = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      res = ESP_FAIL;
      break;
    }
    size_t hlen = snprintf(part_buf, 64, STREAM_PART, fb->len);
    res = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, part_buf, hlen);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    if (res != ESP_OK) break;
  }
  return res;
}

static esp_err_t capture_handler(httpd_req_t *req) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_type(req, "image/jpeg");
  esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  esp_camera_fb_return(fb);
  return res;
}

static esp_err_t status_handler(httpd_req_t *req) {
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_type(req, "application/json");
  char json[160];
  int motion = digitalRead(PIR_MOTION_PIN) == HIGH ? 1 : 0;
  snprintf(json, sizeof(json),
    "{\\"online\\":true,\\"motion\\":%s,\\"rssi\\":%d,\\"ip\\":\\"%s\\"}",
    motion ? "true" : "false", WiFi.RSSI(), WiFi.localIP().toString().c_str());
  return httpd_resp_send(req, json, strlen(json));
}

static esp_err_t flash_handler(httpd_req_t *req) {
  char query[32];
  bool on = false;
  if (httpd_req_get_url_query_str(req, query, sizeof(query)) == ESP_OK) {
    if (strstr(query, "state=on")) on = true;
  }
  digitalWrite(FLASH_LED_PIN, on ? HIGH : LOW);
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_type(req, "application/json");
  return httpd_resp_sendstr(req, on ? "{\\"flash\\":true}" : "{\\"flash\\":false}");
}

void startCameraServers() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t capture_uri = {"/capture", HTTP_GET, capture_handler, NULL};
  httpd_uri_t status_uri  = {"/status",  HTTP_GET, status_handler,  NULL};
  httpd_uri_t flash_uri   = {"/flash",   HTTP_GET, flash_handler,   NULL};

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &capture_uri);
    httpd_register_uri_handler(camera_httpd, &status_uri);
    httpd_register_uri_handler(camera_httpd, &flash_uri);
  }

  httpd_config_t stream_cfg = HTTPD_DEFAULT_CONFIG();
  stream_cfg.server_port = 81;
  stream_cfg.ctrl_port   = 32769;
  httpd_uri_t stream_uri = {"/stream", HTTP_GET, stream_handler, NULL};
  if (httpd_start(&stream_httpd, &stream_cfg) == ESP_OK) {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);
  pinMode(PIR_MOTION_PIN, INPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, HIGH); // OFF

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count     = 2;

  if (esp_camera_init(&config) != ESP_OK) {
    Serial.println("Camera init failed! Check 5V/2A power and ribbon cable.");
    return;
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  digitalWrite(STATUS_LED_PIN, LOW); // Connected indicator ON
  Serial.print("\\nLive Stream URL: http://");
  Serial.print(WiFi.localIP());
  Serial.println(":81/stream");
  startCameraServers();
}

void loop() {
  delay(100);
}`,
  },
  {
    id: 'esp32_cam_cloud',
    title: 'ESP32-CAM Motion Snapshot -> Cloud Server Uploader',
    filename: 'esp32_cam_motion_cloud.ino',
    language: 'cpp',
    platform: 'Arduino IDE · ESP32-CAM + PythonAnywhere / App Server',
    summary:
      'Monitors HC-SR501 PIR sensor on GPIO 13, captures a JPEG frame on motion, and uploads it via HTTPS POST to your PythonAnywhere or VoltHome server with X-API-Key authentication.',
    libraries: ['esp_camera.h', 'WiFi.h', 'HTTPClient.h', 'WiFiClientSecure.h'],
    steps: [
      'Wire HC-SR501 PIR sensor: VCC -> 5V, GND -> GND, OUT -> GPIO 13.',
      'Set UPLOAD_URL to your PythonAnywhere or App Server endpoint (e.g. https://yourusername.pythonanywhere.com/api/camera/upload).',
      'Flash with GPIO 0 -> GND, then disconnect GPIO 0 and press RST.',
    ],
    code: `#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* UPLOAD_URL    = "https://yourusername.pythonanywhere.com/api/camera/upload";
const char* API_SECRET    = "CHANGE_THIS_SHARED_SECRET";
const char* CAMERA_ID     = "cam-porch";

#define PIR_PIN       13
#define FLASH_PIN      4
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM  0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM   35
#define Y8_GPIO_NUM   34
#define Y7_GPIO_NUM   39
#define Y6_GPIO_NUM   36
#define Y5_GPIO_NUM   21
#define Y4_GPIO_NUM   19
#define Y3_GPIO_NUM   18
#define Y2_GPIO_NUM    5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM  23
#define PCLK_GPIO_NUM  22

unsigned long lastTriggerMs = 0;

void uploadMotionFrame() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  if (http.begin(client, UPLOAD_URL)) {
    http.addHeader("Content-Type", "image/jpeg");
    http.addHeader("X-API-Key", API_SECRET);
    http.addHeader("X-Camera-Id", CAMERA_ID);
    int code = http.POST(fb->buf, fb->len);
    Serial.printf("Uploaded motion JPEG (%u bytes) -> HTTP %d\\n", fb->len, code);
    http.end();
  }
  esp_camera_fb_return(fb);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  pinMode(FLASH_PIN, OUTPUT);
  digitalWrite(FLASH_PIN, LOW);

  camera_config_t c;
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer   = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM; c.pin_d2 = Y4_GPIO_NUM; c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM; c.pin_d6 = Y8_GPIO_NUM; c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM; c.pin_vsync = VSYNC_GPIO_NUM; c.pin_href = HREF_GPIO_NUM;
  c.pin_sccb_sda = SIOD_GPIO_NUM; c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM; c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size   = FRAMESIZE_SVGA;
  c.jpeg_quality = 10;
  c.fb_count     = 1;

  if (esp_camera_init(&c) != ESP_OK) {
    Serial.println("Camera init failed!");
    return;
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(400);
  Serial.println("ESP32-CAM Motion Uploader Ready.");
}

void loop() {
  if (digitalRead(PIR_PIN) == HIGH && millis() - lastTriggerMs > 15000) {
    lastTriggerMs = millis();
    uploadMotionFrame();
  }
  delay(200);
}`,
  },
  {
    id: 'pythonanywhere',
    title: 'PythonAnywhere Free Web App (Flask + SQLite)',
    filename: 'flask_app.py',
    language: 'python',
    platform: 'PythonAnywhere Free Tier · Python 3.10+ · Flask',
    summary:
      'Complete, zero-cost cloud backend designed specifically for PythonAnywhere free accounts (no paid custom worker needed). Uses SQLite persistence, CORS for this Android/PWA app, API key protection, relay state sync, thermostat target, schedules, and power usage logs.',
    libraries: ['flask', 'flask-cors', 'sqlite3 (built-in)'],
    steps: [
      'Create a free account at pythonanywhere.com and open Web -> Add a new web app -> Flask -> Python 3.10.',
      'Open a Bash console and run: pip3.10 install --user flask flask-cors',
      'Replace /home/yourusername/mysite/flask_app.py with the code below and update API_SECRET.',
      'Click "Reload" on the PythonAnywhere Web tab, then paste https://yourusername.pythonanywhere.com in VoltHome -> Access & Alerts -> Connectivity!',
    ],
    code: `import os
import json
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

API_SECRET = os.environ.get("VOLTHOME_API_KEY", "CHANGE_THIS_SHARED_SECRET")
DB_PATH = os.path.join(os.path.dirname(__file__), "volthome.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS device_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            relays_json TEXT NOT NULL,
            temperature REAL DEFAULT 24.5,
            humidity REAL DEFAULT 50.0,
            target_temp REAL DEFAULT 23.5,
            rssi INTEGER DEFAULT -60,
            local_ip TEXT DEFAULT '192.168.1.45',
            motion INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            device TEXT NOT NULL,
            channel INTEGER,
            event TEXT NOT NULL,
            watts REAL DEFAULT 0,
            actor TEXT DEFAULT 'Cloud'
        );
    """)
    row = conn.execute("SELECT id FROM device_state WHERE id = 1").fetchone()
    if not row:
        conn.execute(
            "INSERT INTO device_state (id, relays_json, updated_at) VALUES (1, ?, ?)",
            (json.dumps([False, False, False, False]), datetime.utcnow().isoformat()),
        )
    conn.commit()
    conn.close()

init_db()

def check_auth():
    token = request.headers.get("X-API-Key") or request.args.get("key")
    return token == API_SECRET

@app.route("/api/status", methods=["GET"])
def api_status():
    conn = get_db()
    row = conn.execute("SELECT * FROM device_state WHERE id = 1").fetchone()
    logs = conn.execute("SELECT * FROM usage_logs ORDER BY id DESC LIMIT 30").fetchall()
    conn.close()
    relays = json.loads(row["relays_json"])
    rated = [18, 14, 55, 840]
    watts = sum(rated[i] for i, on in enumerate(relays) if on) + 6.5
    return jsonify({
        "temperature": row["temperature"],
        "humidity": row["humidity"],
        "targetTemp": row["target_temp"],
        "rssi": row["rssi"],
        "localIp": row["local_ip"],
        "motion": bool(row["motion"]),
        "relays": relays,
        "watts": round(watts, 1),
        "updatedAt": row["updated_at"],
        "logs": [dict(l) for l in logs],
    })

@app.route("/api/relay", methods=["POST"])
def api_relay():
    if API_SECRET != "CHANGE_THIS_SHARED_SECRET" and not check_auth():
        return jsonify({"ok": False, "error": "Unauthorized"}), 401
    ch = request.args.get("ch", type=int) or (request.json or {}).get("channel")
    st = request.args.get("state") or (request.json or {}).get("state")
    if ch not in (1, 2, 3, 4):
        return jsonify({"ok": False, "error": "Invalid channel"}), 400
    is_on = str(st).lower() in ("on", "true", "1")

    conn = get_db()
    row = conn.execute("SELECT relays_json FROM device_state WHERE id = 1").fetchone()
    relays = json.loads(row["relays_json"])
    relays[ch - 1] = is_on
    now = datetime.utcnow().isoformat()
    conn.execute(
        "UPDATE device_state SET relays_json = ?, updated_at = ? WHERE id = 1",
        (json.dumps(relays), now),
    )
    rated = [18, 14, 55, 840]
    conn.execute(
        "INSERT INTO usage_logs (timestamp, device, channel, event, watts, actor) VALUES (?, ?, ?, ?, ?, ?)",
        (now, f"Relay Channel {ch}", ch, f"Switched {'ON' if is_on else 'OFF'}", rated[ch - 1] if is_on else 0, "Remote App"),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "relays": relays})

@app.route("/api/thermostat", methods=["POST"])
def api_thermostat():
    data = request.json or {}
    target = float(data.get("targetTemp", 23.5))
    conn = get_db()
    conn.execute(
        "UPDATE device_state SET target_temp = ?, updated_at = ? WHERE id = 1",
        (target, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "targetTemp": target})

# ESP32 polls this endpoint every 3 seconds
@app.route("/api/esp32/sync", methods=["POST"])
def esp32_sync():
    if not check_auth():
        return jsonify({"ok": False, "error": "Invalid X-API-Key"}), 401
    data = request.json or {}
    conn = get_db()
    now = datetime.utcnow().isoformat()
    conn.execute(
        """UPDATE device_state SET
           temperature = COALESCE(?, temperature),
           humidity = COALESCE(?, humidity),
           rssi = COALESCE(?, rssi),
           local_ip = COALESCE(?, local_ip),
           motion = COALESCE(?, motion),
           updated_at = ?
           WHERE id = 1""",
        (data.get("temperature"), data.get("humidity"), data.get("rssi"), data.get("localIp"), int(bool(data.get("motion", False))), now),
    )
    row = conn.execute("SELECT relays_json, target_temp FROM device_state WHERE id = 1").fetchone()
    conn.commit()
    conn.close()
    return jsonify({
        "ok": True,
        "relays": json.loads(row["relays_json"]),
        "targetTemp": row["target_temp"],
    })
`,
  },
  {
    id: 'android_kotlin',
    title: 'Android Studio Kotlin App (Jetpack Compose + WebView/API)',
    filename: 'MainActivity.kt',
    language: 'kotlin',
    platform: 'Android Studio · Kotlin · API 26+',
    summary:
      'Want a standalone .APK in addition to installing this PWA on Android? Drop this Jetpack Compose activity into Android Studio—it embeds this VoltHome dashboard with local LAN cleartext support, microphone voice permission, and native Android notification channels.',
    libraries: ['androidx.activity:activity-compose', 'android.permission.INTERNET', 'android.permission.RECORD_AUDIO', 'android.permission.POST_NOTIFICATIONS'],
    steps: [
      'Create an Empty Activity (Jetpack Compose) project in Android Studio.',
      'Add INTERNET, RECORD_AUDIO, POST_NOTIFICATIONS, and usesCleartextTraffic="true" (for local http://192.168.x.x ESP32 control) in AndroidManifest.xml.',
      'Replace APP_URL with your hosted URL or PythonAnywhere URL, then Build -> Build APK(s).',
    ],
    code: `package com.volthome.esp32

import android.Manifest
import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {
    // Point to your deployed VoltHome App Server or Local ESP32 IP
    private val appUrl = "https://YOUR_APP_URL_OR_PYTHONANYWHERE"

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ -> }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val perms = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        permissionLauncher.launch(perms.toTypedArray())

        setContent {
            VoltHomeWebContainer(url = appUrl)
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun VoltHomeWebContainer(url: String) {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.mediaPlaybackRequiresUserGesture = false
                settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                webViewClient = WebViewClient()
                webChromeClient = object : WebChromeClient() {
                    override fun onPermissionRequest(request: PermissionRequest?) {
                        request?.grant(request.resources)
                    }
                }
                loadUrl(url)
            }
        }
    )
}

/* --- AndroidManifest.xml additions ---
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<application
    android:usesCleartextTraffic="true" ... >
*/`,
  },
];

export const ENGINEERING_SUGGESTIONS = [
  {
    title: 'Verify Relay Polarity Before Mains Wiring',
    detail:
      'As noted in your ESP32 project guide, most 4-channel optocoupler boards are active-LOW. Always test with RELAY_ACTIVE_LOW = true on low-voltage LEDs first, and use a separate 5V supply for relay coils with shared logic GND so coil inrush current does not brown-out the ESP32.',
  },
  {
    title: 'Real Power Sensing with SCT-013 or PZEM-004T',
    detail:
      'Currently relay wattage is calculated from each appliance rating. Wire a non-invasive SCT-013-030 CT clamp to GPIO 34 (ADC1) or a UART PZEM-004T v3 module to GPIO 26/27 for true RMS voltage, amperage, and power factor telemetry.',
  },
  {
    title: 'Zero-Cost Remote Access on PythonAnywhere',
    detail:
      'PythonAnywhere free tier restricts outbound sockets/MQTT brokers, so HTTPS short-polling (ESP32 POSTing every 3 seconds to /api/esp32/sync) is the most reliable architecture—plus keeping local port 80 alive on the ESP32 gives you sub-50ms offline LAN control.',
  },
  {
    title: 'mDNS + Static DHCP Lease on Your Router',
    detail:
      'Add ESPmDNS.h (MDNS.begin("volthome")) and reserve your ESP32 MAC address in your Wi-Fi router DHCP table so your local IP (192.168.1.45) never shifts after a power outage.',
  },
  {
    title: 'ESP32-CAM Power & Brownout Prevention',
    detail:
      'ESP32-CAM modules draw sharp 300–450 mA Wi-Fi spikes during JPEG capture. Power the camera from a clean 5V/2A regulator with a 470 µF capacitor across 5V and GND to eliminate brownout detector resets.',
  },
];

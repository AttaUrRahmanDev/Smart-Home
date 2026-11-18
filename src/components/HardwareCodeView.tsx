import React, {useState} from 'react';
import {AlertTriangle, Camera, Check, Copy, Cpu, Download, Lightbulb} from 'lucide-react';
import {
  CODE_TEMPLATES,
  ENGINEERING_SUGGESTIONS,
  ESP32_CAM_PINS,
  ESP32_PINS,
  type CodeTemplateFile,
  type Esp32PinSpec,
} from '../data/codeTemplates';

export const HardwareCodeView: React.FC = () => {
  const [boardType, setBoardType] = useState<'controller' | 'camera'>('controller');
  const activePinList = boardType === 'controller' ? ESP32_PINS : ESP32_CAM_PINS;

  const [selectedPin, setSelectedPin] = useState<Esp32PinSpec>(
    ESP32_PINS.find((p) => p.gpio === 'GPIO 4') ?? ESP32_PINS[0]
  );
  const [activeCodeId, setActiveCodeId] = useState<CodeTemplateFile['id']>('esp32_local');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleBoardSwitch = (next: 'controller' | 'camera') => {
    setBoardType(next);
    const list = next === 'controller' ? ESP32_PINS : ESP32_CAM_PINS;
    setSelectedPin(list.find((p) => p.gpio === 'GPIO 4' || p.gpio === 'GPIO 13') ?? list[0]);
  };

  const leftPins = activePinList.filter((p) => p.side === 'left').sort((a, b) => a.order - b.order);
  const rightPins = activePinList.filter((p) => p.side === 'right').sort((a, b) => a.order - b.order);
  const activeTemplate = CODE_TEMPLATES.find((t) => t.id === activeCodeId) ?? CODE_TEMPLATES[0];

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleDownload = (filename: string, code: string) => {
    const blob = new Blob([code], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getPinDotColor = (cat: Esp32PinSpec['category']) => {
    if (cat === 'relay') return 'bg-emerald-500';
    if (cat === 'sensor') return 'bg-sky-400';
    if (cat === 'power') return 'bg-amber-400';
    if (cat === 'expansion') return 'bg-indigo-400';
    return 'bg-slate-400';
  };

  return (
    <div className="space-y-8">
      {/* Board Pinout Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Hardware Pinouts &amp; Wiring Diagrams
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
            Separate pin maps for the Home Relay Controller and the AI-Thinker ESP32-CAM Security Node
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-[#141f32] border border-slate-200 dark:border-[#263750] p-1">
          <button
            type="button"
            onClick={() => handleBoardSwitch('controller')}
            className={`min-h-[42px] inline-flex items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition ${
              boardType === 'controller'
                ? 'bg-white dark:bg-[#1e2d47] text-slate-900 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-[#9eb0c9]'
            }`}
          >
            <Cpu className="h-4 w-4" />
            Home Controller (ESP32-WROOM-32)
          </button>
          <button
            type="button"
            onClick={() => handleBoardSwitch('camera')}
            className={`min-h-[42px] inline-flex items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition ${
              boardType === 'camera'
                ? 'bg-white dark:bg-[#1e2d47] text-slate-900 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-[#9eb0c9]'
            }`}
          >
            <Camera className="h-4 w-4" />
            Camera Node (ESP32-CAM)
          </button>
        </div>
      </div>

      {/* Interactive ESP32 Pinout Inspector + Wiring Map */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              {boardType === 'controller' ? (
                <Cpu className="h-5 w-5 text-emerald-500" />
              ) : (
                <Camera className="h-5 w-5 text-emerald-500" />
              )}
              {boardType === 'controller'
                ? 'ESP32-WROOM-32 Interactive Pinout'
                : 'AI-Thinker ESP32-CAM (OV2640) Pinout'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
              Tap any header pin to inspect device mapping, boot strapping rules, and power requirements
            </p>
          </div>

          {/* Visual DevKit Pin Board */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 sm:gap-4 rounded-2xl bg-slate-50 dark:bg-[#0b1220] border border-slate-200 dark:border-[#263750] p-4">
            <div className="space-y-2">
              {leftPins.map((pin) => {
                const active = selectedPin.gpio === pin.gpio;
                return (
                  <button
                    key={pin.gpio}
                    type="button"
                    onClick={() => setSelectedPin(pin)}
                    className={`w-full min-h-[42px] flex items-center justify-between gap-2 rounded-xl border px-2.5 text-left transition ${
                      active
                        ? 'border-emerald-500 bg-emerald-500/15 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] text-slate-600 dark:text-[#9eb0c9] hover:border-slate-400'
                    }`}
                  >
                    <span className="text-[11px] truncate">{pin.device.split(' ')[0]}</span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold shrink-0">
                      {pin.gpio}
                      <span className={`h-2 w-2 rounded-full ${getPinDotColor(pin.category)}`} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-20 sm:w-28 rounded-xl border border-slate-300 dark:border-[#314665] bg-slate-200 dark:bg-[#1a2840] flex flex-col items-center justify-between py-4 px-2 text-center">
              <div className="w-full h-10 rounded-md border border-slate-400/50 dark:border-slate-600 bg-slate-300/60 dark:bg-[#0f172a] flex items-center justify-center text-[9px] font-mono text-slate-500 dark:text-slate-400">
                {boardType === 'controller' ? 'Wi-Fi PCB' : 'OV2640 Lens'}
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold font-mono text-slate-800 dark:text-slate-100">
                  {boardType === 'controller' ? 'ESP32' : 'ESP32-CAM'}
                </p>
                <p className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                  {boardType === 'controller' ? 'WROOM-32' : 'AI-Thinker'}
                </p>
                <p className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
                  {boardType === 'controller' ? '3.3V Logic' : '5V / 2A PSU'}
                </p>
              </div>
              <div className="w-12 h-5 rounded border border-slate-400 dark:border-slate-500 bg-slate-300 dark:bg-slate-700 text-[8px] font-mono flex items-center justify-center text-slate-700 dark:text-slate-200">
                {boardType === 'controller' ? 'USB' : 'SD Slot'}
              </div>
            </div>

            <div className="space-y-2">
              {rightPins.map((pin) => {
                const active = selectedPin.gpio === pin.gpio;
                return (
                  <button
                    key={pin.gpio}
                    type="button"
                    onClick={() => setSelectedPin(pin)}
                    className={`w-full min-h-[42px] flex items-center justify-between gap-2 rounded-xl border px-2.5 text-right transition ${
                      active
                        ? 'border-emerald-500 bg-emerald-500/15 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] text-slate-600 dark:text-[#9eb0c9] hover:border-slate-400'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold shrink-0">
                      <span className={`h-2 w-2 rounded-full ${getPinDotColor(pin.category)}`} />
                      {pin.gpio}
                    </span>
                    <span className="text-[11px] truncate">{pin.device.split('·')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.06] p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {selectedPin.gpio} · {selectedPin.label}
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-[#9eb0c9]">
                {selectedPin.direction}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedPin.device}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedPin.notes}
            </p>
          </div>
        </div>

        {/* Complete Pin Map Table & Electrical Safety */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-[#263750]">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {boardType === 'controller'
                  ? 'Home Controller Wiring Reference'
                  : 'ESP32-CAM & FTDI Flash Wiring Reference'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
                {boardType === 'controller'
                  ? 'Core pins from ESP32 Project Guide + energy & motion expansion pins'
                  : 'External header pins (internal OV2640 camera pins 5,18,19,21,22,23,25,26,27,32,34,35,36,39 are pre-wired on PCB)'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#263750] text-slate-500 dark:text-[#9eb0c9]">
                    <th className="py-2.5 px-4 font-medium">ESP32 Pin</th>
                    <th className="py-2.5 px-4 font-medium">Connected Device</th>
                    <th className="py-2.5 px-4 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#263750]/60">
                  {activePinList.map((pin) => (
                    <tr
                      key={pin.gpio}
                      onClick={() => setSelectedPin(pin)}
                      className={`cursor-pointer transition ${
                        selectedPin.gpio === pin.gpio
                          ? 'bg-emerald-500/10'
                          : 'hover:bg-slate-50 dark:hover:bg-[#18263d]/60'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 dark:text-emerald-400 whitespace-nowrap">
                        {pin.gpio}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-200">{pin.device}</td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-[#9eb0c9]">{pin.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-slate-700 dark:text-amber-100/90 leading-relaxed">
              {boardType === 'controller' ? (
                <>
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    Electrical Safety &amp; Active-LOW Relay Notice
                  </p>
                  <p>
                    Test your 4-channel relay board with low-voltage LEDs first. Never expose AC mains wiring on a breadboard or connect mains voltage to ESP32 pins. Set <code className="font-mono font-semibold">RELAY_ACTIVE_LOW = true</code> for active-LOW optocoupler modules.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    ESP32-CAM Flashing &amp; Brownout Prevention
                  </p>
                  <p>
                    Because AI-Thinker ESP32-CAM has no onboard USB chip, connect <code className="font-mono font-semibold">GPIO 0</code> to <code className="font-mono font-semibold">GND</code> only during upload, then remove the jumper and press <code className="font-mono font-semibold">RST</code>. Always supply clean 5V/2A power so Wi-Fi JPEG capture does not reset the board.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Firmware & Server Code Studio */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-[#263750] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Separate Firmware, Camera, PythonAnywhere &amp; Android Code Studio
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
              Dedicated sketches for your Home Controller, ESP32-CAM Security Nodes, PythonAnywhere Flask, and Android APK
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 dark:bg-[#0b1220] p-1">
            {CODE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setActiveCodeId(tpl.id)}
                className={`min-h-[40px] rounded-lg px-3 text-xs font-medium transition whitespace-nowrap ${
                  activeCodeId === tpl.id
                    ? 'bg-white dark:bg-[#1e2d47] text-slate-900 dark:text-emerald-400 shadow-sm'
                    : 'text-slate-600 dark:text-[#9eb0c9] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tpl.id === 'esp32_local' && 'Home: Local LAN'}
                {tpl.id === 'esp32_hybrid' && 'Home: Hybrid Cloud'}
                {tpl.id === 'esp32_cam_stream' && 'Cam: MJPEG Stream'}
                {tpl.id === 'esp32_cam_cloud' && 'Cam: Motion Cloud'}
                {tpl.id === 'pythonanywhere' && 'PythonAnywhere'}
                {tpl.id === 'android_kotlin' && 'Android Kotlin'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-[#9eb0c9]">
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {activeTemplate.filename}
                </span>
                <span>·</span>
                <span>{activeTemplate.platform}</span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {activeTemplate.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activeTemplate.summary}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy(activeTemplate.code, activeTemplate.id)}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#263750] px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500/60 transition"
              >
                {copiedId === activeTemplate.id ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Code
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDownload(activeTemplate.filename, activeTemplate.code)}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-slate-50 dark:bg-[#0b1220] border border-slate-200 dark:border-[#263750] p-4 text-xs">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Required Libraries / Dependencies
              </p>
              <ul className="space-y-1 text-slate-600 dark:text-[#9eb0c9] font-mono">
                {activeTemplate.libraries.map((lib) => (
                  <li key={lib}>• {lib}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Deployment Checklist
              </p>
              <ol className="space-y-1 text-slate-600 dark:text-[#9eb0c9] list-decimal list-inside">
                {activeTemplate.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          <pre className="rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-950 text-slate-100 p-4 overflow-x-auto text-xs leading-relaxed font-mono max-h-[460px]">
            <code>{activeTemplate.code}</code>
          </pre>
        </div>
      </section>

      {/* Engineering Recommendations */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-emerald-500" />
            Hardware &amp; Architecture Suggestions
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
            Practical upgrades for reliability, true energy metering, and zero-cost cloud hosting
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ENGINEERING_SUGGESTIONS.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-5 space-y-2"
            >
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

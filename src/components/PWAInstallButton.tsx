import React, {useState} from 'react';
import {Download, Smartphone, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98] whitespace-nowrap shrink-0"
      >
        <Download className="h-4 w-4" />
        Install Android App
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 dark:border-[#263750] bg-white dark:bg-[#141f32] px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:border-emerald-500/60 whitespace-nowrap shrink-0"
      >
        <Smartphone className="h-4 w-4 text-emerald-500" />
        {isIOS ? 'Add to iPhone' : 'Install App'}
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {isIOS ? 'Install on iPhone / iPad' : 'Install on Android'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close install guide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {isIOS ? (
                <>
                  <p>1. Tap the <strong>Share</strong> icon in Safari toolbar.</p>
                  <p>2. Scroll down and select <strong>Add to Home Screen</strong>.</p>
                </>
              ) : (
                <>
                  <p>1. Open this dashboard in <strong>Chrome for Android</strong>.</p>
                  <p>2. Tap the browser menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    For a standalone signed APK, use the Kotlin Jetpack Compose wrapper in the Hardware &amp; Code tab.
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold text-sm transition hover:opacity-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

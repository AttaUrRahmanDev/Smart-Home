import React, {useCallback, useEffect, useState} from 'react';
import type {User} from 'firebase/auth';
import {
  Download,
  FileText,
  FolderOpen,
  HardDrive,
  LogOut,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  deleteDriveFile,
  downloadDriveFileText,
  listDriveFiles,
  uploadBlobToDrive,
  type DriveFileItem,
} from '../lib/googleDriveAuth';
import type {HomeState} from '../types/iot';

interface GoogleDrivePanelProps {
  state: HomeState;
  driveUser: User | null;
  driveToken: string | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onRestoreBackup: (json: Partial<HomeState>) => Promise<void>;
}

export const GoogleDrivePanel: React.FC<GoogleDrivePanelProps> = ({
  state,
  driveUser,
  driveToken,
  onSignIn,
  onSignOut,
  onRestoreBackup,
}) => {
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [voltHomeOnly, setVoltHomeOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<DriveFileItem | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<DriveFileItem | null>(null);

  const refreshFiles = useCallback(async () => {
    if (!driveToken) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await listDriveFiles(driveToken, {voltHomeOnly, search});
      setFiles(list);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [driveToken, voltHomeOnly, search]);

  useEffect(() => {
    if (driveToken) {
      refreshFiles();
    } else {
      setFiles([]);
    }
  }, [driveToken, refreshFiles]);

  const handleBackupState = async () => {
    if (!driveToken) return;
    setBusyMsg('Uploading smart home config backup...');
    setErrorMsg(null);
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const payload = JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          relays: state.relays,
          thermostat: state.thermostat,
          schedules: state.schedules,
          alertRules: state.alertRules,
          hardware: state.hardware,
        },
        null,
        2
      );
      await uploadBlobToDrive(
        driveToken,
        `volthome-backup-${stamp}.json`,
        payload,
        'application/json'
      );
      setBusyMsg('Smart home backup saved to "VoltHome ESP32" folder.');
      await refreshFiles();
    } catch (err) {
      setErrorMsg((err as Error).message);
      setBusyMsg(null);
    }
  };

  const handleExportEnergyCsv = async () => {
    if (!driveToken) return;
    setBusyMsg('Uploading energy usage CSV...');
    setErrorMsg(null);
    try {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const header = 'Timestamp,Device,Channel,Event,Actor,Watts,Source\n';
      const rows = state.usageLogs
        .map(
          (l) =>
            `"${l.timestamp}","${l.device.replace(/"/g, '""')}",${l.channel ?? ''},"${l.event.replace(/"/g, '""')}","${l.actor.replace(/"/g, '""')}",${l.watts},"${l.source}"`
        )
        .join('\n');
      await uploadBlobToDrive(
        driveToken,
        `volthome-energy-logs-${stamp}.csv`,
        header + rows,
        'text/csv'
      );
      setBusyMsg('Energy usage CSV uploaded to Google Drive.');
      await refreshFiles();
    } catch (err) {
      setErrorMsg((err as Error).message);
      setBusyMsg(null);
    }
  };

  const handleDownloadFile = async (file: DriveFileItem) => {
    if (!driveToken) return;
    try {
      const content = await downloadDriveFileText(driveToken, file.id);
      const blob = new Blob([content], {type: file.mimeType || 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const executeRestore = async (file: DriveFileItem) => {
    if (!driveToken) return;
    setConfirmRestore(null);
    setBusyMsg(`Restoring ${file.name}...`);
    setErrorMsg(null);
    try {
      const raw = await downloadDriveFileText(driveToken, file.id);
      const parsed = JSON.parse(raw) as Partial<HomeState>;
      await onRestoreBackup(parsed);
      setBusyMsg(`Restored configuration from ${file.name}.`);
    } catch (err) {
      setErrorMsg(`Restore failed: ${(err as Error).message}`);
      setBusyMsg(null);
    }
  };

  const executeDelete = async (file: DriveFileItem) => {
    if (!driveToken) return;
    setConfirmDelete(null);
    setBusyMsg(`Deleting ${file.name}...`);
    setErrorMsg(null);
    try {
      await deleteDriveFile(driveToken, file.id);
      setBusyMsg(`Deleted ${file.name} from Google Drive.`);
      await refreshFiles();
    } catch (err) {
      setErrorMsg((err as Error).message);
      setBusyMsg(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-emerald-500" />
            Google Drive Cloud Storage &amp; Backups
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#9eb0c9]">
            Save camera snapshots, energy CSV reports, and ESP32 smart home configurations directly to your Google Drive
          </p>
        </div>

        {!driveToken ? (
          <button
            type="button"
            onClick={onSignIn}
            className="inline-flex min-h-[44px] items-center gap-3 rounded-xl border border-slate-300 dark:border-[#263750] bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 transition whitespace-nowrap shrink-0"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Sign in with Google
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 dark:text-[#9eb0c9] truncate max-w-[200px]">
              {driveUser?.email || driveUser?.displayName}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#263750] px-3 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-red-500/60"
            >
              <LogOut className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-500">
          {errorMsg}
        </div>
      )}

      {busyMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
          {busyMsg}
        </div>
      )}

      {driveToken && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleBackupState}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition"
              >
                <Upload className="h-4 w-4" />
                Backup Home Config
              </button>
              <button
                type="button"
                onClick={handleExportEnergyCsv}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#263750] px-4 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-emerald-500/60 transition"
              >
                <FileText className="h-4 w-4 text-emerald-500" />
                Save Energy CSV
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Drive files..."
                  className="min-h-[42px] w-44 rounded-xl border border-slate-200 dark:border-[#263750] bg-slate-50 dark:bg-[#0b1220] pl-9 pr-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => setVoltHomeOnly((v) => !v)}
                className={`min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${
                  voltHomeOnly
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-[#263750] text-slate-600 dark:text-[#9eb0c9]'
                }`}
              >
                <FolderOpen className="h-3.5 w-3.5" />
                {voltHomeOnly ? 'VoltHome Folder' : 'All Drive'}
              </button>

              <button
                type="button"
                onClick={refreshFiles}
                aria-label="Refresh Drive files"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-[#263750] text-slate-600 dark:text-slate-200 hover:border-emerald-500/60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-[#263750] overflow-hidden">
            {files.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-[#9eb0c9]">
                {loading
                  ? 'Loading Google Drive files...'
                  : 'No files found in this view. Click "Backup Home Config" or save a camera snapshot from the Dashboard.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#263750]/60">
                {files.map((f) => {
                  const isJsonBackup = f.name.endsWith('.json') && f.name.includes('volthome');
                  return (
                    <div
                      key={f.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#18263d]/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {f.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#9eb0c9] font-mono tabular-nums">
                          {f.modifiedTime ? new Date(f.modifiedTime).toLocaleString() : '—'}
                          {f.size ? ` · ${(Number(f.size) / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isJsonBackup && (
                          <button
                            type="button"
                            onClick={() => setConfirmRestore(f)}
                            className="min-h-[38px] inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownloadFile(f)}
                          className="min-h-[38px] inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-[#263750] px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(f)}
                          aria-label={`Delete ${f.name}`}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-[#263750] text-slate-400 hover:text-red-500 hover:border-red-500/50"
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
        </>
      )}

      {/* Explicit Confirmation Dialog for Delete (Mandatory per Workspace Guidelines) */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Delete File from Google Drive?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete <strong>{confirmDelete.name}</strong> from your Google Drive? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] px-4 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDelete(confirmDelete)}
                className="min-h-[44px] rounded-xl bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-500"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Confirmation Dialog for Restore */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#263750] bg-white dark:bg-[#141f32] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Restore Home Configuration?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Restoring <strong>{confirmRestore.name}</strong> will overwrite your current relay names, thermostat setpoint, schedules, and alert rules.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestore(null)}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-[#263750] px-4 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeRestore(confirmRestore)}
                className="min-h-[44px] rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

import {initializeApp, getApps, getApp} from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

// Strict in-memory token cache (never stored in localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
};

export const signInWithGoogleDrive = async (): Promise<{user: User; accessToken: string}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google Drive OAuth access token.');
    }
    cachedAccessToken = credential.accessToken;
    return {user: result.user, accessToken: cachedAccessToken};
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = (): string | null => cachedAccessToken;

export const signOutGoogleDrive = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
};

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

const FOLDER_NAME = 'VoltHome ESP32';

export async function ensureVoltHomeFolder(token: string): Promise<string> {
  const query = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {headers: {Authorization: `Bearer ${token}`}}
  );
  if (!searchRes.ok) throw new Error(`Drive folder search failed (${searchRes.status})`);
  const searchJson = (await searchRes.json()) as {files?: Array<{id: string}>};
  if (searchJson.files && searchJson.files.length > 0) {
    return searchJson.files[0].id;
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!createRes.ok) throw new Error(`Drive folder creation failed (${createRes.status})`);
  const created = (await createRes.json()) as {id: string};
  return created.id;
}

export async function listDriveFiles(
  token: string,
  options?: {voltHomeOnly?: boolean; search?: string}
): Promise<DriveFileItem[]> {
  const clauses = ['trashed=false'];
  if (options?.voltHomeOnly) {
    const folderId = await ensureVoltHomeFolder(token);
    clauses.push(`'${folderId}' in parents`);
  }
  if (options?.search?.trim()) {
    const safe = options.search.trim().replace(/'/g, "\\'");
    clauses.push(`name contains '${safe}'`);
  }
  const q = encodeURIComponent(clauses.join(' and '));
  const fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime,webViewLink)');
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=30&fields=${fields}`,
    {headers: {Authorization: `Bearer ${token}`}}
  );
  if (!res.ok) throw new Error(`Failed listing Google Drive files (${res.status})`);
  const data = (await res.json()) as {files?: DriveFileItem[]};
  return data.files ?? [];
}

export async function uploadBlobToDrive(
  token: string,
  filename: string,
  content: Blob | string,
  mimeType: string
): Promise<DriveFileItem> {
  const folderId = await ensureVoltHomeFolder(token);
  const metadata = {
    name: filename,
    parents: [folderId],
    mimeType,
  };
  const blob = typeof content === 'string' ? new Blob([content], {type: mimeType}) : content;
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
  form.append('file', blob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`},
      body: form,
    }
  );
  if (!res.ok) throw new Error(`Google Drive upload failed (${res.status})`);
  return (await res.json()) as DriveFileItem;
}

export async function downloadDriveFileText(token: string, fileId: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {Authorization: `Bearer ${token}`},
  });
  if (!res.ok) throw new Error(`Google Drive download failed (${res.status})`);
  return res.text();
}

export async function deleteDriveFile(token: string, fileId: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {Authorization: `Bearer ${token}`},
  });
  if (!res.ok) throw new Error(`Google Drive delete failed (${res.status})`);
}

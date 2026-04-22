const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FOLDER_ID = import.meta.env.VITE_DRIVE_FOLDER_ID;
const SCOPE = 'https://www.googleapis.com/auth/drive';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenClient = null;
let resolveAuth = null;
let rejectAuth = null;

// Cache date subfolder IDs so we don't re-query Drive on every upload
const dateFolderCache = new Map();

export async function waitForGoogleScripts() {
  await new Promise((resolve) => {
    if (window.gapi) { resolve(); return; }
    window.addEventListener('load', resolve, { once: true });
    const id = setInterval(() => {
      if (window.gapi) { clearInterval(id); resolve(); }
    }, 50);
  });
  await new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) { resolve(); return; }
    const id = setInterval(() => {
      if (window.google?.accounts?.oauth2) { clearInterval(id); resolve(); }
    }, 50);
  });
}

export async function initDrive() {
  await waitForGoogleScripts();

  await new Promise((resolve, reject) => {
    window.gapi.load('client', { callback: resolve, onerror: reject });
  });

  await window.gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (response) => {
      if (response.error) {
        rejectAuth?.(new Error(response.error));
      } else {
        const expiry = Date.now() + response.expires_in * 1000;
        localStorage.setItem('drive_token', response.access_token);
        localStorage.setItem('drive_token_expiry', String(expiry));
        window.gapi.client.setToken({ access_token: response.access_token });
        resolveAuth?.(response.access_token);
      }
      resolveAuth = null;
      rejectAuth = null;
    },
  });

  if (isAuthenticated()) {
    window.gapi.client.setToken({ access_token: localStorage.getItem('drive_token') });
  }
}

export function isAuthenticated() {
  const token = localStorage.getItem('drive_token');
  const expiry = localStorage.getItem('drive_token_expiry');
  return !!(token && expiry && Date.now() < Number(expiry) - 60_000);
}

export function authenticate() {
  return new Promise((resolve, reject) => {
    if (isAuthenticated()) { resolve(localStorage.getItem('drive_token')); return; }
    resolveAuth = resolve;
    rejectAuth = reject;
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function signOutDrive() {
  const token = localStorage.getItem('drive_token');
  if (token) window.google.accounts.oauth2.revoke(token, () => {});
  localStorage.removeItem('drive_token');
  localStorage.removeItem('drive_token_expiry');
  window.gapi.client.setToken(null);
}

async function refreshIfNeeded() {
  if (!isAuthenticated()) await authenticate();
}

// Returns or creates a subfolder named YYYY-MM-DD inside the root JustUs folder
export async function getOrCreateDateFolder(dateStr) {
  if (dateFolderCache.has(dateStr)) return dateFolderCache.get(dateStr);

  const search = await window.gapi.client.drive.files.list({
    q: `'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and name='${dateStr}' and trashed=false`,
    fields: 'files(id)',
    pageSize: 1,
  });

  if (search.result.files?.length > 0) {
    const id = search.result.files[0].id;
    dateFolderCache.set(dateStr, id);
    return id;
  }

  const created = await window.gapi.client.drive.files.create({
    resource: {
      name: dateStr,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [FOLDER_ID],
    },
    fields: 'id',
  });

  const id = created.result.id;
  dateFolderCache.set(dateStr, id);
  return id;
}

async function compressImage(file, maxWidth = 1080) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas compression failed'));
      }, 'image/jpeg', 0.80);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file'));
    };
    img.src = url;
  });
}

// Upload a single image or video into the date subfolder, returns { id, type }
export async function uploadMedia(file, dateStr) {
  if (!FOLDER_ID) throw new Error('VITE_DRIVE_FOLDER_ID is not set');
  await refreshIfNeeded();

  const folderId = await getOrCreateDateFolder(dateStr);
  const isVideo = file.type.startsWith('video/');
  const token = localStorage.getItem('drive_token');

  let blob, filename;
  if (isVideo) {
    blob = file;
    const ext = file.name.split('.').pop() || 'mp4';
    filename = `video-${Date.now()}.${ext}`;
  } else {
    blob = await compressImage(file);
    filename = `photo-${Date.now()}.jpg`;
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name: filename, parents: [folderId] })], { type: 'application/json' }));
  form.append('file', blob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const { id } = await res.json();

  await window.gapi.client.drive.permissions.create({
    fileId: id,
    resource: { role: 'reader', type: 'anyone' },
  });

  return { id, type: isVideo ? 'video' : 'image' };
}

export async function savePost(postData) {
  if (!FOLDER_ID) throw new Error('VITE_DRIVE_FOLDER_ID is not set');
  await refreshIfNeeded();

  const post = {
    ...postData,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    reactions: [],
  };

  const token = localStorage.getItem('drive_token');
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({
    name: `post-${post.id}.json`,
    mimeType: 'application/json',
    parents: [FOLDER_ID],
  })], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(post)], { type: 'application/json' }));

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) throw new Error(`Save post failed: ${res.status}`);
  const { id: fileId } = await res.json();

  return { ...post, _fileId: fileId };
}

export async function loadPosts() {
  if (!FOLDER_ID) return [];
  await refreshIfNeeded();

  const listRes = await window.gapi.client.drive.files.list({
    q: `'${FOLDER_ID}' in parents and mimeType='application/json' and name contains 'post-' and trashed=false`,
    fields: 'files(id,name)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  });

  const files = listRes.result.files || [];

  const posts = await Promise.all(
    files.map(async (file) => {
      try {
        const res = await window.gapi.client.drive.files.get({ fileId: file.id, alt: 'media' });
        const post = typeof res.body === 'string' ? JSON.parse(res.body) : res.result;
        return { ...post, _fileId: file.id };
      } catch {
        return null;
      }
    })
  );

  return posts
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function updatePost(fileId, updates) {
  await refreshIfNeeded();

  const token = localStorage.getItem('drive_token');
  const current = await window.gapi.client.drive.files.get({ fileId, alt: 'media' });
  const post = typeof current.body === 'string' ? JSON.parse(current.body) : current.result;
  const updated = { ...post, ...updates };

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }
  );
  if (!res.ok) throw new Error(`Update post failed: ${res.status}`);
  return updated;
}

export function getVideoEmbedUrl(id) {
  return `https://drive.google.com/file/d/${id}/preview`;
}

// In-memory cache: fileId → blob URL (lives for the session)
const imageCache = new Map();

export async function getImageDisplayUrl(id) {
  if (imageCache.has(id)) return imageCache.get(id);
  await refreshIfNeeded();
  const token = localStorage.getItem('drive_token');
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const url = URL.createObjectURL(await res.blob());
  imageCache.set(id, url);
  return url;
}

export function hasFolderConfigured() {
  return !!FOLDER_ID;
}

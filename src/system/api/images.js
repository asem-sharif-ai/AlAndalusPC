import { ApiError, http } from './http';

// Photos go from the browser straight to ImageKit. The Worker only signs the upload and later checks the URL it is given.
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024 - 1; // strictly under 3 MB, what is actually uploaded
const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // sanity cap on what is picked: a phone photo is shrunk below the limit before upload
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class PhotoError extends Error {
  constructor(code) { super(code); this.code = code; } // photoType | photoSize | photoRead
}

// Real format from the first bytes, so a renamed file or a wrong MIME type is caught.
export async function sniffImage(blob) {
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const at = (i, s) => [...s].every((c, k) => b[i + k] === c.charCodeAt(0));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && at(1, 'PNG')) return 'image/png';
  if (at(0, 'RIFF') && at(8, 'WEBP')) return 'image/webp';
  return null;
}

// Checks a picked file before it is decoded. Throws PhotoError.
export async function checkSource(file) {
  if (!file || !file.size) throw new PhotoError('photoRead');
  if (file.type && !PHOTO_TYPES.includes(file.type)) throw new PhotoError('photoType');
  if (file.size > MAX_SOURCE_BYTES) throw new PhotoError('photoSize');
  if (!(await sniffImage(file))) throw new PhotoError('photoType');
}

const uploaded = new Map(); // data URL -> hosted URL, so retrying a failed save never uploads the same photo twice

async function uploadOne(dataUrl) {
  if (uploaded.has(dataUrl)) return uploaded.get(dataUrl);
  const blob = await (await fetch(dataUrl)).blob();
  if (!PHOTO_TYPES.includes(blob.type) || blob.size > MAX_PHOTO_BYTES || (await sniffImage(blob)) !== blob.type) throw new ApiError(0, 'photo_invalid');
  const auth = await http('/images/auth');
  const form = new FormData();
  form.append('file', blob, 'photo.jpg');
  form.append('fileName', 'photo.jpg');
  form.append('folder', '/tickets');
  form.append('useUniqueFileName', 'true');
  for (const key of ['publicKey', 'signature', 'expire', 'token']) form.append(key, auth[key]);
  let res;
  try {
    res = await fetch(auth.uploadUrl, { method: 'POST', body: form });
  } catch {
    throw new ApiError(0, 'upload_failed'); // offline or blocked
  }
  if (!res.ok) throw new ApiError(res.status, 'upload_failed');
  const { url } = await res.json().catch(() => ({}));
  if (typeof url !== 'string') throw new ApiError(res.status, 'upload_failed');
  uploaded.set(dataUrl, url);
  return url;
}

export const uploadImages = (images) => Promise.all(images.map((src) => (src.startsWith('data:') ? uploadOne(src) : src)));

// Small ImageKit rendition for lists and tiles; the lightbox keeps the original.
export const thumb = (src, width = 360) => (/^https:\/\/ik\.imagekit\.io\//.test(src) ? `${src}${src.includes('?') ? '&' : '?'}tr=w-${width},q-70` : src);
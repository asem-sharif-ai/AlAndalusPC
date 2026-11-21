export const API_BASE = '/api';

export class ApiError extends Error {
  constructor(status, code, body) {
    super(code);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export async function http(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method, signal, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError(0, 'network');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'error', data);
  return data;
}

export const query = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
  return s ? `?${s}` : '';
};

export const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 16);

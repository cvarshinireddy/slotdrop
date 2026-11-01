// REST client for the Express server. Every method returns the unwrapped `data` payload.
const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };
// Photos are served by the API host, so relative /uploads paths must be made absolute when the client lives on another origin.
const withPhoto = (p) => (p.photoUrl?.startsWith('/') && BASE ? { ...p, photoUrl: `${BASE}${p.photoUrl}` } : p);
const token = () => sessionStorage.getItem('slotdrop-token');

async function request(method, path, { body, form } = {}) {
  const headers = {};
  if (token()) headers.Authorization = `Bearer ${token()}`;
  if (body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, { method, headers, body: form || (body && JSON.stringify(body)) });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach SlotDrop. Check your connection and try again.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = json.error || {};
    if (res.status === 401 && path !== '/auth/login') onUnauthorized();
    throw new ApiError(res.status, e.code || 'ERROR', e.message || 'Something went wrong.', e.details);
  }
  return json.data;
}

const qs = (o) => { const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')); return p.size ? `?${p}` : ''; };

export const realApi = {
  login: (identifier, password) => request('POST', '/auth/login', { body: { identifier, password } }),
  me: () => request('GET', '/auth/me'),
  listParcels: (status) => request('GET', `/parcels${qs({ status })}`).then((d) => d.parcels.map(withPhoto)),
  parcelTimeline: (id) => request('GET', `/parcels/${id}/timeline`).then((d) => d.timeline),
  createParcel: ({ flatId, courier, shelfId, photo }) => {
    const form = new FormData();
    form.append('flatId', flatId); form.append('courier', courier);
    if (shelfId) form.append('shelfId', shelfId);
    if (photo) form.append('photo', photo);
    return request('POST', '/parcels', { form }).then((d) => withPhoto(d.parcel));
  },
  searchFlats: (q) => request('GET', `/flats/search${qs({ q })}`).then((d) => d.flats),
  listSlots: (date) => request('GET', `/slots${qs({ date })}`).then((d) => d.slots),
  todaySchedule: () => request('GET', '/slots/today').then((d) => d.slots),
  createBooking: (parcelId, slotId) => request('POST', '/bookings', { body: { parcelId, slotId } }),
  listBookings: () => request('GET', '/bookings').then((d) => d.bookings),
  getBooking: (id) => request('GET', `/bookings/${id}`).then((d) => d.booking),
  cancelBooking: (id) => request('DELETE', `/bookings/${id}`),
  delegate: (id, body) => request('POST', `/bookings/${id}/delegate`, { body }),
  verifyHandover: (body) => request('POST', '/handover/verify', { body }),
  listUsers: () => request('GET', '/users').then((d) => d.users),
  setUserActive: (id, isActive) => request('PATCH', `/users/${id}/active`, { body: { isActive } }).then((d) => d.user),
  registerUser: (body) => request('POST', '/auth/register', { body }).then((d) => d.user),
  listFlats: () => request('GET', '/flats').then((d) => d.flats),
  createFlat: (body) => request('POST', '/flats', { body }).then((d) => d.flat),
  analytics: (range) => request('GET', `/admin/analytics${qs({ range })}`),
  listTemplates: () => request('GET', '/admin/slot-templates').then((d) => d.templates),
  putTemplates: (templates) => request('PUT', '/admin/slot-templates', { body: { templates } }).then((d) => d.templates),
  patchSlot: (id, body) => request('PATCH', `/slots/${id}`, { body }).then((d) => d.slot),
  listNotifications: () => request('GET', '/notifications'),
  readNotification: (id) => request('PATCH', `/notifications/${id}/read`),
  readAllNotifications: () => request('POST', '/notifications/read-all'),
};

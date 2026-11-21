import { http } from '../../api/http';

// (message) => { name, phone, type, model, serial, pin, complaint, condition, accessories, estimate, eta }; unknown values come back as '' and the form stays editable.
export async function parseTicketMessage(message) {
  return (await http('/ai/ticket', { method: 'POST', body: { message } })).result;
}

// (serial) => [{ number, status, receivedAt }]
export async function findDeviceHistory(serial, excludeId = '') {
  return (await http(`/devices/history?serial=${encodeURIComponent(serial)}&exclude=${encodeURIComponent(excludeId)}`)).history;
}
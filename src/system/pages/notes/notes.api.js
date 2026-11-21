import { http } from '../../api/http';

// (message) => { name, phone, category, priority, deadline, description }; unknown values come back as '' and the form stays editable.
export async function parseNoteMessage(message) {
  return (await http('/ai/note', { method: 'POST', body: { message } })).result;
}

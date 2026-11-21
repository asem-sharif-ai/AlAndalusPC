# Al-Andalus System: project report

Purpose of this file: let a future session understand the project quickly, remove the demo data, and wire the real API.
It describes the code as it is now (after the cleanup). Nothing here was run in the real host app; see "Known limits".

## 1. What it is

A React front end (no build files in this folder) for a repair-shop back office. It is mounted by a host app that provides
`../utils` (outside this folder) and `react-router-dom`. Two real pages exist; two are empty placeholders.

| Route (after `/<lang>/<base>`) | Page | State |
| --- | --- | --- |
| `dashboard` | `DashboardPage` | empty shell in `SystemUI.jsx` |
| `maintenance` | `MaintenancePage` | real |
| `depository` | `DepositoryPage` | empty shell in `SystemUI.jsx` |
| `notes` | `NotesPage` | real |

Languages: English and Arabic (RTL), switched live. Theme: light and dark through `data-theme`. Styling: Tailwind utility strings.

## 2. Folder map

```
system/
  SystemUI.jsx                 app shell: routes, language/theme, search box, owns the notes store
  components/
    Header.jsx                 top bar, nav, search, language and theme toggles (uses ../../shared/components/Icon)
    Dropdown.jsx               select menu (props: hideDivider, fill)
    ConfirmDialog.jsx          the one confirmation dialog (portal, z-index 2000)
    TextField.jsx              TextInput / TextArea (decide text direction for empty vs typed text)
    Ico.jsx                    small inline icons
    RichLine.jsx               renders **bold** markers in log lines; stripMarks() removes them
    timeSpan.js                "3 hours" / "3 ساعات" helpers shared by both i18n files
    ui.js                      shared Tailwind class strings (BTN, ROW, ADD_TONE, CARD_SURFACE, ...)
    useScrollLock.js           locks page scroll while overlays are open
  pages/
    maintenance/
      MaintenancePage.jsx      list, filters, search, storage button, new-ticket modal; calls useMaintenance()
      TicketCard.jsx           one ticket: stage tabs, buttons, confirmations, activity log
      TicketStages.jsx         the four panels: IntakePanel, RepairPanel, Account (payment), DeliveryPanel
      TicketModal.jsx          new-ticket form (manual or AI text), photos, device history lookup
      StorageModal.jsx         shelf grids editor and slot picker
      PhotoLightbox.jsx        photo viewer and the MediaRow (photos + slot tile)
      useMaintenance.js        STATE + ACTIONS for tickets and grids (all in memory)
      maintenance.data.js      constants, business rules, filters, DEMO TICKETS
      maintenance.storage.js   grid/slot math, DEMO GRIDS
      maintenance.api.js       server placeholders: parseTicketMessage, checkDiscountCode, findDeviceHistory
      maintenance.i18n.js      all English and Arabic text for this page
    notes/
      NotesPage.jsx            list, filters, modal host
      NoteCard.jsx             one note: expand, deadline/status/update, Save, log
      NoteModal.jsx            create/edit form, Delete, confirmations, AI text
      useNotes.js              STATE + ACTIONS for notes (in memory); created in SystemUI
      notes.data.js            constants, filters, DEMO NOTES
      notes.api.js             server placeholder: parseNoteMessage
      notes.i18n.js            English and Arabic text for notes
```

External modules the code imports and does not contain (must exist in the host):
`../utils` exports used: `cx, now, uid, addTime, addDays, formatDate, minutesBetween, write, storageMap, applyTheme, nextTheme, applyLanguage, nextLanguage, splitPath, buildPath`;
`../../shared/components/Icon` (`SpriteIcon`); `/system.svg` (logo); `react-router-dom`.

## 3. Conventions that matter when wiring the API

- **Dates are strings** `YYYY-MM-DDTHH:mm` (local, minute precision, no timezone). Code compares them as strings (`n.eta < t`) and slices them (`slice(0,10)` is the day). The API must send and receive this exact shape or the conversion must happen in one place. `now()` returns the current value in that format.
- **ids** come from `uid()` on the client. Tickets also get a client-made `number` (`A1028`, see `nextNumber` in `useMaintenance.js`).
- **Business rules live in `maintenance.data.js`** (stage, allowed status moves `NEXT`, `canPay`, `canDeliver`, totals, `balance`, locks, filters). The server should enforce the same rules; the client uses these functions to decide what to show.
- **Money**: `paid`, `discountOf`, `total`, `balance` are computed from the ticket, never stored. Rounded to 2 decimals. Negative payments are refunds (no cap).
- **Text**: every user-visible string is in the two `*.i18n.js` files (`en` and `ar`, same keys). Keep both languages in sync.
- **Log lines** use `**value**` markers for bold; render with `RichLine`, strip with `stripMarks` for plain text.
- **Delivered tickets are locked** (`useMaintenance.update` ignores them). **Notes with status done/archived are locked** (`isActive` false).

## 4. Data shapes

### Ticket (`maintenance.data.js`, `makeDemoTickets`, `useMaintenance.add`)
```
id, number, createdBy ('human'|'ai'), status, outcome (null|'repaired'|'unrepairable'|'cancelled'|'cancelled_early'),
name, phone, type ('pc'|'monitor'|'laptop'|'printer'|'other'), model, serial, complaint, condition, accessories, pin,
images[] (URLs or data: URLs, max 3), slot ('A-B4' or ''), staff (received by), history[] ({number,status,receivedAt}),
estimate, actual, eta, receivedAt, deliveredAt, cleared (customer approval given),
tech, cause, action, parts, diagnosis,
deliverer, receiver, warranty,
discount (null | {code, type:'percent'|'fixed', value}),
debt (null | {amount, dueAt, noteId}),
payments[] ({id, at, amount (applied), method, received, change}),
log[] ({id, at, by, type, ...})
```
Statuses: `received, inspecting, awaiting_client, waiting_parts, in_repair, ready, delivered, unrepairable, parts_not_found, cancelled`.
Stages: 0 intake, 1 maintenance, 2 payment, 3 delivery, 4 delivered (locked).
Payment methods: `cash, card, wallet, instapay`.

Log entry types and their fields (rendered by `LOG_TEXT` in `TicketCard.jsx`):
`status{value}`, `edit{changes:[{field,from,to}]}`, `slot{value}`, `payment{amount,method,change}`, `discount{code}`, `debt{amount,dueAt}`, `confirm{value:'confirmed'|'skipped'}`, `delivery{value}`.

### Grid (shop shelves)
`{ id, name, code ('A'..'Z'), cols, rows }`. A slot label is `<code>-<colLetter><row>`, for example `A-B4`. Tickets store only the label. Rules in `maintenance.storage.js` (max 26x26, 26 grids, cannot shrink below a used slot).

### Note (`notes.data.js`, `useNotes`)
```
id, name, phone, category ('customer'|'supplier'|'repair'|'payment'|'balance'|'order'|'other'),
priority ('high'|'medium'|'low'), status ('pending'|'in_progress'|'done'|'archived'),
deadline, createdAt, createdBy ('human'|'ai'|'system'), description,
updates[] ({id, at, type:'note'|'status'|'extend'|'edit', ...})
```
Update types: `note{text}`, `status{value}`, `extend{from,to}`, `edit{field,from,to}`.

## 5. State and actions (what the real API must replace)

State is plain `useState` inside two hooks. Every action updates local state only. This is the seam where API calls go.

### `useMaintenance()` (called inside `MaintenancePage`)
Returns `tickets, grids, saveGrid, removeGrid` and the `api` object passed to cards:

| Action | Used by | What it does today |
| --- | --- | --- |
| `add(data)` | MaintenancePage (new ticket) | prepends a ticket, makes `number`, defaults, `status: received` |
| `go(id, status)` | TicketCard buttons | moves status if `canGo`; writes `status` log |
| `confirm(id, how)` | TicketCard approval buttons | sets `cleared`, may move `awaiting_client` to `inspecting` |
| `editRepair(id, data)` | RepairPanel Save | applies editable fields; writes one `edit` log with all changes |
| `setSlot(id, slot)` | slot picker | one-time assignment (ignored if already set) |
| `addPayment(id, amount, method)` | Account | applies up to the balance, computes `change`; negative = refund |
| `setDiscount(id, discount)` | Account | once per ticket, only while payable |
| `deferBalance(id, dueAt, makeNote, addNote)` | Account "Collect Later" | creates a **note** through `addNote` (notes store) and sets `ticket.debt` |
| `deliver(id, data)` | DeliveryPanel | sets deliverer/receiver/warranty, status `delivered` |
| `saveGrid(grid)`, `removeGrid(id)` | StorageModal | upsert / delete a grid |

Who writes the log: `actor()` in the hook picks `by` (deliverer, receiver, staff, tech). The server should set `by` and `at`.

### `useNotes()` (called once in `SystemUI`, passed to pages as `notes`)
`notes, edit(id,data), add(data) -> id, extend(id,deadline), setStatus(id,status), remove(id), addUpdate(id,text)`.
`add` returns the new id because `deferBalance` stores it in `ticket.debt.noteId`; an async API must keep returning (or resolving) an id.
Notes are created in `SystemUI` on purpose: the Maintenance page creates notes for deferred balances.

## 6. Demo data and fake services (remove or replace)

| Where | What | Replace with |
| --- | --- | --- |
| `maintenance.data.js` `makeDemoTickets()` (about 140 lines, ends the file) | 10-ish fake tickets, uses `picsum.photos` image URLs and the history serial `DL5420-8841` | server list; delete the function |
| `maintenance.storage.js` `makeDemoGrids()` | two grids "Main Shelf" (A), "Back Rack" (B) | server list; delete the function |
| `notes.data.js` `makeDemoNotes()` | fake notes | server list; delete the function |
| `useMaintenance.js` line `useState(makeDemoTickets)`, `useState(makeDemoGrids)` | initial state from demo | start `[]`, load from API |
| `useNotes.js` `useState(makeDemoNotes)` | initial state from demo | start `[]`, load from API |
| `maintenance.api.js` `parseTicketMessage(message)` | fixed fake AI result after 900 ms | AI endpoint; contract: returns `{name, phone, type, model, serial, complaint, estimate, eta}`; missing keys are left blank |
| `maintenance.api.js` `checkDiscountCode(code)` | demo codes `SAVE10` (10%), `FIX50` (50 fixed) | server check; contract: `{code, type, value}` or `null` |
| `maintenance.api.js` `findDeviceHistory(serial)` | one fake serial | server lookup; contract: `[{number, status, receivedAt}]` |
| `notes.api.js` `parseNoteMessage(message)` | fixed fake AI result | AI endpoint; contract: `{name, phone, category, priority, deadline, description}` |
| `useMaintenance.js` `nextNumber` | client computes `A<max+1>` starting at 1028 | server assigns the ticket number |
| `maintenance.data.js` demo `staff: 'Ahmed'`, `tech`, `deliverer` | fake people | real user from the session |

The four functions in the two `*.api.js` files already return Promises and are called with `await`, so swapping their bodies for `fetch` calls needs no change in the UI.

## 7. Suggested order to wire the real API

1. **Load**: add a loader in each hook (`useEffect` on mount) and start with empty arrays. Show nothing special while loading at first; add a loading state later.
2. **Make actions async**: change each action in `useMaintenance` / `useNotes` to call the API, then update state from the server response (or optimistically). Keep the same function names and arguments so the UI does not change.
3. **Server owns**: ticket `number`, ids, `at`, `by`, totals check, status-transition validation (same `NEXT` table), locks.
4. **Errors**: the UI has no error display for failed saves except the AI/discount/history flows; add one shared error message path.
5. **Fix `deferBalance`**: it needs the note id before it writes the debt; with an API, create the note first, then the ticket debt (ideally one server call).
6. **Delete the demo functions** listed above and their imports (`makeDemoTickets`, `makeDemoGrids`, `makeDemoNotes`, `picsum` URLs).
7. **Photos**: the ticket form stores photos as `data:` URLs (read with `FileReader`). The API should upload them and store URLs; `ticket.images` should become URLs. Max 3 per ticket (`MAX_PHOTOS` in `PhotoLightbox.jsx`).
8. **Dashboard and Depository** pages are empty and need their own design later.

## 8. Behaviours added or decided recently (keep them)

- Payment form: "Add Payment" label, no icon, no divider inside the method menu, method order Cash, Card, eWallet, InstaPay. Negative amounts allowed with no cap (refund). On mobile: amount and method on one row, each button on its own row.
- The separate payments list above the payment form was removed; payments are shown only in the ticket Activity log.
- Activity logs (ticket and note): system lines are italic with the key values in bold, wording written in plain, human language in both languages. User-typed note updates are not italic.
- Notes: Delete lives in the edit modal (not on the card). Save, Cancel (also Escape and click outside) and Delete in the modal all ask for confirmation. Deadline cannot be set in the past (an already overdue note can still be edited if its deadline is unchanged).
- Note card: the update box has no + button; the card Save button also adds the typed update. Changing a note to Done or Archived asks for confirmation and says it cannot be undone.
- Arabic "Promised Date" is "الموعد المتفق عليه" (filter label is shortened to "الموعد"). Notes category `balance` is "Dues" / "مستحقات".

## 9. Quality checks used and known limits

Checks used during the cleanup (not part of the repo): syntax check with esbuild, unused/undefined names with `tsc --checkJs --noUnusedLocals`,
and a server-side render of every demo ticket and note in both languages compared before and after a change.
A stub for `../utils` was needed for that. Rebuilding such a harness is a good first step before changing logic again.

Known limits:
- Never run inside the real host app. The server-render check covers collapsed cards and the note modal only. Open cards, the activity log, StorageModal and the ticket modal were checked by compile and type checks, not by rendering.
- The confirmation dialogs and the Escape / click-outside behaviour were not exercised in a browser.
- No automated tests and no `package.json` are in this folder.
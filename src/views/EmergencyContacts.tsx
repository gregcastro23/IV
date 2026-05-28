// The "reach a person" card — user-editable contacts (stored in the encrypted
// vault) with working tel:/sms: links. Seeded with starter roles; the user
// fills in their own numbers.
import { useState } from "react";
import { useLedger } from "../store/LedgerContext.tsx";
import { useOverlay } from "../lib/useOverlay.ts";
import { I } from "../components/Icons.tsx";
import type { Contact } from "../types.ts";

function initialsOf(name: string): string {
  const n = name.trim();
  if (!n) return "—";
  if (n.length <= 4) return n.toUpperCase();
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

interface DraftContact {
  label: string;
  name: string;
  phone: string;
  note: string;
}
const EMPTY_DRAFT: DraftContact = { label: "", name: "", phone: "", note: "" };

type Dialog = { mode: "add" } | { mode: "edit"; id: string; initial: DraftContact } | null;

export function EmergencyContacts() {
  const { contacts, addContact, updateContact, removeContact } = useLedger();
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);

  return (
    <div className="lg:col-span-5 border border-zinc-900 rounded-md bg-zinc-950 flex flex-col">
      <div className="px-5 pt-4 pb-3 border-b border-zinc-900 flex items-center justify-between">
        <div>
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
            Reach a person
          </div>
          <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-0.5">
            Before the page
          </div>
        </div>
        <button
          onClick={() => setEditing((e) => !e)}
          className="mono text-[9.5px] tracking-widest-2 uppercase text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 rounded-md px-2.5 py-1.5"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="divide-y divide-zinc-900">
        {contacts.map((c) => {
          const tel = c.phone.replace(/[^\d+]/g, "");
          return (
            <div key={c.id} className="px-5 py-3.5 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-sm border border-zinc-800 grid place-items-center mono text-[10px] text-zinc-300 bg-zinc-900/50 shrink-0">
                {initialsOf(c.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
                  {c.label || "Contact"}
                </div>
                <div className="text-[12.5px] text-zinc-200 mt-0.5 truncate">{c.note || c.name}</div>
                <div className="mono text-[10px] text-zinc-600 mt-0.5">
                  {c.phone || "no number yet"}
                </div>
              </div>
              {editing ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() =>
                      setDialog({
                        mode: "edit",
                        id: c.id,
                        initial: { label: c.label, name: c.name, phone: c.phone, note: c.note },
                      })
                    }
                    className="mono text-[9.5px] tracking-widest-2 uppercase text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 rounded-md px-2 py-1.5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeContact(c.id)}
                    aria-label={`Remove ${c.label || c.name}`}
                    className="w-8 h-8 rounded-md border border-zinc-800 hover:border-red-900/60 text-zinc-500 hover:text-red-400 grid place-items-center"
                  >
                    <I.Trash size={13} />
                  </button>
                </div>
              ) : tel ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`tel:${tel}`}
                    aria-label={`Call ${c.label || c.name}`}
                    className="w-8 h-8 rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 grid place-items-center"
                  >
                    <I.Phone size={13} />
                  </a>
                  <a
                    href={`sms:${tel}`}
                    aria-label={`Text ${c.label || c.name}`}
                    className="w-8 h-8 rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 grid place-items-center"
                  >
                    <I.Message size={13} />
                  </a>
                </div>
              ) : (
                <span className="mono text-[9px] tracking-widest-2 uppercase text-zinc-700 shrink-0">
                  add a #
                </span>
              )}
            </div>
          );
        })}
        {contacts.length === 0 && (
          <div className="px-5 py-6 text-center text-[11.5px] text-zinc-600">
            No contacts yet. Add the people you'd call.
          </div>
        )}
      </div>

      {editing && (
        <button
          onClick={() => setDialog({ mode: "add" })}
          className="m-3 h-9 rounded-md border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 mono text-[10px] tracking-widest-2 uppercase flex items-center justify-center gap-1.5"
        >
          <I.Plus size={12} /> Add contact
        </button>
      )}

      {dialog && (
        <ContactDialog
          title={dialog.mode === "add" ? "New contact" : "Edit contact"}
          initial={dialog.mode === "add" ? EMPTY_DRAFT : dialog.initial}
          onClose={() => setDialog(null)}
          onSave={(c) => {
            if (dialog.mode === "add") addContact(c);
            else updateContact(dialog.id, c);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}

function ContactDialog({
  title,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  initial: DraftContact;
  onClose: () => void;
  onSave: (c: Omit<Contact, "id">) => void;
}) {
  const [draft, setDraft] = useState<DraftContact>(initial);
  const overlayRef = useOverlay<HTMLDivElement>(onClose);

  const save = () => {
    const clean = {
      label: draft.label.trim(),
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      note: draft.note.trim(),
    };
    if (!clean.label && !clean.name) return;
    onSave(clean);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm grid place-items-center z-40 p-6 anim-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={overlayRef}
        tabIndex={-1}
        className="bg-zinc-950 border border-zinc-800 rounded-md max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">Contact</div>
            <div className="mono text-base tracking-widest-2 uppercase text-zinc-100 mt-1">{title}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-zinc-200">
            <I.X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Role" value={draft.label} placeholder="e.g. Sponsor" onChange={(v) => setDraft({ ...draft, label: v })} />
          <Field label="Name or initials" value={draft.name} placeholder="e.g. T.K." onChange={(v) => setDraft({ ...draft, name: v })} />
          <Field label="Phone" value={draft.phone} placeholder="e.g. 988" type="tel" onChange={(v) => setDraft({ ...draft, phone: v })} />
          <Field label="Note" value={draft.note} placeholder="e.g. Reach out anytime." onChange={(v) => setDraft({ ...draft, note: v })} />
        </div>

        <div className="flex justify-between items-center mt-5">
          <span className="mono text-[10px] text-zinc-600">encrypted on this device</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="mono text-[10px] tracking-widest-2 uppercase text-zinc-400 hover:text-zinc-100 px-3 py-2"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!draft.label.trim() && !draft.name.trim()}
              className="mono text-[10px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-2 rounded-sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-600"
      />
    </div>
  );
}

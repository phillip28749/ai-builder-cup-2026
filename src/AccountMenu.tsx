import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Settings, LogOut, ChevronDown } from "lucide-react";
export default function AccountMenu({
  initial,
  name,
  email,
  onSignOut,
}: {
  initial: string;
  name: string;
  email?: string;
  onSignOut?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const click = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="account-menu" ref={root}>
      <button
        className="account-menu-trigger"
        aria-label="Account settings"
        aria-expanded={open}
        aria-controls="account-settings-panel"
        ref={trigger}
        onClick={() => setOpen(!open)}
      >
        <span className="avatar small">{initial}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div id="account-settings-panel" className="account-menu-panel">
          <div className="account-menu-identity">
            <strong>{name}</strong>
            {email && <small>{email}</small>}
          </div>
          <nav aria-label="Account settings">
            <Link to="/settings" onClick={() => setOpen(false)}>
              <Settings size={16} /> Store settings
            </Link>
            <Link to="/usage" onClick={() => setOpen(false)}>
              AI usage & balance
            </Link>
            {onSignOut && (
              <button
                onClick={async () => {
                  setOpen(false);
                  await onSignOut();
                }}
              >
                <LogOut size={16} /> Sign out
              </button>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}

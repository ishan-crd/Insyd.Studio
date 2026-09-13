import React, { useEffect } from "react";
import { create } from "zustand";

export type MenuItem = { label: string; icon?: React.ReactNode; kbd?: string; onClick?: () => void; disabled?: boolean; danger?: boolean; sep?: boolean; checked?: boolean };
type MenuState = { open: { x: number; y: number; items: MenuItem[] } | null; show: (x: number, y: number, items: MenuItem[]) => void; hide: () => void };
export const useMenu = create<MenuState>((set) => ({ open: null, show: (x, y, items) => set({ open: { x, y, items } }), hide: () => set({ open: null }) }));

export const openMenu = (e: { clientX: number; clientY: number; preventDefault: () => void; stopPropagation: () => void }, items: MenuItem[]) => {
  e.preventDefault(); e.stopPropagation();
  useMenu.getState().show(e.clientX, e.clientY, items);
};

export const ContextMenuHost: React.FC = () => {
  const open = useMenu((s) => s.open);
  const hide = useMenu((s) => s.hide);
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => { if (!(e.target as HTMLElement).closest?.(".ctx")) hide(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    window.addEventListener("pointerdown", off, true); window.addEventListener("keydown", key, true); window.addEventListener("blur", hide);
    return () => { window.removeEventListener("pointerdown", off, true); window.removeEventListener("keydown", key, true); window.removeEventListener("blur", hide); };
  }, [open, hide]);
  if (!open) return null;
  const w = 232, h = open.items.length * 28 + 12;
  const x = Math.min(open.x, window.innerWidth - w - 8), y = Math.min(open.y, window.innerHeight - h - 8);
  return (
    <div className="ctx" style={{ left: x, top: y, width: w }} onContextMenu={(e) => e.preventDefault()}>
      {open.items.map((it, i) => it.sep ? <div key={i} className="ctx-sep" /> : (
        <button key={i} className={`ctx-item ${it.danger ? "danger" : ""}`} disabled={it.disabled} onClick={() => { hide(); it.onClick?.(); }}>
          <span className="ctx-ico">{it.checked ? "✓" : it.icon}</span><span className="ctx-label">{it.label}</span>{it.kbd && <span className="kbd">{it.kbd}</span>}
        </button>
      ))}
    </div>
  );
};

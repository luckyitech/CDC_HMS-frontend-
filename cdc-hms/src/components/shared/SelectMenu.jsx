import { Children, isValidElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { POPOVER_Z } from '../../constants/layers';

/**
 * SelectMenu — THE dropdown for filters, sorts and view pickers above a list
 * (Emu, 11 Oct 2026: the browser's own list opened tiny and away from the box).
 * Its list always opens directly BELOW the box, at least as wide as it, with
 * finger-sized rows. Form fields keep the native <select> (the phone's own
 * picker is better for data entry). Rules: docs/DRY-GUIDELINES.md §4b″.
 *
 * A drop-in for <select>: keep the same value, onChange, className and
 * <option> children (maps included). onChange receives { target: { value } }
 * with the value as a string, exactly like a native select, so handlers such
 * as `(e) => setX(e.target.value)` need no change. Or pass
 * `options=[{ value, label, disabled }]` instead of children.
 *
 * The list is portalled to <body> on POPOVER_Z (above dialogs), so no card or
 * dialog can clip it. It closes on a choice, a tap outside, Escape or scroll.
 */
const textOf = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf(node.props.children);
  return '';
};

const optionsFrom = (children) => Children.toArray(children).flatMap((c) => {
  if (!isValidElement(c)) return [];
  if (c.type === 'option') {
    const label = textOf(c.props.children);
    return [{ value: String(c.props.value ?? label), label, disabled: !!c.props.disabled }];
  }
  if (c.type === 'optgroup') return optionsFrom(c.props.children);
  return [];
});

const SelectMenu = ({ value, onChange, options, children, className = '', disabled = false, id, title, ...rest }) => {
  const list = options
    ? options.map((o) => ({ value: String(o.value), label: o.label, disabled: !!o.disabled }))
    : optionsFrom(children);
  const current = list.find((o) => o.value === String(value ?? '')) || list[0];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const [hi, setHi] = useState(-1); // keyboard highlight
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const quiet = useRef(false); // ignore the scroll we cause ourselves

  // Open below the box. If there's too little room under it (a box near the
  // bottom of the screen), first scroll the box up to the middle of the screen.
  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r && window.innerHeight - r.bottom < 240) {
      quiet.current = true;
      setTimeout(() => { quiet.current = false; }, 400);
      btnRef.current.scrollIntoView({ block: 'center' });
    }
    setHi(-1);
    setOpen(true);
  };

  const close = useCallback(() => setOpen(false), []);

  // Place the list under the box; it never covers the box or what is above it.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, minWidth: r.width, maxHeight: Math.max(120, window.innerHeight - r.bottom - 12) });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      close();
    };
    const onScroll = (e) => { if (!quiet.current && !menuRef.current?.contains(e.target)) close(); };
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  const choose = (o) => {
    if (o.disabled) return;
    close();
    btnRef.current?.focus();
    if (o.value !== current?.value) onChange?.({ target: { value: o.value } });
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault(); openMenu(); setHi(Math.max(0, list.indexOf(current))); return;
    }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      let i = hi;
      for (let n = 0; n < list.length; n += 1) { i = (i + step + list.length) % list.length; if (!list[i].disabled) break; }
      setHi(i);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); if (list[hi]) choose(list[hi]);
    } else if (e.key === 'Tab') close();
  };

  return (
    <>
      <button
        {...rest}
        ref={btnRef}
        id={id}
        type="button"
        title={title}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        className={`ui-select ${className}`}
      >
        {/* Every label sits in the same grid cell, hidden but the current one,
            so the box is as wide as its longest option (like a native select)
            and doesn't jump when the choice changes. */}
        <span className="grid min-w-0 flex-1">
          {list.map((o, i) => (
            <span key={`${o.value}-${i}`} aria-hidden="true" className="invisible col-start-1 row-start-1 truncate">{o.label}</span>
          ))}
          <span className="col-start-1 row-start-1 truncate">{current?.label ?? ''}</span>
        </span>
        <ChevronDown className={`h-4 w-4 flex-none text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={rest['aria-label']}
          className="fixed overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          style={{ zIndex: POPOVER_Z, top: pos.top, left: pos.left, minWidth: pos.minWidth, maxWidth: 'calc(100vw - 16px)', maxHeight: pos.maxHeight }}
        >
          {list.map((o, i) => {
            const on = o.value === current?.value;
            return (
              <button
                key={`${o.value}-${i}`}
                type="button"
                role="option"
                aria-selected={on}
                disabled={o.disabled}
                onClick={() => choose(o)}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
                  on ? 'font-semibold text-primary' : 'text-gray-700'} ${i === hi ? 'bg-blue-50' : 'ui-hover'}`}
              >
                <span className="flex-1">{o.label}</span>
                {on && <Check className="h-4 w-4 flex-none" aria-hidden="true" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
};

export default SelectMenu;

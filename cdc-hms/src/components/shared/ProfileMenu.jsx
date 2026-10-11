import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, UserRound, Bell, BedDouble, LogOut } from 'lucide-react';
import { useNotificationContext } from '../../contexts/NotificationContext';
import StaffAvatar from '../hr/profile/StaffAvatar';
import NotificationPanel from './NotificationPanel';

const initialsOf = (name, fallback) =>
  (name ? name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') : String(fallback || '?')[0]).toUpperCase();

/**
 * ProfileMenu — the signed-in person's round avatar with a chevron, top right
 * (11 Oct 2026). Replaces the profile row + icon strip that sat in the sidebar
 * footer. The chevron opens: My profile · Notifications · (Switch workspace) ·
 * Sign out. Unread notifications show as a red count on the avatar, so they
 * are visible without opening the menu.
 *
 * Where it renders (MainLayout decides):
 *   desktop  — on each portal's home page only (dashboard / ward board), in the
 *              top-right of the first row, so it costs no extra height;
 *   phones   — in the slim top bar on every page (that bar already exists).
 *
 * props:
 *   userRole         the portal label ("Doctor", "Staff", …)
 *   name             display name
 *   showPhoto        true → StaffAvatar (own photo, else initials); false → initials only
 *   onMyProfile      () => void, or null to hide "My profile"
 *   workspaceSwitch  { label, onClick } or null
 *   onSignOut        () => void
 *   size             'md' (page) | 'sm' (phone bar)
 */
const ProfileMenu = ({ userRole, name, showPhoto, onMyProfile, workspaceSwitch, onSignOut, size = 'md' }) => {
  const { unreadCount } = useNotificationContext();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const rootRef = useRef(null);

  const closeNotes = useCallback(() => setNotesOpen(false), []);

  // Close on navigation, on a click anywhere outside, and on Escape.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm';
  const avatarCls = `${dim} rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-bold shadow-sm`;
  const avatar = (cls) => (showPhoto
    ? <StaffAvatar self name={name} className={cls} />
    : <div className={`${cls} flex items-center justify-center flex-shrink-0`} aria-hidden="true">{initialsOf(name, userRole)}</div>);

  const pick = (fn) => () => { setOpen(false); fn(); };

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Profile menu — ${unreadCount} unread notifications` : 'Profile menu'}
        title={name}
        className={`flex items-center gap-1 rounded-full p-0.5 pr-1.5 transition-colors ${open ? 'bg-gray-200/70' : 'hover:bg-gray-200/60'}`}
      >
        <span className="relative">
          {avatar(avatarCls)}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] leading-none font-bold rounded-full ring-2 ring-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* The drop-down is a sidebar island (sidebar.css): same glass, pills, hover and icons. */}
      {open && (
        <div className="sb-white absolute right-0 top-full mt-2 w-64 z-50">
          <div role="menu" className="sb-island sb-drop p-2">
            <div className="flex items-center gap-3 px-2 pt-1 pb-2">
              {avatar('w-10 h-10 text-sm rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-bold')}
              <div className="min-w-0">
                <p className="font-semibold text-sm sb-strong truncate">{name}</p>
                <p className="text-xs sb-muted">{userRole} Portal</p>
              </div>
            </div>
            <div className="sb-divider" />
            {onMyProfile && (
              <button type="button" role="menuitem" onClick={pick(onMyProfile)} className="sb-menu-item">
                <UserRound className="w-[18px] h-[18px] sb-icon" /> My profile
              </button>
            )}
            <button type="button" role="menuitem" onClick={pick(() => setNotesOpen(true))} className="sb-menu-item">
              <Bell className="w-[18px] h-[18px] sb-icon" />
              <span className="flex-1">Notifications</span>
              {unreadCount > 0 && (
                <span className="min-w-[1.35rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {workspaceSwitch && (
              <button type="button" role="menuitem" onClick={pick(workspaceSwitch.onClick)} className="sb-menu-item">
                <BedDouble className="w-[18px] h-[18px] sb-icon" /> {workspaceSwitch.label}
              </button>
            )}
            <div className="sb-divider" />
            <button type="button" role="menuitem" onClick={pick(onSignOut)} className="sb-menu-item !text-red-600 hover:!bg-red-50">
              <LogOut className="w-[18px] h-[18px]" /> Sign out
            </button>
          </div>
        </div>
      )}

      {notesOpen && <NotificationPanel userRole={userRole} onClose={closeNotes} />}
    </div>
  );
};

export default ProfileMenu;

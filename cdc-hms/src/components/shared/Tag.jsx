// Tag — the rounded pill used on the Communications tab day cards (WhatsApp 2,
// Email 1, Attachments …) and, since 27 Sep evening, on the Visit History day
// cards (Rx, Lab, Ref, Adm). One component so both screens look alike (DRY).
// With `onClick` it becomes a button (e.g. tap "Rx" to open the prescription)
// and stops the click reaching the card behind it.
const base = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold';

const Tag = ({ className = '', Icon, children, onClick, title }) => {
  const inner = <>{Icon && <Icon size={11} aria-hidden="true" />}{children}</>;
  if (!onClick) return <span className={`${base} ${className}`} title={title}>{inner}</span>;
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      onKeyDown={(e) => e.stopPropagation()}
      className={`${base} ${className} hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
    >
      {inner}
    </button>
  );
};

export default Tag;

// Card — THE box on a page (11 Oct 2026 design audit). Flat: white, hairline
// border, 12 px corners, no shadow (ui.css .ui-surface). Its title is smaller
// than the page title. `actions` sit at the right of the title row.
// Only things that float above the page (Modal, menus, the sidebar) are raised.
// Rules: docs/DRY-GUIDELINES.md.
const Card = ({ children, title, actions, className = '' }) => {
  return (
    <div className={`ui-surface p-4 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {title && <h3 className="ui-box-title flex-1 min-w-0">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;

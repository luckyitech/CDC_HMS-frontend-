// Icon + text heading for Card titles — pass a lucide icon component.
const CardTitle = ({ icon, children }) => {
  const Icon = icon;
  return (
    <span className="flex items-center gap-2">
      <Icon className="w-5 h-5" />
      {children}
    </span>
  );
};

export default CardTitle;

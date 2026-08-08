const TABS = [
  { id: "today", label: "Today" },
  { id: "browse", label: "Browse" },
  { id: "stats", label: "Stats" },
  { id: "account", label: "Account" },
];

export default function TabBar({ active, onChange }) {
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn${active === tab.id ? " active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
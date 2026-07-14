interface SalesSquadLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function SalesSquadLogo({ size = 36, showText = true, className = "" }: SalesSquadLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Triangle network icon: 3 person nodes connected */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Connecting lines */}
        <line x1="20" y1="7" x2="7" y2="30" stroke="#10b981" strokeWidth="1.8" strokeOpacity="0.6" />
        <line x1="20" y1="7" x2="33" y2="30" stroke="#10b981" strokeWidth="1.8" strokeOpacity="0.6" />
        <line x1="7" y1="30" x2="33" y2="30" stroke="#10b981" strokeWidth="1.8" strokeOpacity="0.6" />

        {/* Top node (person) */}
        <circle cx="20" cy="5" r="3.5" fill="#10b981" />
        <path d="M15.5 13.5 Q20 11 24.5 13.5" stroke="#10b981" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Bottom-left node (person) */}
        <circle cx="7" cy="31" r="3.5" fill="#10b981" />
        <path d="M2.5 39.5 Q7 37 11.5 39.5" stroke="#10b981" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Bottom-right node (person) */}
        <circle cx="33" cy="31" r="3.5" fill="#10b981" />
        <path d="M28.5 39.5 Q33 37 37.5 39.5" stroke="#10b981" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Glow effect on nodes */}
        <circle cx="20" cy="5" r="5" fill="#10b981" fillOpacity="0.15" />
        <circle cx="7" cy="31" r="5" fill="#10b981" fillOpacity="0.15" />
        <circle cx="33" cy="31" r="5" fill="#10b981" fillOpacity="0.15" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-white tracking-wide" style={{ fontSize: size * 0.42 }}>
            Sales Squad
          </span>
          <span className="text-[#10b981] font-medium" style={{ fontSize: size * 0.25 }}>
            Premium Leads
          </span>
        </div>
      )}
    </div>
  );
}

export function SalesSquadIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <line x1="20" y1="7" x2="7" y2="30" stroke="#10b981" strokeWidth="1.8" strokeOpacity="0.6" />
      <line x1="20" y1="7" x2="33" y2="30" stroke="#10b981" strokeWidth="1.8" strokeOpacity="0.6" />
      <line x1="7" y1="30" x2="33" y2="30" stroke="#10b981" strokeWidth="1.8" strokeOpacity="0.6" />
      <circle cx="20" cy="5" r="3.5" fill="#10b981" />
      <path d="M15.5 13.5 Q20 11 24.5 13.5" stroke="#10b981" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="7" cy="31" r="3.5" fill="#10b981" />
      <path d="M2.5 39.5 Q7 37 11.5 39.5" stroke="#10b981" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="33" cy="31" r="3.5" fill="#10b981" />
      <path d="M28.5 39.5 Q33 37 37.5 39.5" stroke="#10b981" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="20" cy="5" r="5" fill="#10b981" fillOpacity="0.15" />
      <circle cx="7" cy="31" r="5" fill="#10b981" fillOpacity="0.15" />
      <circle cx="33" cy="31" r="5" fill="#10b981" fillOpacity="0.15" />
    </svg>
  );
}

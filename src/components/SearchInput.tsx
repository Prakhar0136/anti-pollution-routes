"use client";

interface SearchInputProps {
  label: string;
  placeholder: string;
  query: string;
  suggestions: any[];
  onChange: (value: string) => void;
  onSelect: (feature: any) => void;
  onUseLocation?: () => void;
}

export default function SearchInput({ label, placeholder, query, suggestions, onChange, onSelect, onUseLocation }: SearchInputProps) {
  return (
    <div className="relative w-full">
      <style>{`
        .search-input-dark {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255,255,255,0.07);
          color: #e2e8f0;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          transition: all 0.2s ease;
          width: 100%;
          padding: 10px 14px;
          border-radius: 12px;
          outline: none;
        }
        .search-input-dark::placeholder { color: #475569; }
        .search-input-dark:focus {
          background: rgba(15, 23, 42, 0.95);
          border-color: rgba(99, 102, 241, 0.45);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
        }
        .loc-btn {
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 12px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6366f1;
          transition: all 0.2s ease;
          flex-shrink: 0;
          cursor: pointer;
        }
        .loc-btn:hover {
          background: rgba(99,102,241,0.22);
          border-color: rgba(99,102,241,0.4);
        }
        .suggestions-list {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: rgba(10, 15, 30, 0.97);
          border: 1px solid rgba(99,102,241,0.18);
          border-radius: 14px;
          overflow: hidden;
          z-index: 9999;
          box-shadow: 0 16px 40px rgba(0,0,0,0.6);
          backdrop-filter: blur(20px);
        }
        .suggestion-item {
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.15s ease;
        }
        .suggestion-item:last-child { border-bottom: none; }
        .suggestion-item:hover { background: rgba(99,102,241,0.1); }
      `}</style>

      {/* ↓ Changed color from #475569 to #94a3b8 for better visibility */}
      <label style={{
        display: 'block',
        fontSize: 10,
        fontWeight: 600,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 6,
        fontFamily: "'DM Sans', sans-serif"
      }}>{label}</label>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => onChange(e.target.value)}
            className="search-input-dark"
          />
        </div>
        {onUseLocation && (
          <button onClick={onUseLocation} title="Use current location" className="loc-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <ul className="suggestions-list">
          {suggestions.map((s, i) => (
            <li key={i} onClick={() => onSelect(s)} className="suggestion-item">
              <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0', display: 'block', fontFamily: "'DM Sans', sans-serif" }}>
                {s.properties.name}
              </span>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 1, fontFamily: "'DM Sans', sans-serif" }}>
                {[s.properties.city, s.properties.state].filter(Boolean).join(', ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

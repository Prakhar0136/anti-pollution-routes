"use client";

interface SavedRoutesListProps {
  routes: any[];
  onLoadRoute: (route: any) => void;
  onDeleteRoute: (e: React.MouseEvent, id: number) => void;
}

export default function SavedRoutesList({ routes, onLoadRoute, onDeleteRoute }: SavedRoutesListProps) {
  if (routes.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '32px 16px',
        fontFamily: "'DM Sans', sans-serif"
      }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
          fontSize: 20
        }}>⊞</div>
        <p style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500, marginBottom: 4 }}>No saved routes</p>
        <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>Plan a route and save it to quickly access it later.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: "'DM Sans', sans-serif" }}>
      <p style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>
        {routes.length} saved {routes.length === 1 ? 'route' : 'routes'}
      </p>
      {routes.map((route) => {
        let startInfo: any = {}, endInfo: any = {};
        try { startInfo = JSON.parse(route.start_point); } catch {}
        try { endInfo = JSON.parse(route.end_point); } catch {}

        return (
          <div key={route.id} onClick={() => onLoadRoute(route)}
            style={{
              background: 'rgba(51, 65, 85, 0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: '12px 14px',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
            className="saved-route-card"
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(51,65,85,0.85)';
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(30,41,59,0.5)';
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
            }}
          >
            <button
              onClick={(e) => onDeleteRoute(e, route.id)}
              title="Delete"
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                opacity: 0,
                transition: 'opacity 0.15s ease',
                cursor: 'pointer',
              }}
              className="delete-btn"
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <p style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 8, paddingRight: 28 }}
              className="truncate">{route.route_name}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#6366f1', flexShrink: 0
                }}></div>
                <span style={{ fontSize: 12.5, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {startInfo.address || "Start"}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ paddingLeft: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                  <div style={{ width: 1, height: 8, background: 'rgba(99,102,241,0.3)' }}></div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#10b981', flexShrink: 0
                }}></div>
                <span style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {endInfo.address || "Destination"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      <style>{`
        .saved-route-card:hover .delete-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}

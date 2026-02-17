import { C } from '../analysis';

export default function Heatmap({ functions }) {
  const sorted = [...functions].sort((a, b) => b.cyclomatic_complexity - a.cyclomatic_complexity);
  const max = Math.max(...sorted.map(f => f.cyclomatic_complexity), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
      {sorted.map(f => {
        const norm = f.cyclomatic_complexity / max;
        const pct  = Math.round(norm * 100);
        const col  = norm < 0.33 ? C.mint : norm < 0.66 ? C.gold : C.coral;
        const bg   = norm < 0.33
          ? `rgba(79,255,176,${0.06 + norm * 0.3})`
          : norm < 0.66
            ? `rgba(255,209,102,${0.06 + norm * 0.22})`
            : `rgba(255,107,107,${0.06 + norm * 0.22})`;

        return (
          <div
            key={f.name}
            title={`${f.name} — CC:${f.cyclomatic_complexity} | Time:${f.time_complexity} | Space:${f.space_complexity}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '130px 1fr 40px',
              alignItems: 'center',
              gap: 10,
              padding: '7px 10px',
              borderRadius: 7,
              background: bg,
              cursor: 'default',
              transition: 'filter .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
            onMouseLeave={e => e.currentTarget.style.filter = ''}
          >
            <span style={{
              fontSize: '.73rem', fontWeight: 600, color: col,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {f.name}
            </span>
            <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3, background: col,
                width: `${pct}%`, transition: 'width .7s cubic-bezier(.34,1.56,.64,1)',
              }} />
            </div>
            <span style={{
              fontFamily: 'var(--sans)', fontWeight: 800, fontSize: '.85rem',
              textAlign: 'right', color: col,
            }}>
              {f.cyclomatic_complexity}
            </span>
          </div>
        );
      })}
    </div>
  );
}

import { miColor } from '../analysis';

export default function MIGauge({ data }) {
  const mi  = data.maintainability_index;
  const col = miColor(mi);
  const circumference = 339;
  const offset = circumference - (mi / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingTop: 4 }}>
      <div style={{ position: 'relative', width: 136, height: 136 }}>
        <svg width="136" height="136" viewBox="0 0 136 136" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="68" cy="68" r="54" fill="none" stroke="#1d2236" strokeWidth="11" />
          <circle
            cx="68" cy="68" r="54" fill="none"
            stroke={col} strokeWidth="11" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.34,1.2,.64,1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: '2.1rem', lineHeight: 1, color: col }}>
            {mi}
          </div>
          <div style={{ fontSize: '.6rem', color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 3 }}>
            {data.mi_label}
          </div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        {[
          ['Lines of Code',  data.loc.code],
          ['Cyclomatic CC',  data.total_cyclomatic_complexity],
          ['Halstead Vol.',  data.halstead.volume],
          ['Difficulty',     data.halstead.difficulty],
          ['Est. Bugs',      data.halstead.bugs],
        ].map(([label, val], i, arr) => (
          <tr key={label}>
            <td style={{
              padding: '5px 0', fontSize: '.7rem',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              color: 'var(--muted)',
            }}>
              {label}
            </td>
            <td style={{
              padding: '5px 0', fontSize: '.7rem',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              textAlign: 'right', fontWeight: 600,
            }}>
              {val}
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}

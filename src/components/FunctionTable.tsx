import { bigoColor, miColor, C } from '../analysis';

function Badge({ value, color }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 5,
      fontSize: '.65rem',
      fontWeight: 700,
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
    }}>
      {value}
    </span>
  );
}

export default function FunctionTable({ functions }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.72rem' }}>
        <thead>
          <tr>
            {['Function', 'Line', 'Time', 'Space', 'CC', 'MI', 'LOC', 'Est. Bugs'].map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '8px 12px',
                fontSize: '.6rem', letterSpacing: '.1em', textTransform: 'uppercase',
                color: 'var(--muted)', borderBottom: '1px solid var(--border)',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {functions.map((f, i) => {
            const ccCol = f.cyclomatic_complexity <= 5 ? C.mint : f.cyclomatic_complexity <= 10 ? C.gold : C.coral;
            return (
              <tr
                key={f.name + i}
                style={{ borderBottom: '1px solid rgba(29,34,54,.6)' }}
                onMouseEnter={e => { for (const td of e.currentTarget.cells) td.style.background = 'rgba(255,255,255,.02)'; }}
                onMouseLeave={e => { for (const td of e.currentTarget.cells) td.style.background = ''; }}
              >
                <td style={{ padding: '9px 12px', fontWeight: 600 }}>{f.name}</td>
                <td style={{ padding: '9px 12px', color: 'var(--muted)' }}>{f.line}</td>
                <td style={{ padding: '9px 12px' }}><Badge value={f.time_complexity}  color={bigoColor(f.time_complexity)} /></td>
                <td style={{ padding: '9px 12px' }}><Badge value={f.space_complexity} color={bigoColor(f.space_complexity)} /></td>
                <td style={{ padding: '9px 12px' }}><Badge value={f.cyclomatic_complexity} color={ccCol} /></td>
                <td style={{ padding: '9px 12px' }}><Badge value={f.maintainability_index} color={miColor(f.maintainability_index)} /></td>
                <td style={{ padding: '9px 12px' }}>{f.loc.code}</td>
                <td style={{ padding: '9px 12px' }}>{f.halstead.bugs}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

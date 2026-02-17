import { useState, useEffect, useCallback,useRef } from 'react';
import { analyzeSource, simulateCurves, miColor, SAMPLE_CODE } from './analysis';
import RuntimeChart from './components/RuntimeChart';
import BigOChart    from './components/BigOChart';
import MemoryChart  from './components/MemoryChart';
import CCChart      from './components/CCChart';
import Heatmap      from './components/Heatmap';
import MIGauge      from './components/MIGauge';
import FunctionTable from './components/FunctionTable';
import Toast        from './components/Toast';

// ── Shared style helpers ────────────────────────────────────────────
const S = {
  wrap: {
    position: 'relative', zIndex: 1,
    maxWidth: 1360, margin: '0 auto', padding: '0 24px 80px',
  },
  card: {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 14, padding: 22,
    animation: 'fadeUp .4s ease both',
  },
  cardHead: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 18, gap: 10,
  },
  cardTitle: { fontFamily: 'var(--sans)', fontWeight: 700, fontSize: '.9rem', color: 'var(--text)' },
  cardSub:   { fontSize: '.65rem', color: 'var(--muted)', marginTop: 3, letterSpacing: '.03em' },
  cw: (h = 280) => ({ position: 'relative', width: '100%', height: h }),
};

function Tag({ label, variant = 'mint' }) {
  const vars = {
    mint:   { bg: 'rgba(79,255,176,.1)',  col: '#4fffb0', bd: 'rgba(79,255,176,.2)'  },
    indigo: { bg: 'rgba(123,94,167,.15)', col: '#c4b5fd', bd: 'rgba(123,94,167,.25)' },
    coral:  { bg: 'rgba(255,107,107,.1)', col: '#ff6b6b', bd: 'rgba(255,107,107,.2)' },
    gold:   { bg: 'rgba(255,209,102,.1)', col: '#ffd166', bd: 'rgba(255,209,102,.2)' },
  };
  const v = vars[variant];
  return (
    <span style={{
      display: 'inline-block', padding: '3px 9px', borderRadius: 20,
      fontSize: '.6rem', fontWeight: 700, letterSpacing: '.08em', whiteSpace: 'nowrap',
      background: v.bg, color: v.col, border: `1px solid ${v.bd}`,
    }}>
      {label}
    </span>
  );
}

function CardHead({ title, sub, tag, variant }) {
  return (
    <div style={S.cardHead}>
      <div>
        <div style={S.cardTitle}>{title}</div>
        {sub && <div style={S.cardSub}>{sub}</div>}
      </div>
      {tag && <Tag label={tag} variant={variant} />}
    </div>
  );
}

// ── KPI ─────────────────────────────────────────────────────────────
function KpiRow({ data }) {
  const avgCC = data.functions.length
    ? (data.total_cyclomatic_complexity / data.functions.length).toFixed(1)
    : '—';

  const kpis = [
    { l: 'Functions',     v: data.functions.length,                   s: 'detected',                      c: '#4fffb0' },
    { l: 'Avg CC / func', v: avgCC,                                   s: 'cyclomatic',                    c: '#7b5ea7' },
    { l: 'Lines of Code', v: data.loc.code,                           s: `${data.loc.total} total`,        c: '#06d6a0' },
    { l: 'Halstead Vol',  v: Math.round(data.halstead.volume),        s: 'effort proxy',                  c: '#ffd166' },
    { l: 'Maintain. Idx', v: data.maintainability_index,              s: data.mi_label,                   c: miColor(data.maintainability_index) },
    { l: 'Est. Bugs',     v: data.halstead.bugs,                      s: 'Halstead estimate',             c: '#ff6b6b' },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 14, marginBottom: 28,
    }}>
      {kpis.map(k => (
        <div key={k.l} style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '18px 18px 14px', position: 'relative', overflow: 'hidden',
          transition: 'transform .2s',
        }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = ''}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.c,
          }} />
          <div style={{ fontSize: '.6rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
            {k.l}
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: '1.8rem', lineHeight: 1, color: k.c }}>
            {k.v}
          </div>
          <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 5 }}>{k.s}</div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────
function EmptyState({ icon, text }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: 200, gap: 10,
      color: 'var(--muted)', fontSize: '.72rem', letterSpacing: '.05em',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 9, background: 'rgba(255,255,255,.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, opacity: .5,
      }}>
        {icon}
      </div>
      <span>{text}</span>
    </div>
  );
}

// ── Grid card ────────────────────────────────────────────────────────
function GridCard({ span, children, style }) {
  return (
    <div style={{
      ...S.card,
      gridColumn: `span ${span}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Charts grid ──────────────────────────────────────────────────────
function ChartsGrid({ data, curves }) {
  if (!data.functions.length) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 18 }}>
        <GridCard span={12}><EmptyState icon="🔍" text="No def statements found" /></GridCard>
      </div>
    );
  }

  // Responsive: stack all on narrow screens via CSS media approach via inline check
  const isNarrow = typeof window !== 'undefined' && window.innerWidth <= 860;
  const s = (wide, narrow = 12) => isNarrow ? narrow : wide;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 18 }}>
      {/* Runtime */}
      <GridCard span={8}>
        <CardHead title="Time Complexity Plot" sub="Input size → runtime (ms) · curves match your Big-O class" tag="BENCHMARK" />
        <div style={S.cw(280)}><RuntimeChart curves={curves} /></div>
      </GridCard>

      {/* Big-O */}
      <GridCard span={4}>
        <CardHead title="Big-O Distribution" sub="Static classification per function" tag="O(n)" variant="indigo" />
        <div style={S.cw(210)}><BigOChart dist={data.big_o_distribution} /></div>
      </GridCard>

      {/* Memory */}
      <GridCard span={6}>
        <CardHead title="Space Usage Plot" sub="Input size → memory (KB) · matches space complexity" tag="MEMORY" variant="coral" />
        <div style={S.cw(240)}><MemoryChart curves={curves} /></div>
      </GridCard>

      {/* CC */}
      <GridCard span={6}>
        <CardHead title="Cyclomatic Complexity" sub="McCabe score per function · risk indicator" tag="RISK" variant="gold" />
        <div style={S.cw(240)}><CCChart functions={data.functions} /></div>
      </GridCard>

      {/* Heatmap */}
      <GridCard span={8}>
        <CardHead title="Complexity Heatmap" sub="Visual severity · cyclomatic complexity score" tag="HEATMAP" />
        <Heatmap functions={data.functions} />
      </GridCard>

      {/* MI Gauge */}
      <GridCard span={4}>
        <CardHead title="Maintainability Index" sub="LOC · CC · Halstead → composite 0–100" tag="MI" variant="indigo" />
        <MIGauge data={data} />
      </GridCard>

      {/* Function Table */}
      <GridCard span={12}>
        <CardHead title="Function Summary" sub="All detected functions with full metric breakdown" tag="TABLE" />
        <FunctionTable functions={data.functions} />
      </GridCard>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────
export default function App() {
  const [src,     setSrc]     = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [data,    setData]    = useState(null);
  const [curves,  setCurves]  = useState(null);
  const [toast,   setToast]   = useState({ visible: false, msg: '' });

  const showToast = useCallback((msg, ms = 2400) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), ms);
  }, []);

  const run = useCallback(() => {
    if (!src.trim()) { showToast('⚠ Paste some code first', 2000); return; }
    showToast('⚙ Analyzing…', 9999);
    setTimeout(() => {
      try {
        const result = analyzeSource(src);
        const c = simulateCurves(result.functions);
        setData(result);
        setCurves(c);
        showToast(`✓ Done — ${result.functions.length} function${result.functions.length !== 1 ? 's' : ''} found`);
      } catch (e) {
        showToast('✕ ' + e.message, 3000);
        console.error(e);
      }
    }, 100);
  }, [src, showToast]);

  const clear = useCallback(() => {
    setSrc(''); setData(null); setCurves(null);
  }, []);

  const loadSample = useCallback(() => {
    setSrc(SAMPLE_CODE);
    showToast('✓ Sample loaded');
    setTimeout(() => { if (textareaRef.current) textareaRef.current.scrollTop = 0; }, 50);
  }, [showToast]);

  const onFile = useCallback(e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => { setSrc(ev.target.result); showToast('✓ ' + f.name); };
    r.readAsText(f);
    e.target.value = '';
  }, [showToast]);

  // Ctrl/Cmd + Enter
  useEffect(() => {
    const handler = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [run]);

  return (
    <div style={S.wrap}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 0 32px', borderBottom: '1px solid var(--border)', marginBottom: 36,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg,#4fffb0,#00a676)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 0 20px rgba(79,255,176,.25)',
          }}>⬡</div>
          <div>
            <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: '1.35rem', letterSpacing: '-.02em', color: '#4fffb0' }}>
              ComplexityViz
            </div>
            <div style={{ fontSize: '.65rem', color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase', marginTop: 2 }}>
              Static Analysis · Halstead · Big-O · MI
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadSample} style={btnStyle('ghost')}>Load Sample</button>
          <button onClick={run}        style={btnStyle('primary')}>▶ Analyze</button>
        </div>
      </header>

      {/* Input panel */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
        padding: 28, marginBottom: 28,
      }}>
        <div style={{
          fontSize: '.65rem', letterSpacing: '.12em', textTransform: 'uppercase',
          color: '#4fffb0', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4fffb0', boxShadow: '0 0 8px #4fffb0' }} />
          Python Source
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <textarea
            ref={textareaRef}
            value={src}
            onChange={e => setSrc(e.target.value)}
            spellCheck={false}
            placeholder="# Paste Python code here, or click Load Sample…"
            style={{
              flex: 1, minWidth: 280, height: 200,
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '.77rem',
              lineHeight: 1.65, padding: '14px 16px', resize: 'vertical', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 170 }}>
            <label style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border2)',
              color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '.75rem',
              fontWeight: 600, cursor: 'pointer', textAlign: 'center',
            }}>
              📂 Load .py File
              <input type="file" accept=".py" onChange={onFile} style={{ display: 'none' }} />
            </label>
            <button onClick={run}   style={{ ...btnStyle('primary'), width: '100%' }}>▶ Analyze</button>
            <button onClick={clear} style={{ ...btnStyle('ghost'),   width: '100%' }}>✕ Clear</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {data && <KpiRow data={data} />}

      {/* Charts */}
      {data && curves
        ? <ChartsGrid data={data} curves={curves} />
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 18 }}>
            <GridCard span={12}>
              <EmptyState icon="📊" text="Paste Python code above and click Analyze" />
            </GridCard>
          </div>
        )
      }

      <Toast message={toast.msg} visible={toast.visible} />
    </div>
  );
}

// ── Button style helper ──────────────────────────────────────────────
function btnStyle(variant) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontFamily: 'var(--mono)', fontSize: '.75rem', fontWeight: 600, letterSpacing: '.04em',
    transition: 'all .15s',
  };
  if (variant === 'primary') {
    return { ...base, background: '#4fffb0', color: '#040509', boxShadow: '0 3px 14px rgba(79,255,176,.25)' };
  }
  return { ...base, background: 'transparent', border: '1px solid #252b40', color: 'var(--muted)' };
}



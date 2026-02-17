// ═══════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════

let _beforeData = null;
let _afterData  = null;

// ═══════════════════════════════════════════════════════════════════
//  MAIN ACTIONS
// ═══════════════════════════════════════════════════════════════════

async function optimizeCode() {
    const code  = document.getElementById("codeInput").value;
    const level = document.querySelector('input[name="level"]:checked').value;
    if (!code.trim()) { alert("Please enter Python code"); return; }

    const response = await fetch(`/optimize/${level}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code })
    });

    const data      = await response.json();
    const optimized = data.optimized_code || "";

    document.getElementById("optimizedCode").innerText = optimized || "Optimization failed";
    document.getElementById("explanation").innerText   = data.explanation || "No explanation";

    if (optimized && optimized !== "Optimization failed") {
        _beforeData = analyzeSource(code);
        _afterData  = analyzeSource(optimized);
        renderComparison();
        switchTab('diff');
    }
}

async function analyzeComplexity() {
    const code = document.getElementById("codeInput").value;
    if (!code.trim()) { alert("Please enter Python code"); return; }

    _beforeData = analyzeSource(code);
    _afterData  = null;
    renderComparison();
    switchTab('before');
}

// ═══════════════════════════════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════

function switchTab(tab) {
    ['before', 'after', 'diff'].forEach(t => {
        document.getElementById(`panel-${t}`).style.display = t === tab ? '' : 'none';
    });
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', ['before', 'after', 'diff'][i] === tab);
    });
}

// ═══════════════════════════════════════════════════════════════════
//  RENDER ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════

function renderComparison() {
    destroyCharts();

    const sec = document.getElementById('vizSection');
    sec.style.display = '';
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (_beforeData) renderPanel('before', _beforeData);

    const afterBtn = document.querySelector('.tab-btn:nth-child(2)');
    const diffBtn  = document.querySelector('.tab-btn:nth-child(3)');

    if (_afterData) {
        renderPanel('after', _afterData);
        renderDiff(_beforeData, _afterData);
        afterBtn.disabled = false; afterBtn.style.opacity = '';
        diffBtn.disabled  = false; diffBtn.style.opacity  = '';
    } else {
        afterBtn.disabled = true; afterBtn.style.opacity = '0.35';
        diffBtn.disabled  = true; diffBtn.style.opacity  = '0.35';
    }
}

// ═══════════════════════════════════════════════════════════════════
//  CHART DEFAULTS
// ═══════════════════════════════════════════════════════════════════

Chart.register(ChartDataLabels);
Chart.defaults.color       = '#94a3b8';
Chart.defaults.borderColor = '#1e293b';
Chart.defaults.font.family = 'Arial, sans-serif';
Chart.defaults.font.size   = 11;

const C = {
    blue:   '#38bdf8', sky:    '#0ea5e9', teal:   '#06d6a0',
    green:  '#4ade80', amber:  '#fbbf24', coral:  '#f87171',
    violet: '#a78bfa', pink:   '#f472b6',
};

const BIGO_MAP = {
    'O(1)':       { color: C.teal,   label: 'O(1) Constant'        },
    'O(log n)':   { color: C.green,  label: 'O(log n) Logarithmic' },
    'O(n)':       { color: C.blue,   label: 'O(n) Linear'          },
    'O(n log n)': { color: C.sky,    label: 'O(n log n)'           },
    'O(n^2)':     { color: C.amber,  label: 'O(n²) Quadratic'      },
    'O(n^3)':     { color: C.coral,  label: 'O(n³) Cubic'          },
    'O(2^n)':     { color: C.pink,   label: 'O(2ⁿ) Exponential'    },
};

function bigoColor(s) { return (BIGO_MAP[s] || { color: C.violet }).color; }
function bigoLabel(s) { return (BIGO_MAP[s] || { label: s        }).label; }

let _charts = {};
function destroyCharts() { Object.values(_charts).forEach(c => c?.destroy?.()); _charts = {}; }

// ═══════════════════════════════════════════════════════════════════
//  ANALYSIS ENGINE  (mirrors complexity.py exactly)
// ═══════════════════════════════════════════════════════════════════

function extractFuncBodies(source) {
    const lines = source.split('\n'), funcs = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^(\s*)def\s+(\w+)\s*\(/);
        if (!m) continue;
        const baseIndent = m[1].length, name = m[2], body = [lines[i]];
        let j = i + 1;
        while (j < lines.length) {
            const l = lines[j];
            if (!l.trim()) { body.push(l); j++; continue; }
            if (l.match(/^(\s*)/)[1].length <= baseIndent) break;
            body.push(l); j++;
        }
        funcs.push({ name, startLine: i + 1, src: body.join('\n') });
    }
    return funcs;
}

function getSignals(src, name) {
    const loopLines = [...src.matchAll(/^(\s*)(for|while)\b/gm)];
    let maxLoopDepth = 0;
    if (loopLines.length) {
        const indents = loopLines.map(m => m[1].length);
        maxLoopDepth = Math.floor((Math.max(...indents) - Math.min(...indents)) / 4) + 1;
    }
    const compBlocks = [
        ...src.matchAll(/\[([^\[\]]*for[^\[\]]*)\]/g),
        ...src.matchAll(/\{([^\{\}]*for[^\{\}]*)\}/g),
    ];
    const maxCompDepth = compBlocks.reduce((d, m) =>
        Math.max(d, (m[1].match(/\bfor\b/g) || []).length), 0);
    const bodyAfterDef = src.split('\n').slice(1).join('\n');
    const recMatches   = bodyAfterDef.match(new RegExp('\\b' + name + '\\s*\\(', 'g')) || [];
    return {
        max_loop_depth: maxLoopDepth, max_comp_depth: maxCompDepth,
        recursion: recMatches.length > 0, recursive_calls: recMatches.length,
        has_branching_recursion: recMatches.length > 1,
        slicing: /\[\s*\w*\s*:\s*\w*\s*\]/.test(src),
        possible_log_loop: /=\s*[^=].*\/\/\s*2\b/.test(src) || /\bmid\b/.test(src),
        allocations: (src.match(/\[\s*\]/g) || []).length +
                     (src.match(/\{\s*\}/g) || []).length +
                     (src.match(/\[.*?for\b/g) || []).length,
    };
}

function estimateTime(sig) {
    const { max_loop_depth: ld, max_comp_depth: cd, recursion, slicing,
            has_branching_recursion: branching, possible_log_loop: logL } = sig;
    const divide = recursion && slicing;
    if (recursion) {
        if (branching) return divide ? 'O(n log n)' : 'O(2^n)';
        if (slicing)   return 'O(n^2)';
        return 'O(n)';
    }
    if (logL && ld === 1) return 'O(log n)';
    const d = Math.max(ld, cd);
    if (d === 0) return 'O(1)';
    if (d === 1) return 'O(n)';
    if (d === 2) return 'O(n^2)';
    if (d === 3) return 'O(n^3)';
    return `O(n^${d})`;
}

function estimateSpace(sig) {
    const { recursion, allocations, max_comp_depth: cd } = sig;
    if (recursion)   return 'O(n)';
    if (allocations) return cd >= 2 ? `O(n^${cd})` : 'O(n)';
    return 'O(1)';
}

function calcCC(src) {
    let cc = 1;
    for (const p of [/\bif\b/g, /\belif\b/g, /\bfor\b/g, /\bwhile\b/g,
                     /\bexcept\b/g, /\bwith\b/g, /\band\b/g, /\bor\b/g])
        cc += (src.match(p) || []).length;
    return cc;
}

function calcLOC(src) {
    const lines = src.split('\n'), total = lines.length;
    const blank   = lines.filter(l => !l.trim()).length;
    const comment = lines.filter(l => l.trim().startsWith('#') ||
                                      l.trim().startsWith('"""') ||
                                      l.trim().startsWith("'''")).length;
    return { total, blank, comment, code: Math.max(total - blank - comment, 1) };
}

function calcHalstead(src) {
    const ops  = src.match(/[\+\-\*\/\%\=\!\<\>\&\|\^~]+|\b(if|elif|else|for|while|return|and|or|not|in|is|import|def|class)\b/g) || [];
    const ands = src.match(/\b[a-zA-Z_]\w*\b|\b\d+\.?\d*\b/g) || [];
    const n1 = new Set(ops).size,  n2 = new Set(ands).size;
    const N1 = ops.length,         N2 = ands.length;
    const n  = Math.max(n1+n2, 1), N  = N1 + N2;
    const vol  = N * Math.log2(n);
    const diff = (n1/2) * (N2/Math.max(n2, 1));
    return {
        volume:     Math.round(vol*100)/100,
        difficulty: Math.round(diff*100)/100,
        effort:     Math.round(diff*vol*100)/100,
        bugs:       Math.round((vol/3000)*10000)/10000,
    };
}

function calcMI(vol, cc, loc) {
    if (loc <= 0) return 100;
    const raw = 171 - 5.2*Math.log(Math.max(vol,1)) - 0.23*cc - 16.2*Math.log(Math.max(loc,1));
    return Math.round(Math.max(0, Math.min(100, raw*100/171))*100)/100;
}

function miColor(mi) { return mi >= 80 ? C.green : mi >= 65 ? C.amber : C.coral; }
function miLabel(mi) { return mi >= 80 ? 'High'  : mi >= 65 ? 'Moderate' : 'Low'; }

function analyzeSource(source) {
    const rawFuncs = extractFuncBodies(source);
    const functions = rawFuncs.map(f => {
        const sig = getSignals(f.src, f.name);
        const tc  = estimateTime(sig), sc = estimateSpace(sig);
        const cc  = calcCC(f.src), loc = calcLOC(f.src), h = calcHalstead(f.src);
        const mi  = calcMI(h.volume, cc, loc.code);
        return { name: f.name, line: f.startLine, time_complexity: tc, space_complexity: sc,
                 cyclomatic_complexity: cc, loc, halstead: h,
                 maintainability_index: mi, mi_label: miLabel(mi) };
    });
    const fileLOC = calcLOC(source), fileH = calcHalstead(source);
    const totalCC = functions.reduce((s, f) => s + f.cyclomatic_complexity, 0) || 1;
    const fileMI  = calcMI(fileH.volume, totalCC, fileLOC.code);
    const dist    = {};
    functions.forEach(f => { dist[f.time_complexity] = (dist[f.time_complexity] || 0) + 1; });
    return { functions, loc: fileLOC, halstead: fileH,
             total_cyclomatic_complexity: totalCC,
             maintainability_index: fileMI, mi_label: miLabel(fileMI),
             big_o_distribution: dist };
}

function simulateCurves(funcs) {
    const sizes = [10, 50, 100, 250, 500, 1000, 2000];
    const S = 0.0015, n_ = () => 0.82 + Math.random()*0.36;
    return funcs.map(f => {
        const rt = sizes.map(n => {
            switch(f.time_complexity) {
                case 'O(1)':       return S*6*n_();
                case 'O(log n)':   return S*Math.log2(n)*6*n_();
                case 'O(n)':       return S*n*n_();
                case 'O(n log n)': return S*n*Math.log2(n)/20*n_();
                case 'O(n^2)':     return S*n*n/180*n_();
                case 'O(n^3)':     return S*n*n*n/60000*n_();
                case 'O(2^n)':     return S*Math.pow(1.08,n)*n_();
                default:           return S*n*n_();
            }
        });
        const mem = sizes.map(n => {
            const b = 8;
            switch(f.space_complexity) {
                case 'O(1)':   return b*n_();
                case 'O(n)':   return b+n*0.09*n_();
                case 'O(n^2)': return b+n*n/280*n_();
                default:       return b+n*0.04*n_();
            }
        });
        return { ...f, sizes,
                 runtimes: rt.map(v => Math.round(v*1000)/1000),
                 memory:   mem.map(v => Math.round(v*100)/100) };
    });
}

// ═══════════════════════════════════════════════════════════════════
//  RENDER A SINGLE PANEL
// ═══════════════════════════════════════════════════════════════════

function renderPanel(side, data) {
    const s    = `-${side}`;
    const COLS = Object.values(C);

    // KPIs
    const avgCC = data.functions.length
        ? (data.total_cyclomatic_complexity / data.functions.length).toFixed(1) : '—';
    document.getElementById(`kpiRow${s}`).innerHTML = [
        { l:'Functions',     v:data.functions.length,             s:'detected',               c:C.blue   },
        { l:'Avg CC/func',   v:avgCC,                             s:'cyclomatic complexity',   c:C.violet },
        { l:'Lines of Code', v:data.loc.code,                     s:`${data.loc.total} total`, c:C.teal   },
        { l:'Halstead Vol',  v:Math.round(data.halstead.volume),  s:'effort proxy',            c:C.amber  },
        { l:'Maintain. Idx', v:data.maintainability_index,        s:data.mi_label,             c:miColor(data.maintainability_index) },
        { l:'Est. Bugs',     v:data.halstead.bugs,                s:'Halstead estimate',       c:C.coral  },
    ].map(k => `
        <div class="kpi-card" style="--kc:${k.c}">
            <div class="kpi-lbl">${k.l}</div>
            <div class="kpi-val">${k.v}</div>
            <div class="kpi-sub">${k.s}</div>
        </div>`).join('');

    if (!data.functions.length) return;
    const curves = simulateCurves(data.functions);

    // Runtime line chart
    _charts[`runtime${s}`] = new Chart(document.getElementById(`chRuntime${s}`), {
        type: 'line',
        data: {
            labels: curves[0].sizes.map(n => `n=${n}`),
            datasets: curves.slice(0,8).map((f,i) => {
                const col = COLS[i % COLS.length];
                return { label:f.name, data:f.runtimes, borderColor:col,
                         backgroundColor:col+'20', pointBackgroundColor:col,
                         pointRadius:4, pointHoverRadius:7, borderWidth:2, tension:0.4, fill:false };
            }),
        },
        options: lineOpts('Runtime (ms)'),
    });

    // Big-O doughnut
    const bigoKeys = Object.keys(data.big_o_distribution);
    const bigoCols = bigoKeys.map(k => bigoColor(k));
    _charts[`bigo${s}`] = new Chart(document.getElementById(`chBigo${s}`), {
        type: 'doughnut',
        data: { labels: bigoKeys.map(bigoLabel),
                datasets: [{ data: bigoKeys.map(k => data.big_o_distribution[k]),
                             backgroundColor: bigoCols, borderWidth:0, hoverOffset:8 }] },
        options: donutOpts(),
    });
    document.getElementById(`bigoPills${s}`).innerHTML = bigoKeys.map((k,i) => `
        <div class="bigo-pill">
            <div class="bigo-dot" style="background:${bigoCols[i]}"></div>${bigoLabel(k)}
        </div>`).join('');

    // Memory area chart
    _charts[`memory${s}`] = new Chart(document.getElementById(`chMemory${s}`), {
        type: 'line',
        data: {
            labels: curves[0].sizes.map(n => `n=${n}`),
            datasets: curves.slice(0,8).map((f,i) => {
                const col = COLS[i % COLS.length];
                return { label:f.name, data:f.memory, borderColor:col,
                         backgroundColor:col+'22', pointBackgroundColor:col,
                         pointRadius:3, borderWidth:2, tension:0.4, fill:true };
            }),
        },
        options: lineOpts('Memory (KB)'),
    });

    // CC horizontal bar
    const sorted  = [...data.functions].sort((a,b) => b.cyclomatic_complexity - a.cyclomatic_complexity);
    const ccCols  = sorted.map(f => f.cyclomatic_complexity<=5 ? C.green
                                  : f.cyclomatic_complexity<=10 ? C.amber : C.coral);
    _charts[`cc${s}`] = new Chart(document.getElementById(`chCC${s}`), {
        type: 'bar',
        data: { labels: sorted.map(f => f.name),
                datasets: [{ data: sorted.map(f => f.cyclomatic_complexity),
                             backgroundColor: ccCols.map(c => c+'bb'),
                             borderColor: ccCols, borderWidth:1, borderRadius:5 }] },
        options: barOpts(),
    });

    // Heatmap rows
    const hmMax = Math.max(...sorted.map(f => f.cyclomatic_complexity), 1);
    document.getElementById(`hmGrid${s}`).innerHTML = sorted.map(f => {
        const norm = f.cyclomatic_complexity / hmMax, pct = Math.round(norm*100);
        const col  = norm<.33 ? C.green : norm<.66 ? C.amber : C.coral;
        const bg   = norm<.33 ? `rgba(74,222,128,${.07+norm*.25})`
                   : norm<.66 ? `rgba(251,191,36,${.07+norm*.2})`
                               : `rgba(248,113,113,${.07+norm*.2})`;
        return `<div class="hm-row" style="background:${bg}"
                     title="${f.name} | ${f.time_complexity} | ${f.space_complexity}">
            <span class="hm-name" style="color:${col}">${f.name}</span>
            <div class="hm-track"><div class="hm-fill" style="width:${pct}%;background:${col}"></div></div>
            <span class="hm-num" style="color:${col}">${f.cyclomatic_complexity}</span>
        </div>`;
    }).join('');

    // MI gauge
    const mi = data.maintainability_index, mc = miColor(mi);
    const arc = document.getElementById(`miArc${s}`);
    arc.style.stroke = mc;
    arc.style.strokeDashoffset = 327 - (mi/100)*327;
    document.getElementById(`miScore${s}`).textContent = mi;
    document.getElementById(`miScore${s}`).style.color = mc;
    document.getElementById(`miLabel${s}`).textContent = data.mi_label;
    document.getElementById(`miTable${s}`).innerHTML = `
        <tr><td>Lines of Code</td><td>${data.loc.code}</td></tr>
        <tr><td>Cyclomatic CC</td><td>${data.total_cyclomatic_complexity}</td></tr>
        <tr><td>Halstead Vol.</td><td>${data.halstead.volume}</td></tr>
        <tr><td>Difficulty</td>   <td>${data.halstead.difficulty}</td></tr>
        <tr><td>Est. Bugs</td>    <td>${data.halstead.bugs}</td></tr>`;

    // Function summary table
    const badge = (v,c) => `<span class="cx-badge" style="background:${c}22;color:${c};border:1px solid ${c}44">${v}</span>`;
    document.getElementById(`fnTbody${s}`).innerHTML = data.functions.map(f => `<tr>
        <td style="font-weight:600">${f.name}</td>
        <td style="color:#64748b">${f.line}</td>
        <td>${badge(f.time_complexity,  bigoColor(f.time_complexity))}</td>
        <td>${badge(f.space_complexity, bigoColor(f.space_complexity))}</td>
        <td>${badge(f.cyclomatic_complexity, f.cyclomatic_complexity<=5?C.green:f.cyclomatic_complexity<=10?C.amber:C.coral)}</td>
        <td>${badge(f.maintainability_index, miColor(f.maintainability_index))}</td>
        <td>${f.loc.code}</td>
        <td>${f.halstead.bugs}</td>
    </tr>`).join('');
}

// ═══════════════════════════════════════════════════════════════════
//  DIFF / COMPARE PANEL
// ═══════════════════════════════════════════════════════════════════

function renderDiff(before, after) {

    // ── Delta KPI helper ──────────────────────────────────────────
    function delta(bv, av, lowerIsBetter = true) {
        const diff = av - bv;
        if (diff === 0) return { arrow: '→', color: '#94a3b8', str: 'no change' };
        const improved = lowerIsBetter ? diff < 0 : diff > 0;
        const pct = bv !== 0 ? Math.abs(Math.round(diff/bv*100)) + '%' : '—';
        return { arrow: diff < 0 ? '↓' : '↑', color: improved ? C.green : C.coral, str: pct };
    }

    const dMI   = delta(before.maintainability_index,          after.maintainability_index,          false);
    const dCC   = delta(before.total_cyclomatic_complexity,    after.total_cyclomatic_complexity);
    const dLOC  = delta(before.loc.code,                       after.loc.code);
    const dBugs = delta(before.halstead.bugs,                  after.halstead.bugs);
    const dVol  = delta(before.halstead.volume,                after.halstead.volume);

    document.getElementById('kpiRow-diff').innerHTML = [
        { l:'Maintain. Idx', b:before.maintainability_index,       a:after.maintainability_index,       d:dMI   },
        { l:'Cyclomatic CC', b:before.total_cyclomatic_complexity, a:after.total_cyclomatic_complexity, d:dCC   },
        { l:'Lines of Code', b:before.loc.code,                    a:after.loc.code,                    d:dLOC  },
        { l:'Est. Bugs',     b:before.halstead.bugs,               a:after.halstead.bugs,               d:dBugs },
        { l:'Halstead Vol',  b:Math.round(before.halstead.volume), a:Math.round(after.halstead.volume), d:dVol  },
    ].map(k => `
        <div class="kpi-card" style="--kc:${k.d.color}">
            <div class="kpi-lbl">${k.l}</div>
            <div class="kpi-val diff-val">
                <span class="diff-before">${k.b}</span>
                <span class="diff-arrow" style="color:${k.d.color}">${k.d.arrow}</span>
                <span class="diff-after">${k.a}</span>
            </div>
            <div class="kpi-sub" style="color:${k.d.color}">${k.d.str}</div>
        </div>`).join('');

    // ── Side-by-side Big-O doughnuts ─────────────────────────────
    ['before', 'after'].forEach((side, si) => {
        const data = si === 0 ? before : after;
        const keys = Object.keys(data.big_o_distribution);
        const cols = keys.map(k => bigoColor(k));
        _charts[`bigoD_${side}`] = new Chart(document.getElementById(`chBigo-diff-${side}`), {
            type: 'doughnut',
            data: { labels: keys.map(bigoLabel),
                    datasets: [{ data: keys.map(k => data.big_o_distribution[k]),
                                 backgroundColor: cols, borderWidth:0, hoverOffset:8 }] },
            options: donutOpts(),
        });
    });

    // ── Grouped CC bar ────────────────────────────────────────────
    const allFns   = [...new Set([...before.functions.map(f=>f.name), ...after.functions.map(f=>f.name)])];
    const beforeCC = allFns.map(n => (before.functions.find(f=>f.name===n)||{cyclomatic_complexity:0}).cyclomatic_complexity);
    const afterCC  = allFns.map(n => (after.functions.find(f=>f.name===n)||{cyclomatic_complexity:0}).cyclomatic_complexity);

    _charts.ccDiff = new Chart(document.getElementById('chCC-diff'), {
        type: 'bar',
        data: {
            labels: allFns,
            datasets: [
                { label:'Before', data:beforeCC, backgroundColor:C.coral+'99', borderColor:C.coral, borderWidth:1, borderRadius:4 },
                { label:'After',  data:afterCC,  backgroundColor:C.green+'99', borderColor:C.green, borderWidth:1, borderRadius:4 },
            ],
        },
        options: {
            responsive:true, maintainAspectRatio:false,
            plugins:{
                legend:{ position:'top', labels:{ boxWidth:10, padding:14 }},
                tooltip:{ backgroundColor:'#0f172a', borderColor:'#334155', borderWidth:1 },
                datalabels:{ display:false },
            },
            scales:{
                x:{ grid:{ color:'#1e293b' }},
                y:{ grid:{ color:'#1e293b' }, title:{ display:true, text:'CC Score' }},
            },
        },
    });

    // ── Avg runtime overlay ───────────────────────────────────────
    const bCurves = simulateCurves(before.functions);
    const aCurves = simulateCurves(after.functions);
    const sizes   = bCurves[0]?.sizes || [];
    const avgRT   = curves => sizes.map((_,i) =>
        Math.round(curves.reduce((s,c) => s+c.runtimes[i], 0) / curves.length * 1000) / 1000);

    _charts.rtDiff = new Chart(document.getElementById('chRuntime-diff'), {
        type: 'line',
        data: {
            labels: sizes.map(n => `n=${n}`),
            datasets: [
                { label:'Before (avg)', data:avgRT(bCurves), borderColor:C.coral,
                  backgroundColor:C.coral+'18', pointBackgroundColor:C.coral,
                  pointRadius:4, borderWidth:2, tension:0.4, fill:false },
                { label:'After (avg)',  data:avgRT(aCurves), borderColor:C.green,
                  backgroundColor:C.green+'18', pointBackgroundColor:C.green,
                  pointRadius:4, borderWidth:2, tension:0.4, fill:false },
            ],
        },
        options: lineOpts('Avg Runtime (ms)'),
    });

    // ── Function diff table ───────────────────────────────────────
    const badge = (v, c) => `<span class="cx-badge" style="background:${c}22;color:${c};border:1px solid ${c}44">${v}</span>`;
    const bigoRank = s => Object.keys(BIGO_MAP).indexOf(s);
    const impArrow = (bv, av, lowerBetter=true) => {
        if (bv === av) return `<span style="color:#475569">→</span>`;
        const good = lowerBetter ? av < bv : av > bv;
        return `<span style="color:${good?C.green:C.coral};font-weight:700">${av<bv?'↓':'↑'}</span>`;
    };
    const ccCol  = v => v<=5 ? C.green : v<=10 ? C.amber : C.coral;

    document.getElementById('fnTbody-diff').innerHTML = allFns.map(name => {
        const b = before.functions.find(f => f.name===name);
        const a = after.functions.find(f => f.name===name);
        const nd = `<span style="color:#334155">—</span>`;
        return `<tr>
            <td style="font-weight:600">${name}</td>
            <td>${b ? badge(b.time_complexity,  bigoColor(b.time_complexity))  : nd}</td>
            <td>${a ? badge(a.time_complexity,  bigoColor(a.time_complexity))  : nd}
                ${b&&a ? impArrow(bigoRank(b.time_complexity), bigoRank(a.time_complexity)) : ''}
            </td>
            <td>${b ? badge(b.space_complexity, bigoColor(b.space_complexity)) : nd}</td>
            <td>${a ? badge(a.space_complexity, bigoColor(a.space_complexity)) : nd}
                ${b&&a ? impArrow(bigoRank(b.space_complexity), bigoRank(a.space_complexity)) : ''}
            </td>
            <td>${b ? badge(b.cyclomatic_complexity, ccCol(b.cyclomatic_complexity)) : nd}</td>
            <td>${a ? badge(a.cyclomatic_complexity, ccCol(a.cyclomatic_complexity)) : nd}
                ${b&&a ? impArrow(b.cyclomatic_complexity, a.cyclomatic_complexity) : ''}
            </td>
            <td>${b ? badge(b.maintainability_index, miColor(b.maintainability_index)) : nd}</td>
            <td>${a ? badge(a.maintainability_index, miColor(a.maintainability_index)) : nd}
                ${b&&a ? impArrow(b.maintainability_index, a.maintainability_index, false) : ''}
            </td>
        </tr>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════
//  SHARED CHART OPTION FACTORIES
// ═══════════════════════════════════════════════════════════════════

function lineOpts(yLabel) {
    return {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode:'index', intersect:false },
        plugins: {
            legend: { position:'top', labels:{ boxWidth:9, padding:14 }},
            tooltip: { backgroundColor:'#0f172a', borderColor:'#334155', borderWidth:1 },
            datalabels: { display:false },
        },
        scales: {
            x: { grid:{ color:'#1e293b' }},
            y: { grid:{ color:'#1e293b' }, title:{ display:true, text:yLabel }},
        },
    };
}

function donutOpts() {
    return {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
            legend: { display:false },
            tooltip: { backgroundColor:'#0f172a', borderColor:'#334155', borderWidth:1 },
            datalabels: { color:'#e5e7eb', font:{ size:10, weight:'bold' }, formatter:v=>v||'' },
        },
    };
}

function barOpts() {
    return {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: {
            legend: { display:false },
            tooltip: {
                backgroundColor:'#0f172a', borderColor:'#334155', borderWidth:1,
                callbacks: { label: ctx => { const v=ctx.raw; return `CC: ${v} — ${v<=5?'Low':v<=10?'Moderate':'High'} risk`; }},
            },
            datalabels: { align:'end', anchor:'end', color:'#e5e7eb',
                          font:{ size:10, weight:'bold' }, formatter:v=>v },
        },
        scales: {
            x: { grid:{ color:'#1e293b' }, title:{ display:true, text:'Score' }},
            y: { grid:{ color:'transparent' }},
        },
    };
}
// ── Tokeniser helpers ────────────────────────────────────────────────
export function countPattern(src, re) {
  return (src.match(re) || []).length;
}

export function extractFuncBodies(source) {
  const lines = source.split('\n');
  const funcs = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)def\s+(\w+)\s*\(/);
    if (!m) continue;
    const baseIndent = m[1].length;
    const name = m[2];
    const body = [lines[i]];
    let j = i + 1;
    while (j < lines.length) {
      const l = lines[j];
      if (l.trim() === '') { body.push(l); j++; continue; }
      const ind = l.match(/^(\s*)/)[1].length;
      if (ind <= baseIndent) break;
      body.push(l); j++;
    }
    funcs.push({ name, startLine: i + 1, src: body.join('\n') });
  }
  return funcs;
}

export function signals(src, name) {
  const loopLines = [...src.matchAll(/^(\s*)(for|while)\b/gm)];
  let maxLoopDepth = 0;
  if (loopLines.length) {
    const indents = loopLines.map(m => m[1].length);
    const base = Math.min(...indents);
    const span = 4;
    maxLoopDepth = Math.floor((Math.max(...indents) - base) / span) + 1;
  }

  const compBlocks = [
    ...src.matchAll(/\[([^\[\]]*for[^\[\]]*)\]/g),
    ...src.matchAll(/\{([^\{\}]*for[^\{\}]*)\}/g),
  ];
  const maxCompDepth = compBlocks.reduce((d, m) => {
    const depth = (m[1].match(/\bfor\b/g) || []).length;
    return Math.max(d, depth);
  }, 0);

  const bodyAfterDef = src.split('\n').slice(1).join('\n');
  const recursion = new RegExp('\\b' + name + '\\s*\\(').test(bodyAfterDef);
  const recMatches = bodyAfterDef.match(new RegExp('\\b' + name + '\\s*\\(', 'g')) || [];
  const recursiveCalls = recMatches.length;
  const hasBranchingRecursion = recursiveCalls > 1;

  const slicing = /\[\s*\w*\s*:\s*\w*\s*\]/.test(src);
  const possibleLogLoop = /=\s*[^=].*\/\/\s*2\b/.test(src) || /mid\s*=/.test(src);

  const allocations =
    countPattern(src, /\[\s*\]/g) +
    countPattern(src, /\{\s*\}/g) +
    countPattern(src, /\[.*for\b/g);

  return {
    max_loop_depth: maxLoopDepth,
    max_comp_depth: maxCompDepth,
    recursion,
    recursive_calls: recursiveCalls,
    allocations,
    slicing,
    has_branching_recursion: hasBranchingRecursion,
    possible_log_loop: possibleLogLoop,
  };
}

export function estimateTime(sig) {
  const { max_loop_depth: ld, max_comp_depth: cd, recursion, slicing,
          has_branching_recursion: branching, possible_log_loop: logL } = sig;
  const divide = recursion && slicing;

  if (recursion) {
    if (branching) {
      if (divide) return 'O(n log n)';
      return 'O(2^n)';
    }
    if (slicing) return 'O(n^2)';
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

export function estimateSpace(sig) {
  const { recursion, allocations, max_comp_depth: cd } = sig;
  if (recursion) return 'O(n)';
  if (allocations) {
    if (cd >= 2) return `O(n^${cd})`;
    return 'O(n)';
  }
  return 'O(1)';
}

export function calcCC(src) {
  let cc = 1;
  const kw = [/\bif\b/g, /\belif\b/g, /\bfor\b/g, /\bwhile\b/g,
              /\bexcept\b/g, /\bwith\b/g, /\band\b/g, /\bor\b/g];
  for (const p of kw) cc += (src.match(p) || []).length;
  return cc;
}

export function calcLOC(src) {
  const lines = src.split('\n');
  const total   = lines.length;
  const blank   = lines.filter(l => !l.trim()).length;
  const comment = lines.filter(l =>
    l.trim().startsWith('#') ||
    l.trim().startsWith('"""') ||
    l.trim().startsWith("'''")
  ).length;
  return { total, blank, comment, code: Math.max(total - blank - comment, 1) };
}

export function calcHalstead(src) {
  const ops = src.match(/[\+\-\*\/\%\=\!\<\>\&\|\^~]+|(?<!\w)(if|elif|else|for|while|return|and|or|not|in|is|import|def|class)(?!\w)/g) || [];
  const ands = src.match(/\b[a-zA-Z_]\w*\b|\b\d+\.?\d*\b/g) || [];
  const n1 = new Set(ops).size,  n2 = new Set(ands).size;
  const N1 = ops.length,         N2 = ands.length;
  const n  = Math.max(n1 + n2, 1), N = N1 + N2;
  const vol  = N * Math.log2(n);
  const diff = (n1 / 2) * (N2 / Math.max(n2, 1));
  return {
    volume:     Math.round(vol  * 100) / 100,
    difficulty: Math.round(diff * 100) / 100,
    effort:     Math.round(diff * vol  * 100) / 100,
    bugs:       Math.round((vol / 3000) * 10000) / 10000,
  };
}

export function calcMI(vol, cc, loc) {
  if (loc <= 0) return 100;
  const raw = 171 - 5.2 * Math.log(Math.max(vol,1)) - 0.23 * cc - 16.2 * Math.log(Math.max(loc,1));
  return Math.round(Math.max(0, Math.min(100, raw * 100 / 171)) * 100) / 100;
}

export function miLabel(mi) { return mi >= 80 ? 'High' : mi >= 65 ? 'Moderate' : 'Low'; }

export const C = {
  mint:   '#4fffb0',
  indigo: '#7b5ea7',
  coral:  '#ff6b6b',
  gold:   '#ffd166',
  teal:   '#06d6a0',
  blue:   '#118ab2',
  pink:   '#f72585',
  sky:    '#4cc9f0',
};

export function miColor(mi) { return mi >= 80 ? C.mint : mi >= 65 ? C.gold : C.coral; }

export const BIGO_MAP = {
  'O(1)':       { color: C.teal,   label: 'O(1) Constant'        },
  'O(log n)':   { color: C.mint,   label: 'O(log n) Logarithmic' },
  'O(n)':       { color: C.blue,   label: 'O(n) Linear'          },
  'O(n log n)': { color: C.sky,    label: 'O(n log n)'           },
  'O(n^2)':     { color: C.gold,   label: 'O(n²) Quadratic'      },
  'O(n^3)':     { color: C.coral,  label: 'O(n³) Cubic'          },
  'O(2^n)':     { color: C.pink,   label: 'O(2ⁿ) Exponential'   },
};

export function bigoColor(s) { return (BIGO_MAP[s] || { color: C.indigo }).color; }
export function bigoLabel(s) { return (BIGO_MAP[s] || { label: s }).label; }

export function simulateCurves(funcs) {
  const sizes = [10, 50, 100, 250, 500, 1000, 2000];
  const noise = () => 0.82 + Math.random() * 0.36;
  const S = 0.0015;
  return funcs.map(f => {
    const rt = sizes.map(n => {
      switch (f.time_complexity) {
        case 'O(1)':       return S * 6 * noise();
        case 'O(log n)':   return S * Math.log2(n) * 6 * noise();
        case 'O(n)':       return S * n * noise();
        case 'O(n log n)': return S * n * Math.log2(n) / 20 * noise();
        case 'O(n^2)':     return S * n * n / 180 * noise();
        case 'O(n^3)':     return S * n * n * n / 60000 * noise();
        case 'O(2^n)':     return S * Math.pow(1.08, n) * noise();
        default:           return S * n * noise();
      }
    });
    const mem = sizes.map(n => {
      const b = 8;
      switch (f.space_complexity) {
        case 'O(1)':   return b * noise();
        case 'O(n)':   return b + n * 0.09 * noise();
        case 'O(n^2)': return b + n * n / 280 * noise();
        default:       return b + n * 0.04 * noise();
      }
    });
    return {
      ...f,
      sizes,
      runtimes: rt.map(v => Math.round(v * 1000) / 1000),
      memory:   mem.map(v => Math.round(v * 100) / 100),
    };
  });
}

export function analyzeSource(source) {
  const rawFuncs = extractFuncBodies(source);
  const functions = rawFuncs.map(f => {
    const sig = signals(f.src, f.name);
    const tc  = estimateTime(sig);
    const sc  = estimateSpace(sig);
    const cc  = calcCC(f.src);
    const loc = calcLOC(f.src);
    const h   = calcHalstead(f.src);
    const mi  = calcMI(h.volume, cc, loc.code);
    return {
      name: f.name, line: f.startLine,
      time_complexity: tc, space_complexity: sc,
      cyclomatic_complexity: cc,
      loc, halstead: h,
      maintainability_index: mi,
      mi_label: miLabel(mi),
    };
  });

  const fileLOC = calcLOC(source);
  const fileH   = calcHalstead(source);
  const totalCC = functions.reduce((s, f) => s + f.cyclomatic_complexity, 0) || 1;
  const fileMI  = calcMI(fileH.volume, totalCC, fileLOC.code);
  const dist = {};
  functions.forEach(f => { dist[f.time_complexity] = (dist[f.time_complexity] || 0) + 1; });

  return {
    functions,
    loc: fileLOC,
    halstead: fileH,
    total_cyclomatic_complexity: totalCC,
    maintainability_index: fileMI,
    mi_label: miLabel(fileMI),
    big_o_distribution: dist,
  };
}

export const SAMPLE_CODE = `def bubble_sort(arr):
    """O(n^2) - classic quadratic sort."""
    n = len(arr)
    for i in range(n):
        for j in range(n - i - 1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

def binary_search(arr, target):
    """O(log n) - halving search."""
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: lo = mid + 1
        else: hi = mid - 1
    return -1

def merge_sort(arr):
    """O(n log n) - divide and conquer."""
    if len(arr) <= 1: return arr
    mid = len(arr) // 2
    left  = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(l, r):
    res = []
    i = j = 0
    while i < len(l) and j < len(r):
        if l[i] < r[j]: res.append(l[i]); i += 1
        else:            res.append(r[j]); j += 1
    return res + l[i:] + r[j:]

def fib(n):
    """O(2^n) - branching recursion."""
    if n <= 1: return n
    return fib(n-1) + fib(n-2)

def matrix_mul(A, B):
    """O(n^3) - triple nested loop."""
    n = len(A)
    C = [[0]*n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            for k in range(n):
                C[i][j] += A[i][k] * B[k][j]
    return C

def count_words(text):
    """O(n) - single pass."""
    counts = {}
    for w in text.split():
        counts[w] = counts.get(w, 0) + 1
    return counts

def flatten(matrix):
    """O(n^2) - nested comprehension."""
    return [v for row in matrix for v in row]
`;



"""
visualization_routes.py
-----------------------
Flask Blueprint for the Complexity & Metric Visualization dashboard.

Register in app.py:
    from visualization_routes import viz_bp
    app.register_blueprint(viz_bp)

Routes
------
GET  /viz/                        → visualization dashboard (visualizations.html)
POST /viz/api/analyze             → full static analysis JSON
POST /viz/api/analyze/simple      → original 2-field response (time + space only)
POST /viz/api/benchmark           → live empirical benchmark (executes code)
POST /viz/api/functions           → lightweight per-function summary
"""

import sys, os, textwrap
from flask import Blueprint, render_template, request, jsonify

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analysis.complexity import (
    analyze_code_complexity,
    analyze_source,
    empirical_benchmark,
)

viz_bp = Blueprint("viz", __name__, url_prefix="/viz")


# ── Pages ──────────────────────────────────────────────────────────────────────

@viz_bp.route("/")
def dashboard():
    return render_template("visualizations.html")


# ── REST ───────────────────────────────────────────────────────────────────────

@viz_bp.route("/api/analyze", methods=["POST"])
def api_analyze():
    """Full rich analysis: LOC, Halstead, per-function CC, MI, Big-O."""
    body   = request.get_json(force=True, silent=True) or {}
    source = body.get("source", "").strip()
    if not source:
        return jsonify({"error": "No source provided"}), 400
    try:
        return jsonify(analyze_source(source))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@viz_bp.route("/api/analyze/simple", methods=["POST"])
def api_analyze_simple():
    """Original two-field response: { time_complexity, space_complexity }."""
    body   = request.get_json(force=True, silent=True) or {}
    source = body.get("source", "").strip()
    if not source:
        return jsonify({"error": "No source provided"}), 400
    try:
        return jsonify(analyze_code_complexity(source))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@viz_bp.route("/api/benchmark", methods=["POST"])
def api_benchmark():
    """
    Execute a named function at varying input sizes; return runtimes + memory.
    WARNING: executes arbitrary code — dev/trusted environments only.
    Body: { source, function, input_sizes?, generator?: list|str|int|matrix }
    """
    body      = request.get_json(force=True, silent=True) or {}
    source    = body.get("source", "").strip()
    func_name = body.get("function", "")
    sizes     = body.get("input_sizes", [10, 50, 100, 250, 500])
    gen_type  = body.get("generator", "list")
    if not source or not func_name:
        return jsonify({"error": "'source' and 'function' are required"}), 400
    generators = {
        "list":   lambda n: ([i for i in range(n)],),
        "str":    lambda n: ("x" * n,),
        "int":    lambda n: (n,),
        "matrix": lambda n: ([[j for j in range(n)] for _ in range(n)],),
    }
    generator = generators.get(gen_type, generators["list"])
    try:
        ns = {}
        exec(textwrap.dedent(source), ns)  # noqa: S102
        func = ns.get(func_name)
        if not callable(func):
            return jsonify({"error": f"'{func_name}' not callable"}), 400
        return jsonify(empirical_benchmark(func, sizes, generator))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@viz_bp.route("/api/functions", methods=["POST"])
def api_functions():
    """Per-function array only (lighter payload)."""
    body   = request.get_json(force=True, silent=True) or {}
    source = body.get("source", "").strip()
    if not source:
        return jsonify([])
    try:
        return jsonify(analyze_source(source).get("functions", []))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
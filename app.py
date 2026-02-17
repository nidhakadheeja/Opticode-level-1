from flask import Flask, render_template, request, jsonify
import os
import ast
from dotenv import load_dotenv
from analysis.complexity import analyze_code_complexity


# -----------------------------
# LOAD ENV VARIABLES FIRST
# -----------------------------
load_dotenv()
print("GROQ KEY LOADED:", os.getenv("GROQ_API_KEY"))

app = Flask(__name__)

# -----------------------------
# IMPORT OPTIMIZERS
# -----------------------------
from optimizer.rule_optimizer import run_rule_optimizer
from optimizer.llm_optimizer import optimize_with_groq, parse_llm_response


# -----------------------------
# HOME
# -----------------------------
@app.route("/")
def index():
    return render_template("index.html")


# -----------------------------
# LEVEL 1 OPTIMIZATION
# -----------------------------
@app.route("/optimize/level1", methods=["POST"])
def optimize_level1():
    data = request.get_json()
    code = data.get("code", "")

    if not code.strip():
        return jsonify({"error": "No code provided"}), 400

    try:
        # BEFORE
        original_complexity = analyze_code_complexity(code)

        # OPTIMIZE
        optimized_code, explanations = run_rule_optimizer(code)

        # AFTER
        optimized_complexity = analyze_code_complexity(optimized_code)

        return jsonify({
            "optimized_code": optimized_code,
            "explanation": "\n".join(explanations),
            "complexity_before": original_complexity,
            "complexity_after": optimized_complexity
        })

    except Exception as e:
        return jsonify({
            "optimized_code": "",
            "explanation": f"Level 1 optimization failed: {str(e)}",
            "complexity_before": "N/A",
            "complexity_after": "N/A"
        })



# -----------------------------
# LEVEL 2 OPTIMIZATION (LLM)
# -----------------------------
@app.route("/optimize/level2", methods=["POST"])
def optimize_level2():
    data = request.get_json()
    code = data.get("code", "")

    if not code.strip():
        return jsonify({"error": "No code provided"}), 400

    # Syntax safety
    try:
        ast.parse(code)
    except SyntaxError as e:
        return jsonify({
            "optimized_code": "",
            "explanation": f"Syntax Error: {str(e)}",
            "complexity_before": "N/A",
            "complexity_after": "N/A"
        })

    try:
        # BEFORE
        original_complexity = analyze_code_complexity(code)

        # OPTIMIZE USING LLM
        llm_output = optimize_with_groq(code)
        optimized_code, explanation_list = parse_llm_response(llm_output)

        # AFTER
        optimized_complexity = analyze_code_complexity(optimized_code)

        return jsonify({
            "optimized_code": optimized_code,
            "explanation": "\n".join(explanation_list),
            "complexity_before": original_complexity,
            "complexity_after": optimized_complexity
        })

    except Exception as e:
        return jsonify({
            "optimized_code": "",
            "explanation": f"Level 2 optimization failed: {str(e)}",
            "complexity_before": "N/A",
            "complexity_after": "N/A"
        })

@app.route("/complexity", methods=["POST"])
def complexity():
    data = request.get_json()
    code = data.get("code", "")

    if not code.strip():
        return jsonify({"error": "No code provided"}), 400

    try:
        result = analyze_code_complexity(code)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# -----------------------------
# RUN
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)
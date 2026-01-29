from flask import Flask, render_template, request, jsonify
from optimizer.rule_optimizer import optimize_code

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/optimize", methods=["POST"])
def optimize():
    data = request.get_json()

    if not data or "code" not in data:
        return jsonify({"error": "No code provided"}), 400

    source_code = data["code"]

    try:
        optimized_code, explanations = optimize_code(source_code)

        return jsonify({
            "optimized_code": optimized_code,
            "explanations": explanations
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(debug=True)

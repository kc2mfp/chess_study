from flask import Flask, render_template, request, jsonify, abort
import os
from datetime import datetime

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUZZEL_DIR = os.path.join(BASE_DIR, 'puzzels')
os.makedirs(PUZZEL_DIR, exist_ok=True)

@app.route("/")
def home():
    return render_template("home.html")

@app.route('/submit')
def submit():
    # reuse the existing board UI for submitting puzzles
    return render_template("index.html")

@app.route('/solve')
def solve():
    # reuse the existing board UI for solving puzzles
    return render_template("index.html")

@app.route('/save_pgn', methods=['POST'])
def save_pgn():
    if not request.is_json:
        return abort(400, 'Expected application/json')
    data = request.get_json()
    pgn = data.get('pgn') if data else None
    if not pgn or not isinstance(pgn, str) or pgn.strip() == '':
        return abort(400, 'Empty pgn')

    # create a safe unique filename
    ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S%f')
    filename = f'pgn_{ts}.pgn'
    path = os.path.join(PUZZEL_DIR, filename)
    try:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(pgn)
    except Exception as e:
        return abort(500, f'Failed to save: {e}')

    return jsonify({'filename': filename})


@app.route('/save_puzzle', methods=['POST'])
def save_puzzle():
    if not request.is_json:
        return abort(400, 'Expected application/json')
    data = request.get_json()
    pgn = data.get('pgn') if data else None
    solution = data.get('solution') if data else ''
    if not pgn or not isinstance(pgn, str) or pgn.strip() == '':
        return abort(400, 'Empty pgn')

    ts = datetime.utcnow().strftime('%Y%m%dT%H%M%S%f')
    filename = f'puzzle_{ts}.json'
    path = os.path.join(PUZZEL_DIR, filename)
    try:
        with open(path, 'w', encoding='utf-8') as f:
            import json
            json.dump({'pgn': pgn, 'solution': solution}, f, ensure_ascii=False, indent=2)
    except Exception as e:
        return abort(500, f'Failed to save: {e}')

    return jsonify({'filename': filename})


@app.route('/random_puzzle', methods=['GET'])
def random_puzzle():
    # list puzzle_*.json files in PUZZEL_DIR
    try:
        files = [f for f in os.listdir(PUZZEL_DIR) if f.startswith('puzzle_') and f.endswith('.json')]
    except Exception as e:
        return abort(500, f'Failed to list puzzles: {e}')
    if not files:
        return jsonify({})
    import random, json
    chosen = random.choice(files)
    path = os.path.join(PUZZEL_DIR, chosen)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        return abort(500, f'Failed to read puzzle: {e}')
    return jsonify(data)


if __name__ == "__main__":
    # For local development; in production use a proper WSGI server
    app.run(host="0.0.0.0", port=5000, debug=True)
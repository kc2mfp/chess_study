```markdown
# chess_study

A small Flask web app that shows an interactive chessboard using chessboard.js and chess.js.

Quick start:

1. Create a virtual environment:
   python3 -m venv venv
   source venv/bin/activate   # macOS / Linux
   venv\Scripts\activate      # Windows

2. Install requirements:
   pip install -r requirements.txt

3. Run the app:
   python app.py

4. Open http://localhost:5000 in your browser.

Notes:
- The frontend uses CDN versions of chessboard.js and chess.js to keep the project simple.
- For production deployments, use a WSGI server (gunicorn/uvicorn) and configure appropriately.
```
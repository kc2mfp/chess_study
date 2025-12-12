// board.js - renders an 8x8 board, integrates with chess.js, supports click-to-move.

(function() {
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const resetBtn = document.getElementById('resetBtn');

  // new elements for PGN input
  const pgnInput = document.getElementById('pgnInput');
  const checkPgnBtn = document.getElementById('checkPgnBtn');
  const savePgnBtn = document.getElementById('savePgnBtn');
  const randomPgnBtn = document.getElementById('randomPgnBtn');
  const solutionInput = document.getElementById('solutionInput');

  // chess.js game state
  const game = new Chess();

  // map chess.js piece codes to Unicode glyphs
  const UNICODE_PIECES = {
    'p': '♟',
    'r': '♜',
    'n': '♞',
    'b': '♝',
    'q': '♛',
    'k': '♚',
    'P': '♙',
    'R': '♖',
    'N': '♘',
    'B': '♗',
    'Q': '♕',
    'K': '♔'
  };

  // generate coordinates a8..h1 (rank 8 to 1)
  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = [8,7,6,5,4,3,2,1];
  const squares = [];
  ranks.forEach(rank => {
    files.forEach(file => squares.push(`${file}${rank}`));
  });

  let selectedSquare = null;
  let legalMovesFromSelected = [];

  function createBoardGrid() {
    // clear
    boardEl.innerHTML = '';
    // create squares in order a8..h1 so grid flows correctly
    squares.forEach((sq, idx) => {
      const squareEl = document.createElement('div');
      squareEl.classList.add('square');

      // determine light/dark: using classic chess coloring rule
      const fileIndex = files.indexOf(sq[0]);
      const rankIndex = parseInt(sq[1], 10);
      // if sum even -> dark (so a8 dark), adjust if needed
      const isLight = ((fileIndex + rankIndex) % 2 === 0);
      squareEl.classList.add(isLight ? 'light' : 'dark');

      squareEl.dataset.square = sq;
      squareEl.role = 'gridcell';

      // coord label (show file/rank on edges for clarity)
      const coord = document.createElement('div');
      coord.className = 'coord';
      coord.textContent = sq;
      squareEl.appendChild(coord);

      squareEl.addEventListener('click', onSquareClick);
      boardEl.appendChild(squareEl);
    });
  }

  function renderPieces() {
    // place pieces according to game.board() or fen
    const boardState = game.board(); // returns array [rank8,...,rank1], each rank array file a..h
    // iterate ranks 8->1, files a->h to match our squares array
    let i = 0;
    for (let r = 0; r < boardState.length; r++) {
      for (let f = 0; f < boardState[r].length; f++) {
        const piece = boardState[r][f]; // null or {type, color}
        const square = squares[i];
        const squareEl = boardEl.querySelector(`[data-square="${square}"]`);

        // remove existing piece text nodes (but keep coord)
        // remove any text nodes that are direct children and not .coord
        Array.from(squareEl.childNodes).forEach(node => {
          if (!node.classList || node.className !== 'coord') {
            squareEl.removeChild(node);
          }
        });

        if (piece) {
          const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
          const glyph = UNICODE_PIECES[key];
          const pieceEl = document.createElement('div');
          pieceEl.className = 'piece';
          pieceEl.textContent = glyph;
          pieceEl.style.pointerEvents = 'none'; // let clicks flow to square element
          squareEl.insertBefore(pieceEl, squareEl.firstChild);
        }
        i++;
      }
    }
    updateStatus();
  }

  function updateStatus() {
    if (game.in_checkmate()) {
      statusEl.textContent = `Checkmate — ${game.turn() === 'w' ? 'Black' : 'White'} wins`;
    } else if (game.in_stalemate()) {
      statusEl.textContent = 'Stalemate';
    } else if (game.in_check()) {
      statusEl.textContent = `In check — ${game.turn() === 'w' ? 'White' : 'Black'} to move`;
    } else {
      statusEl.textContent = `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
    }
  }

  function clearHighlights() {
    boardEl.querySelectorAll('.square').forEach(sq => {
      sq.classList.remove('selected', 'legal');
    });
    selectedSquare = null;
    legalMovesFromSelected = [];
  }

  function onSquareClick(e) {
    const sq = e.currentTarget.dataset.square;

    // if nothing selected: if clicked square has a piece of side to move -> select and highlight
    const piece = game.get(sq);
    if (!selectedSquare) {
      if (piece && piece.color === game.turn()) {
        selectedSquare = sq;
        highlightSelectionAndMoves(sq);
      }
      // if clicking empty or opponent piece while nothing selected => ignore
      return;
    }

    // if clicked same square as selected -> deselect
    if (sq === selectedSquare) {
      clearHighlights();
      return;
    }

    // if clicked a different square:
    // if clicked a friendly piece -> change selection
    if (game.get(sq) && game.get(sq).color === game.turn()) {
      selectedSquare = sq;
      highlightSelectionAndMoves(sq);
      return;
    }

    // else attempt to move from selectedSquare -> sq
    const move = game.move({ from: selectedSquare, to: sq, promotion: 'q' });
    if (move === null) {
      // illegal move — just clear selection
      // but keep selection if clicked a legal target? we already checked legal moves below, so ignore
      // provide a brief feedback by flashing the square
      flashIllegalMove(sq);
      return;
    }

    // legal move: update board and clear selection
    clearHighlights();
    renderPieces();
  }

  function highlightSelectionAndMoves(sq) {
    clearHighlights();
    const squareEl = boardEl.querySelector(`[data-square="${sq}"]`);
    if (squareEl) squareEl.classList.add('selected');

    // get legal moves from chess.js
    const moves = game.moves({ square: sq, verbose: true });
    legalMovesFromSelected = moves.map(m => m.to);
    legalMovesFromSelected.forEach(mv => {
      const el = boardEl.querySelector(`[data-square="${mv}"]`);
      if (el) el.classList.add('legal');
    });
  }

  function flashIllegalMove(sq) {
    const el = boardEl.querySelector(`[data-square="${sq}"]`);
    if (!el) return;
    const orig = el.style.outline;
    el.style.outline = '3px solid rgba(200,20,20,0.9)';
    setTimeout(() => el.style.outline = orig, 300);
  }

  // parse PGN text and attempt to find a [CurrentPosition "FEN"] tag
  function extractFENFromPGN(pgnText) {
    if (!pgnText) return null;
    // simple regex to capture CurrentPosition tag value or FEN-like tag
    const reTag = /\[CurrentPosition\s+"([^"]+)"\]/i;
    const m = pgnText.match(reTag);
    if (m && m[1]) return m[1].trim();

    // fallback: try to find a FEN line directly (6 space-separated fields)
    const fenLike = pgnText.split(/\r?\n/).map(l => l.trim()).find(l => {
      // a FEN contains slashes and spaces and has 6 space-separated parts
      return l.indexOf('/') !== -1 && l.split(/\s+/).length >= 6;
    });
    if (fenLike) return fenLike;
    return null;
  }

  // parse moves section from PGN text (remove tags/comments/NAGs and return SAN move tokens)
  function extractMovesFromPGN(pgnText) {
    if (!pgnText) return [];
    // remove tag pairs [ ... ]
    let body = pgnText.replace(/\[.*?\]\r?\n?/gs, ' ');
    // remove brace comments { ... }
    body = body.replace(/\{[^}]*\}/g, ' ');
    // remove parenthesis variations (e.g. alternate lines)
    body = body.replace(/\([^)]*\)/g, ' ');
    // remove NAGs like $4
    body = body.replace(/\$\d+/g, ' ');
    // remove move numbers like 1. or 1... (numbers followed by dots)
    body = body.replace(/\d+\.{1,3}/g, ' ');
    // remove results and stray asterisks
    body = body.replace(/1-0|0-1|1\/2-1\/2|\*/g, ' ');
    // collapse whitespace
    const tokens = body.split(/[\s\n\r]+/).map(t => t.trim()).filter(Boolean);

    const cleaned = [];
    tokens.forEach(tok => {
      // strip trailing annotation chars like + # ! ? =
      let t = tok.replace(/[!?+#=]+$/g, '');
      // ignore purely numeric tokens or tokens that look like move remnants (eg "..." or ".")
      if (/^\d+$/.test(t)) return;
      // ignore tokens that are unlikely moves (contain '=' only or weird chars)
      if (!/[a-zA-Z0-9O]/.test(t)) return;
      cleaned.push(t);
    });

    return cleaned;
  }

  // Check PGN button uses the same logic as previous loader to set the board
  if (checkPgnBtn) {
    checkPgnBtn.addEventListener('click', () => {
      // reuse the existing click handler logic by calling an internal function
      handleLoadPgn();
    });
  }

  // Save PGN: POST to server to persist in puzzels/ directory
  if (savePgnBtn) {
    savePgnBtn.addEventListener('click', async () => {
      const pgnText = pgnInput ? pgnInput.value : '';
      const solutionText = solutionInput ? solutionInput.value : '';
      if (!pgnText || pgnText.trim().length === 0) {
        alert('Cannot save empty PGN.');
        return;
      }

      try {
        const resp = await fetch('/save_puzzle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pgn: pgnText, solution: solutionText })
        });
        if (!resp.ok) {
          const text = await resp.text();
          alert('Save failed: ' + text);
          return;
        }
        const data = await resp.json();
        alert('Saved puzzle as: ' + data.filename);
      } catch (err) {
        alert('Save request failed: ' + err.message);
      }
    });
  }

  // Random puzzle fetch
  if (randomPgnBtn) {
    randomPgnBtn.addEventListener('click', async () => {
      try {
        const resp = await fetch('/random_puzzle');
        if (!resp.ok) { alert('Failed to fetch random puzzle'); return; }
        const data = await resp.json();
        if (data && data.pgn) {
          if (pgnInput) pgnInput.value = data.pgn;
          if (solutionInput) solutionInput.value = data.solution || '';
          handleLoadPgn();
        } else {
          alert('No puzzle received');
        }
      } catch (err) {
        alert('Request failed: ' + err.message);
      }
    });
  }

  // reset control
  resetBtn.addEventListener('click', () => {
    game.reset();
    clearHighlights();
    renderPieces();
  });

  // Extracted loader function so Check button can reuse it
  function handleLoadPgn() {
    const pgnText = pgnInput ? pgnInput.value : '';

    // First: try to extract and play the move list from the PGN
    const moves = extractMovesFromPGN(pgnText);
    if (moves && moves.length > 0) {
      game.reset();
      let failed = false;
      for (const san of moves) {
        let mv = null;
        try { mv = game.move(san); } catch (e) { mv = null; }
        if (mv === null && typeof game.move === 'function') {
          try { mv = game.move({ san: san }); } catch (e) { mv = null; }
        }
        if (mv === null) { failed = true; break; }
      }
      if (!failed) { clearHighlights(); renderPieces(); return; }
      // if failed, fall through to try CurrentPosition FEN
    }

    // Fallback: try to extract a FEN from [CurrentPosition] tag or a FEN-like line
    const fen = extractFENFromPGN(pgnText);
    if (!fen) { alert('No moves or [CurrentPosition] FEN found in PGN text.'); return; }

    const ok = game.load(fen);
    if (!ok) {
      const parts = fen.split(/\s+/);
      if (parts.length === 1) {
        const withDefaults = fen + ' w - - 0 1';
        if (!game.load(withDefaults)) { alert('Failed to load FEN from PGN.'); return; }
      } else if (parts.length === 2) {
        const withDefaults = fen + ' - - 0 1';
        if (!game.load(withDefaults)) { alert('Failed to load FEN from PGN.'); return; }
      } else if (parts.length === 4) {
        const withDefaults = fen + ' 0 1';
        if (!game.load(withDefaults)) { alert('Failed to load FEN from PGN.'); return; }
      } else { alert('Failed to load FEN from PGN.'); return; }
    }

    clearHighlights();
    renderPieces();
  }

  // init
  createBoardGrid();
  renderPieces();

  // Expose for debugging (optional)
  window._chess_game = game;
})();
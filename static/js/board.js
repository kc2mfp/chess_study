// board.js - renders an 8x8 board, integrates with chess.js, supports click-to-move.

(function() {
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const resetBtn = document.getElementById('resetBtn');

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

  // reset control
  resetBtn.addEventListener('click', () => {
    game.reset();
    clearHighlights();
    renderPieces();
  });

  // init
  createBoardGrid();
  renderPieces();

  // Expose for debugging (optional)
  window._chess_game = game;
})();
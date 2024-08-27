// WebSocket connection to the server
const socket = new WebSocket('ws://localhost:8080');

let selectedCharacter = null;
let currentTurn = 'player1';
let moveHistory = [];

// Load sound effects
const moveSound = new Audio('move-sound.mp3'); // Ensure this file is in the project directory

// WebSocket event handlers
socket.onopen = () => {
    console.log('Connected to server');
    socket.send(JSON.stringify({ type: 'init', player: currentTurn }));
};

socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleServerMessage(message);
};

socket.onerror = (error) => {
    console.error('WebSocket Error: ', error);
};

socket.onclose = () => {
    console.log('Disconnected from server');
};

// Handle server messages
function handleServerMessage(message) {
    if (message.type === 'gameState') {
        updateGameBoard(message.state);
        updateTurnIndicator(message.state.turn);
        updateMoveHistory(message.state.moves);
    } else if (message.type === 'invalidMove') {
        alert(`Invalid move: ${message.reason}`);
    } else if (message.type === 'gameOver') {
        showGameOverScreen(message.winner);
    }
}

// Update game board
function updateGameBoard(state) {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = ''; // Clear current board

    for (let row = 0; row < state.board.length; row++) {
        for (let col = 0; col < state.board[row].length; col++) {
            const cell = document.createElement('div');
            const piece = state.board[row][col];
            if (piece) {
                cell.className = piece.player; // Add class for player
                cell.innerText = piece.type; // Display piece type (e.g., P1, H1, etc.)
                cell.onclick = () => selectCharacter(piece, row, col); // Add click handler
            }
            gameBoard.appendChild(cell);
        }
    }

    // Highlight last move
    if (state.lastMove) {
        const fromIndex = state.lastMove.from.row * 5 + state.lastMove.from.col;
        const toIndex = state.lastMove.to.row * 5 + state.lastMove.to.col;
        gameBoard.children[fromIndex].classList.add('highlight-last-move');
        gameBoard.children[toIndex].classList.add('highlight-last-move');
    }
}

// Handle character selection
function selectCharacter(piece, row, col) {
    if (piece.player !== currentTurn) {
        alert("It's not your turn or you selected the opponent's character.");
        return;
    }

    selectedCharacter = { piece, row, col };
    highlightSelectedCharacter(row, col);
    showValidMoves(piece);

    // Display piece details
    const pieceDetailsDiv = document.getElementById('piece-details');
    pieceDetailsDiv.innerHTML = `Selected Piece: ${piece.type} (Player: ${piece.player})<br>Valid Moves: ${getValidMoves(piece).join(', ')}`;
}

// Highlight selected character
function highlightSelectedCharacter(row, col) {
    const gameBoard = document.getElementById('game-board');
    const cells = gameBoard.children;
    for (let i = 0; i < cells.length; i++) {
        cells[i].classList.remove('selected');
    }
    cells[row * 5 + col].classList.add('selected');
}

// Display valid moves
function showValidMoves(piece) {
    const validMovesDiv = document.getElementById('valid-moves');
    validMovesDiv.innerHTML = ''; // Clear previous moves

    const moves = getValidMoves(piece); // Assume this function calculates valid moves
    moves.forEach(move => {
        const button = document.createElement('button');
        button.innerText = move;
        button.onclick = () => sendMove(move);
        validMovesDiv.appendChild(button);
    });
}

// Calculate valid moves (placeholder logic)
function getValidMoves(piece) {
    // Logic to calculate valid moves based on piece type and position
    if (piece.type === 'P') {
        return ['L', 'R', 'F', 'B'];
    } else if (piece.type === 'H1') {
        return ['L', 'R', 'F', 'B'];
    } else if (piece.type === 'H2') {
        return ['FL', 'FR', 'BL', 'BR'];
    } else if (piece.type === 'H3') {
        return ['FL', 'FR', 'BL', 'BR', 'RF', 'RB', 'LF', 'LB'];
    }
    return [];
}

// Send move to the server
function sendMove(move) {
    if (!selectedCharacter) return;

    const moveData = {
        type: 'move',
        player: currentTurn,
        piece: selectedCharacter.piece,
        move: move
    };

    socket.send(JSON.stringify(moveData));
    selectedCharacter = null; // Clear selected character
    document.getElementById('valid-moves').innerHTML = ''; // Clear valid moves

    moveSound.play(); // Play move sound
}

// Update turn indicator
function updateTurnIndicator(turn) {
    currentTurn = turn;
    document.getElementById('current-turn').innerText = `Current Turn: ${turn}`;
    startTurnTimer(); // Start the timer when turn changes
}

// Show game over screen
function showGameOverScreen(winner) {
    const gameOverMessage = document.getElementById('game-over-message');
    gameOverMessage.style.display = 'block';
    document.getElementById('winner').innerText = winner;
    document.getElementById('restart-game').style.display = 'block';
}

// Undo last move
document.getElementById('undo-move').addEventListener('click', () => {
    if (moveHistory.length > 0) {
        const lastMove = moveHistory.pop();
        socket.send(JSON.stringify({ type: 'undo', move: lastMove }));
        updateMoveHistory(moveHistory); // Update the move log UI
    } else {
        alert("No move to undo!");
    }
});

// Start a new game
document.getElementById('restart-game').addEventListener('click', () => {
    socket.send(JSON.stringify({ type: 'restart' }));
    location.reload(); // Reload the page to start a new game
});

// Update move history log
function updateMoveHistory(moves) {
    const moveLog = document.getElementById('move-log');
    moveLog.innerHTML = ''; // Clear existing log

    moves.forEach(move => {
        const li = document.createElement('li');
        li.innerText = `Player ${move.player} moved ${move.piece.type} to ${move.move}`;
        moveLog.appendChild(li);
    });
}

// Timer setup
let turnTimeLeft = 30; // 30 seconds for each turn
let turnTimer;

function startTurnTimer() {
    clearInterval(turnTimer);
    turnTimeLeft = 30; // Reset timer for new turn
    document.getElementById('time-left').innerText = turnTimeLeft;
    turnTimer = setInterval(() => {
        turnTimeLeft--;
        document.getElementById('time-left').innerText = turnTimeLeft;
        if (turnTimeLeft <= 0) {
            clearInterval(turnTimer);
            alert(`Time's up for ${currentTurn}!`);
            switchTurns(); // Automatically switch turns if time runs out
        }
    }, 1000);
}

// Switch turns
function switchTurns() {
    currentTurn = currentTurn === 'player1' ? 'player2' : 'player1';
    updateTurnIndicator(currentTurn);
    startTurnTimer(); // Restart timer for new turn
}

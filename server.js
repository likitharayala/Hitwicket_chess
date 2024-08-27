const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let gameState = {
    board: Array(5).fill().map(() => Array(5).fill(null)),
    players: {
        player1: { pieces: [], name: 'A' },
        player2: { pieces: [], name: 'B' },
    },
    turn: 'player1',
    moves: []
};

const spectators = new Set();

// Function to initialize the game with dynamic setup for players
function initializeGame(player1Setup, player2Setup) {
    gameState.players.player1.pieces = setupPieces(player1Setup, 'player1');
    gameState.players.player2.pieces = setupPieces(player2Setup, 'player2');
    updateBoard();
    gameState.moves = []; // Clear move history on new game
}

// Helper function to setup pieces based on player input
function setupPieces(setup, player) {
    return setup.map((type, index) => ({
        type: type,
        row: player === 'player1' ? 0 : 4,
        col: index
    }));
}

// Function to update the game board with current piece positions
function updateBoard() {
    gameState.board = Array(5).fill().map(() => Array(5).fill(null));
    Object.keys(gameState.players).forEach(player => {
        gameState.players[player].pieces.forEach(piece => {
            gameState.board[piece.row][piece.col] = { player, type: piece.type };
        });
    });
}

// Check if coordinates are within the 5x5 grid
function isWithinBounds(row, col) {
    return row >= 0 && row < 5 && col >= 0 && col < 5;
}

// Validate and execute a move
function handleMove(player, pieceType, move) {
    const playerPieces = gameState.players[player].pieces;
    const piece = playerPieces.find(p => p.type === pieceType);

    // Debugging information
    if (!piece) {
        console.log(`Invalid move: Piece type ${pieceType} not found for player ${player}`);
        return { valid: false, reason: "Invalid piece" };
    }

    let targetRow = piece.row;
    let targetCol = piece.col;

    // Determine the target position based on move command
    switch (pieceType) {
        case 'P': // Pawn
            switch (move) {
                case 'L': targetCol -= 1; break;
                case 'R': targetCol += 1; break;
                case 'F': targetRow += player === 'player1' ? 1 : -1; break;
                case 'B': targetRow += player === 'player1' ? -1 : 1; break;
                default: return { valid: false, reason: "Invalid move for Pawn" };
            }
            break;
        case 'H1': // Hero1
            switch (move) {
                case 'L': targetCol -= 2; break;
                case 'R': targetCol += 2; break;
                case 'F': targetRow += player === 'player1' ? 2 : -2; break;
                case 'B': targetRow += player === 'player1' ? -2 : 2; break;
                default: return { valid: false, reason: "Invalid move for Hero1" };
            }
            break;
        case 'H2': // Hero2
            switch (move) {
                case 'FL': targetRow += player === 'player1' ? 2 : -2; targetCol -= 2; break;
                case 'FR': targetRow += player === 'player1' ? 2 : -2; targetCol += 2; break;
                case 'BL': targetRow += player === 'player1' ? -2 : 2; targetCol -= 2; break;
                case 'BR': targetRow += player === 'player1' ? -2 : 2; targetCol += 2; break;
                default: return { valid: false, reason: "Invalid move for Hero2" };
            }
            break;
        case 'H3': // Hero3
            switch (move) {
                case 'FL': targetRow += player === 'player1' ? 2 : -2; targetCol -= 1; break;
                case 'FR': targetRow += player === 'player1' ? 2 : -2; targetCol += 1; break;
                case 'BL': targetRow += player === 'player1' ? -2 : 2; targetCol -= 1; break;
                case 'BR': targetRow += player === 'player1' ? -2 : 2; targetCol += 1; break;
                case 'RF': targetRow += player === 'player1' ? 1 : -1; targetCol += 2; break;
                case 'RB': targetRow += player === 'player1' ? -1 : 1; targetCol += 2; break;
                case 'LF': targetRow += player === 'player1' ? 1 : -1; targetCol -= 2; break;
                case 'LB': targetRow += player === 'player1' ? -1 : 1; targetCol -= 2; break;
                default: return { valid: false, reason: "Invalid move for Hero3" };
            }
            break;
        default:
            return { valid: false, reason: "Unknown character type" };
    }

    // Validate the move
    if (!isWithinBounds(targetRow, targetCol)) {
        return { valid: false, reason: "Move out of bounds" };
    }

    const targetPiece = gameState.board[targetRow][targetCol];
    if (targetPiece) {
        if (targetPiece.player === player) {
            return { valid: false, reason: "Cannot capture own piece" };
        } else {
            // Capture opponent's piece
            gameState.players[targetPiece.player].pieces = gameState.players[targetPiece.player].pieces.filter(p => !(p.row === targetRow && p.col === targetCol));
        }
    }

    // Update piece position
    piece.row = targetRow;
    piece.col = targetCol;
    updateBoard();

    // Add move to history
    gameState.moves.push({ player, pieceType, move, row: targetRow, col: targetCol });

    // Check if the game is over
    const opponent = player === 'player1' ? 'player2' : 'player1';
    if (gameState.players[opponent].pieces.length === 0) {
        return { valid: true, gameOver: true, winner: player };
    }

    return { valid: true };
}

// WebSocket server logic
wss.on('connection', (ws) => {
    // Spectator mode check
    if (ws.url === '/spectator') {
        spectators.add(ws);
        ws.send(JSON.stringify({ type: 'gameState', state: gameState }));
        ws.on('close', () => {
            spectators.delete(ws);
        });
        return;
    }

    // Player mode
    ws.send(JSON.stringify({ type: 'gameState', state: gameState }));

    ws.on('message', (message) => {
        const msg = JSON.parse(message);

        if (msg.type === 'move' && msg.player === gameState.turn) {
            const result = handleMove(msg.player, msg.piece, msg.move);
            if (result.valid) {
                gameState.turn = gameState.turn === 'player1' ? 'player2' : 'player1';
                broadcastToPlayers({
                    type: 'gameState',
                    state: gameState
                });
                broadcastToSpectators({
                    type: 'gameState',
                    state: gameState
                });
                if (result.gameOver) {
                    broadcastToPlayers({
                        type: 'gameOver',
                        winner: result.winner
                    });
                    broadcastToSpectators({
                        type: 'gameOver',
                        winner: result.winner
                    });
                }
            } else {
                ws.send(JSON.stringify({ type: 'invalidMove', reason: result.reason }));
            }
        } else if (msg.type === 'restart') {
            initializeGame(
                msg.player1Setup || ['P', 'H1', 'H2', 'H3', 'P'],
                msg.player2Setup || ['P', 'H2', 'H1', 'H3', 'P']
            );
            broadcastToPlayers({ type: 'gameState', state: gameState });
            broadcastToSpectators({ type: 'gameState', state: gameState });
        } else if (msg.type === 'chat') {
            broadcastToPlayers({
                type: 'chat',
                player: msg.player,
                message: msg.message
            });
            broadcastToSpectators({
                type: 'chat',
                player: msg.player,
                message: msg.message
            });
        }
    });
});

function broadcastToPlayers(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client.url !== '/spectator') {
            client.send(JSON.stringify(message));
        }
    });
}

function broadcastToSpectators(message) {
    spectators.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Example initialization with default setup
initializeGame(
    ['P', 'H1', 'H2', 'H3', 'P'],
    ['P', 'H2', 'H1', 'H3', 'P']
);

console.log('WebSocket server started on ws://localhost:8080');

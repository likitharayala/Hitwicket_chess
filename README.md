Components
1. Server
Implement the game logic in any server-side language of your choice.
Set up a websocket server to handle real-time communication with clients.
Process game moves and maintain the game state.
2. Websocket Layer
Implement a websocket communication layer between the server and clients.
Handle events for game initialization, moves, and state updates.
3. Web Client
Create a web-based user interface to display the game board and controls.
Implement websocket communication with the server.
Render the game state and provide interactive controls for players.
Game Rules
Game Setup
The game is played between two players on a 5x5 grid.
Each player controls a team of 5 characters, which can include Pawns, Hero1, and Hero2.
Players arrange their characters on their respective starting rows at the beginning of the game.

Characters and Movement
There are three types of characters available:
 1. Pawn:
Moves one block in any direction (Left, Right, Forward, or Backward).
Move commands: L (Left), R (Right), F (Forward), B (Backward)
2. Hero1:
Moves two blocks straight in any direction.
Kills any opponent's character in its path.
Move commands: L (Left), R (Right), F (Forward), B (Backward)
3. Hero2:
Moves two blocks diagonally in any direction.
Kills any opponent's character in its path.
Move commands: FL (Forward-Left), FR (Forward-Right), BL (Backward-Left), BR (Backward-Right)
All moves are relative to the player's perspective.
Move command format:
For Pawn and Hero1: <character_name>:<move> (e.g., P1:L, H1:F)
For Hero2: <character_name>:<move> (e.g., H2:FL, H2:BR)
Game Flow
Initial Setup:
Players deploy all 5 characters on their starting row in any order.
Character positions are input as a list of character names, placed from left to right.
Players can choose any combination of Pawns, Hero1, and Hero2 for their team.

Turns:
Players alternate turns, making one move per turn.
Combat:
If a character moves to a space occupied by an opponent's character, the opponent's character is removed from the game.
For Hero1 and Hero2, any opponent's character in their path is removed, not just the final destination.
Invalid Moves:
Moves are considered invalid if: a. The specified character doesn't exist. b. The move would take the character out of bounds. c. The move is not valid for the given character type. d. The move targets a friendly character.
Players must retry their turn if they input an invalid move.
Game State Display:
After each turn, the 5x5 grid is displayed with all character positions.
Character names are prefixed with the player's identifier and character type (e.g., A-P1, B-H1, A-H2).

Winning the Game:
The game ends when one player eliminates all of their opponent's characters.
The winning player is announced, and players can choose to start a new game.


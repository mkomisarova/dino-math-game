# Math Practice Game

A fun math practice game with real-time leaderboards powered by Firebase Firestore.

## Features

- Multiple game modes: Addition, Subtraction, Multiplication, Division, Mixed
- Two game types: Mini Version and Level Mode
- Real-time leaderboards
- Personal best score tracking
- Firebase integration for persistent data

## Setup Instructions

### 1. Firebase Configuration

The game is already configured to use Firebase Firestore. Make sure your Firebase project is set up with the correct configuration in `firebase-config.js`.

### 2. Required Firestore Indexes

**IMPORTANT:** Before the game will work properly, you must create the required Firestore indexes in Firebase Console.

See [FIREBASE_INDEXES.md](./FIREBASE_INDEXES.md) for detailed instructions on creating the required indexes.

**Quick Setup:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `dino-math-game`
3. Go to Firestore → Indexes
4. Create these two indexes:

   **Index 1:**
   - Collection: `scores`
   - Fields: `mode` (Ascending), `score` (Descending)

   **Index 2:**
   - Collection: `scores`
   - Fields: `username` (Ascending), `mode` (Ascending), `type` (Ascending)

### 3. Running the Game

1. Start a local server:
   ```bash
   python3 -m http.server 8000
   ```

2. Open your browser and go to:
   ```
   http://localhost:8000
   ```

3. Enter a username and start playing!

## Game Modes

- **Addition**: Practice addition problems
- **Subtraction**: Practice subtraction problems  
- **Multiplication**: Practice multiplication problems
- **Division**: Practice division problems
- **Mixed**: Random mix of all operations

## Game Types

- **Mini Version**: Quick 15-second games
- **Level Mode**: Progressive difficulty with multiple levels

## Troubleshooting

### "The query requires an index" Error

This means the required Firestore indexes haven't been created yet. Follow the instructions in [FIREBASE_INDEXES.md](./FIREBASE_INDEXES.md) to create the necessary indexes.

### Leaderboard Not Loading

1. Check that the Firestore indexes are created and enabled
2. Open browser developer tools and check for console errors
3. Verify Firebase configuration is correct

### Login Issues

1. Check browser console for detailed error messages
2. Verify Firebase project configuration
3. Ensure Firestore rules allow read/write access

## Technical Details

- Built with vanilla JavaScript (ES6 modules)
- Uses Firebase Firestore for data persistence
- Real-time leaderboard updates with Firestore listeners
- Modular architecture with separate files for different concerns

## File Structure

- `index.html` - Main HTML structure
- `style.css` - Game styling
- `main.js` - Core game logic
- `user.js` - User management and login
- `ui.js` - User interface management
- `leaderboard.js` - Leaderboard functionality
- `firebase-config.js` - Firebase configuration
- `user-service.js` - Firebase user operations
- `score-service.js` - Firebase score operations

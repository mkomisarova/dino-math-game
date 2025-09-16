// Main game logic module
import { db, collection, getDocs, query, where, orderBy, limit, setDoc, getDoc, doc, onSnapshot } from "./firebase-config.js";
import { UserManager } from "./user.js";
import { UIManager } from "./ui.js";
import { LeaderboardManager } from "./leaderboard.js";
import { saveGlobalScore, getUserBestScore, getLeaderboard, subscribeToLeaderboard } from "./score-service.js";
import { getActiveUsername } from './user-service.js';

// Test that the import is working
console.log('✅ main.js loaded, getActiveUsername imported:', typeof getActiveUsername);

/*
 * FIREBASE FIRESTORE INDEX REQUIREMENTS
 * =====================================
 * 
 * This application requires the following composite indexes to be created in Firebase Console:
 * 
 * 1. Leaderboard Query Index:
 *    - Collection: scores
 *    - Fields: mode (Ascending), score (Descending)
 *    - Used by: fetchLeaderboard(), listenToLeaderboard()
 * 
 * 2. User Best Score Query Index:
 *    - Collection: scores
 *    - Fields: username (Ascending), mode (Ascending), type (Ascending)
 *    - Used by: getUserBestScore()
 * 
 * To create these indexes:
 * 1. Go to Firebase Console → Firestore → Indexes
 * 2. Click "Create Index"
 * 3. Select the "scores" collection
 * 4. Add the required fields in the specified order
 * 5. Set the sort order (Ascending/Descending) as specified above
 * 6. Click "Create"
 * 
 * The indexes will be built automatically and queries will work once complete.
 * You can monitor index creation progress in the Firebase Console.
 */

// Global game instance
let gameInstance = null;

// Function to initialize game with username - make it available globally
function initializeGame(username) {
    console.log('🟢 initializeGame called with username:', username);
    
    // Validate username
    if (!username || username.trim() === '') {
        console.error('❌ Invalid username provided to initializeGame:', username);
        return;
    }
    
    if (gameInstance) {
        console.log('🟢 Cleaning up existing game instance...');
        // Clean up existing game if any
        if (gameInstance.timer) {
            gameInstance.stopTimer();
        }
        // Clean up leaderboard listener
        gameInstance.cleanupLeaderboardListener();
        // Clear the old instance
        gameInstance = null;
    }
    
    console.log('🟢 Creating new MathPracticeGame instance...');
    gameInstance = new MathPracticeGame(username);
    console.log('🟢 Game instance created successfully with username:', gameInstance.username);
}

// Make initializeGame available globally
window.initializeGame = initializeGame;

class MathPracticeGame {
    constructor(username) {
        console.log('🟢 MathPracticeGame constructor called with username:', username);
        // Note: We don't store username in this.username anymore
        // All score saving will read from localStorage using getActiveUsername()
        this.score = 0;
        this.currentAnswer = 0;
        this.gameMode = 'multiplication'; // 'multiplication', 'addition', 'subtraction', 'division', or 'mixed'
        this.gameType = 'mini'; // 'mini' or 'level'
        this.currentLevel = 1;
        this.correctStreak = 0;
        this.medalStreak = 0; // Separate streak for medal progression
        this.medalLevel = 10; // Dinosaur medal starts at level 10
        this.timer = null;
        this.timeLeft = 15;
        this.questionStartTime = 0;
        // Accuracy tracking for level mode
        this.totalQuestions = 0;
        this.correctAnswers = 0;
        // Negative numbers toggle
        this.allowNegatives = false;
        this.selectedOperation = null;
        // Leaderboard listener
        this.leaderboardListener = null;
        
        // Game state flag to prevent race conditions
        this.gameFinished = false;
        
        // Initialize modules
        this.user = new UserManager();
        this.ui = new UIManager();
        this.leaderboard = new LeaderboardManager();
        
        // Set up module references
        this.user.game = this;
        this.ui.game = this;
        this.leaderboard.game = this;
        
        // Initialize everything
        this.initializeGame();
    }

    initializeGame() {
        console.log('🟢 MathPracticeGame.initializeGame() called');
        
        // Initialize UI elements
        console.log('🟢 Initializing UI elements...');
        this.ui.initializeElements();
        this.ui.attachEventListeners();
        
        // Initialize user elements
        console.log('🟢 Initializing user elements...');
        this.user.initializeUserElements();
        
        // Show main menu since we have a username
        console.log('🟢 Showing main menu...');
        this.ui.showMainMenu();
        console.log('🟢 Game initialization completed successfully');
    }

    selectOperation(operation) {
        // Clean up any existing leaderboard subscription
        this.leaderboard.cleanup();
        
        // Clean up leaderboard listener
        this.cleanupLeaderboardListener();
        
        this.ui.selectOperation(operation);
    }

    toggleNegatives() {
        this.allowNegatives = !this.allowNegatives;
        this.ui.negativeToggleBtn.textContent = this.allowNegatives ? 'Negative Numbers: ON' : 'Negative Numbers: OFF';
        
        // Update button color based on state
        if (this.allowNegatives) {
            this.ui.negativeToggleBtn.classList.add('on');
        } else {
            this.ui.negativeToggleBtn.classList.remove('on');
        }
    }

    applyNegativeProbability(num) {
        if (this.allowNegatives && Math.random() < 0.3) {
            return -num;
        }
        return num;
    }

    startGame(mode, type = 'mini') {
        this.gameMode = mode;
        this.gameType = type;
        this.score = 0;
        this.currentLevel = 1;
        this.correctStreak = 0;
        this.medalStreak = 0; // Reset medal streak
        this.medalLevel = type === 'mini' ? 5 : 10; // Mini mode starts at 5, level mode at 10
        // Reset accuracy tracking
        this.totalQuestions = 0;
        this.correctAnswers = 0;
        // Reset game state
        this.gameFinished = false;
        // Set timer based on game type
        this.timeLeft = type === 'level' ? 180 : 60; // 3 minutes for level mode, 1 minute for mini mode
        this.ui.updateScore();
        this.ui.updateModeDisplay();
        this.ui.updateLevelDisplay();
        this.ui.updateMedal();
        this.ui.showGameScreen();
        this.generateQuestion();
        this.startTimer();
        this.ui.answerInput.focus();
    }

    generateQuestion() {
        let num1, num2, operator, answer;
        let currentMode = this.gameMode;
        
        // For mixed mode, randomly select one of the four operation types
        if (currentMode === 'mixed') {
            const modes = ['multiplication', 'addition', 'subtraction', 'division'];
            currentMode = modes[Math.floor(Math.random() * modes.length)];
        }
        
        if (this.gameType === 'mini') {
            // Mini mode - original logic
            switch (currentMode) {
                case 'multiplication':
                    num1 = this.applyNegativeProbability(Math.floor(Math.random() * 10) + 1);
                    num2 = this.applyNegativeProbability(Math.floor(Math.random() * 10) + 1);
                    operator = '×';
                    answer = num1 * num2;
                    break;
                    
                case 'addition':
                    num1 = this.applyNegativeProbability(Math.floor(Math.random() * 50) + 1);
                    num2 = this.applyNegativeProbability(Math.floor(Math.random() * 50) + 1);
                    operator = '+';
                    answer = num1 + num2;
                    break;
                    
                case 'subtraction':
                    num1 = this.applyNegativeProbability(Math.floor(Math.random() * 100) + 1);
                    num2 = this.applyNegativeProbability(Math.floor(Math.random() * 100) + 1);
                    if (Math.abs(num1) < Math.abs(num2)) {
                        [num1, num2] = [num2, num1];
                    }
                    operator = '−';
                    answer = num1 - num2;
                    break;
                    
                case 'division':
                    num1 = this.applyNegativeProbability(Math.floor(Math.random() * 10) + 1);
                    num2 = this.applyNegativeProbability(Math.floor(Math.random() * 10) + 1);
                    const dividend = num1 * num2;
                    operator = '÷';
                    answer = num1;
                    num1 = dividend;
                    break;
            }
        } else {
            // Level mode - new level-based logic
            switch (currentMode) {
                case 'addition':
                    [num1, num2, answer] = this.generateAdditionLevel();
                    operator = '+';
                    break;
                    
                case 'subtraction':
                    [num1, num2, answer] = this.generateSubtractionLevel();
                    operator = '−';
                    break;
                    
                case 'multiplication':
                    [num1, num2, answer] = this.generateMultiplicationLevel();
                    operator = '×';
                    break;
                    
                case 'division':
                    [num1, num2, answer] = this.generateDivisionLevel();
                    operator = '÷';
                    break;
                    
                case 'mixed':
                    [num1, num2, answer, operator] = this.generateMixedLevel();
                    break;
            }
        }
        
        this.currentAnswer = answer;
        this.ui.questionElement.textContent = `${num1} ${operator} ${num2} = ?`;
        this.ui.answerInput.value = '';
        
        // Reset per-problem stopwatch here for EVERY question
        this.questionStartTime = Date.now();
    }

    // Level generation methods
    generateAdditionLevel() {
        let num1, num2, answer;
        switch (this.currentLevel) {
            case 1: // Sum ≤ 10
                answer = Math.floor(Math.random() * 10) + 1;
                num1 = Math.floor(Math.random() * answer) + 1;
                num2 = answer - num1;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
            case 2: // Sum > 10 and ≤ 20, both > 5
                answer = Math.floor(Math.random() * 10) + 11; // 11-20
                num1 = Math.floor(Math.random() * (answer - 6)) + 6; // 6 to answer-1
                num2 = answer - num1;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
            case 3: // Sum > 20 and ≤ 50, both > 20
                answer = Math.floor(Math.random() * 30) + 21; // 21-50
                num1 = Math.floor(Math.random() * (answer - 21)) + 21; // 21 to answer-1
                num2 = answer - num1;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
            case 4: // Sum > 50 and ≤ 100, both > 10
                answer = Math.floor(Math.random() * 50) + 51; // 51-100
                num1 = Math.floor(Math.random() * (answer - 11)) + 11; // 11 to answer-1
                num2 = answer - num1;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
            case 5: // Sum > 100 and ≤ 1000, both > 100
                answer = Math.floor(Math.random() * 800) + 201; // 201-1000
                num1 = Math.floor(Math.random() * (answer - 101)) + 101; // 101 to answer-1
                num2 = answer - num1;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
            case 6: // Sum > 1000 and ≤ 10000, both > 1000
                answer = Math.floor(Math.random() * 8000) + 2001; // 2001-10000
                num1 = Math.floor(Math.random() * (answer - 1001)) + 1001; // 1001 to answer-1
                num2 = answer - num1;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
            case 7: // Sum > 10000 and ≤ 20000, both > 1000
                answer = Math.floor(Math.random() * 10000) + 10001; // 10001-20000
                num1 = Math.floor(Math.random() * (answer - 1001)) + 1001; // 1001 to answer-1
                num2 = answer - num1;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
            case 8: // Sum > 20000 and ≤ 100000, both > 10000
                answer = Math.floor(Math.random() * 80000) + 20001; // 20001-100000
                num1 = Math.floor(Math.random() * (answer - 10001)) + 10001; // 10001 to answer-1
                num2 = answer - num1;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
        }
        return [num1, num2, answer];
    }

    generateSubtractionLevel() {
        let num1, num2, answer;
        switch (this.currentLevel) {
            case 1: // Result ≤ 10
                answer = Math.floor(Math.random() * 10) + 1;
                num1 = answer + Math.floor(Math.random() * 10) + 1;
                num2 = num1 - answer;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
            case 2: // Result > 10 and ≤ 20, both > 5
                answer = Math.floor(Math.random() * 10) + 11; // 11-20
                num1 = answer + Math.floor(Math.random() * 20) + 1;
                num2 = num1 - answer;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
            case 3: // Result > 20 and ≤ 50, both > 20
                answer = Math.floor(Math.random() * 30) + 21; // 21-50
                num1 = answer + Math.floor(Math.random() * 50) + 1;
                num2 = num1 - answer;
                num1 = this.applyNegativeProbability(num1);
                num2 = this.applyNegativeProbability(num2);
                break;
            case 4: // Result > 50 and ≤ 100, both > 10
                answer = Math.floor(Math.random() * 50) + 51; // 51-100
                num1 = answer + Math.floor(Math.random() * 50) + 11; // answer+11 to answer+60
                num2 = num1 - answer;
                break;
            case 5: // Result > 100 and ≤ 1000, both > 100
                answer = Math.floor(Math.random() * 800) + 201; // 201-1000
                num1 = answer + Math.floor(Math.random() * 500) + 101; // answer+101 to answer+600
                num2 = num1 - answer;
                break;
            case 6: // Result > 1000 and ≤ 10000, both > 1000
                answer = Math.floor(Math.random() * 8000) + 2001; // 2001-10000
                num1 = answer + Math.floor(Math.random() * 5000) + 1001; // answer+1001 to answer+6000
                num2 = num1 - answer;
                break;
            case 7: // Result > 10000 and ≤ 20000, both > 1000
                answer = Math.floor(Math.random() * 10000) + 10001; // 10001-20000
                num1 = answer + Math.floor(Math.random() * 5000) + 1001; // answer+1001 to answer+6000
                num2 = num1 - answer;
                break;
            case 8: // Result > 20000 and ≤ 100000, both > 10000
                answer = Math.floor(Math.random() * 80000) + 20001; // 20001-100000
                num1 = answer + Math.floor(Math.random() * 50000) + 10001; // answer+10001 to answer+60000
                num2 = num1 - answer;
                break;
        }
        return [num1, num2, answer];
    }

    generateMultiplicationLevel() {
        let num1, num2, answer;
        switch (this.currentLevel) {
            case 1: // Product ≤ 10 (0 allowed)
                if (Math.random() < 0.1) { // 10% chance for 0
                    num1 = 0;
                    num2 = Math.floor(Math.random() * 10) + 1;
                } else {
                    // Generate uniformly distributed products 1-10
                    answer = Math.floor(Math.random() * 10) + 1;
                    const factors = this.getFactors(answer);
                    const factor = factors[Math.floor(Math.random() * factors.length)];
                    num1 = factor;
                    num2 = answer / factor;
                }
                answer = num1 * num2;
                break;
            case 2: // Both numbers multiply to > 10 and ≤ 50, numbers ≤ 10
                const validCombos2 = [];
                for (let i = 1; i <= 10; i++) {
                    for (let j = 1; j <= 10; j++) {
                        const product = i * j;
                        if (product > 10 && product <= 50) {
                            validCombos2.push([i, j]);
                        }
                    }
                }
                const combo2 = validCombos2[Math.floor(Math.random() * validCombos2.length)];
                num1 = combo2[0];
                num2 = combo2[1];
                answer = num1 * num2;
                break;
            case 3: // Both numbers multiply to > 50 and ≤ 100, numbers ≤ 10
                const validCombos3 = [];
                for (let i = 1; i <= 10; i++) {
                    for (let j = 1; j <= 10; j++) {
                        const product = i * j;
                        if (product > 50 && product <= 100) {
                            validCombos3.push([i, j]);
                        }
                    }
                }
                const combo3 = validCombos3[Math.floor(Math.random() * validCombos3.length)];
                num1 = combo3[0];
                num2 = combo3[1];
                answer = num1 * num2;
                break;
            case 4: // Product < 100, with one number > 10, other > 3
                const validCombos4 = [];
                for (let i = 11; i <= 20; i++) {
                    for (let j = 4; j <= 9; j++) {
                        const product = i * j;
                        if (product < 100) {
                            validCombos4.push([i, j]);
                        }
                    }
                }
                const combo4 = validCombos4[Math.floor(Math.random() * validCombos4.length)];
                num1 = combo4[0];
                num2 = combo4[1];
                answer = num1 * num2;
                break;
            case 5: // Both numbers 10-20
                num1 = Math.floor(Math.random() * 11) + 10; // 10-20
                num2 = Math.floor(Math.random() * 11) + 10; // 10-20
                answer = num1 * num2;
                break;
            case 6: // Both numbers 10-50, at least one > 20
                if (Math.random() < 0.5) {
                    num1 = Math.floor(Math.random() * 31) + 21; // 21-50
                    num2 = Math.floor(Math.random() * 31) + 10; // 10-40
                } else {
                    num1 = Math.floor(Math.random() * 31) + 10; // 10-40
                    num2 = Math.floor(Math.random() * 31) + 21; // 21-50
                }
                answer = num1 * num2;
                break;
            case 7: // Both numbers 21-99
                num1 = Math.floor(Math.random() * 79) + 21; // 21-99
                num2 = Math.floor(Math.random() * 79) + 21; // 21-99
                answer = num1 * num2;
                break;
            case 8: // Both numbers 51-99
                num1 = Math.floor(Math.random() * 49) + 51; // 51-99
                num2 = Math.floor(Math.random() * 49) + 51; // 51-99
                answer = num1 * num2;
                break;
        }
        return [num1, num2, answer];
    }

    generateDivisionLevel() {
        let num1, num2, answer;
        switch (this.currentLevel) {
            case 1: // Result ≤ 10 (0 allowed)
                if (Math.random() < 0.1) { // 10% chance for 0
                    answer = 0;
                    num2 = Math.floor(Math.random() * 10) + 1;
                } else {
                    answer = Math.floor(Math.random() * 10) + 1;
                    num2 = Math.floor(Math.random() * 10) + 1;
                }
                num1 = answer * num2;
                break;
            case 2: // Result > 10 and ≤ 50, numbers ≤ 10
                answer = Math.floor(Math.random() * 40) + 11; // 11-50
                num2 = Math.floor(Math.random() * 10) + 1; // 1-10
                num1 = answer * num2;
                break;
            case 3: // Result > 50 and ≤ 100, numbers ≤ 10
                answer = Math.floor(Math.random() * 50) + 51; // 51-100
                num2 = Math.floor(Math.random() * 10) + 1; // 1-10
                num1 = answer * num2;
                break;
            case 4: // Result < 100, with one number > 10, other > 3
                answer = Math.floor(Math.random() * 50) + 1; // 1-50
                num2 = Math.floor(Math.random() * 6) + 4; // 4-9
                num1 = answer * num2;
                break;
            case 5: // Both numbers 10-20
                answer = Math.floor(Math.random() * 11) + 10; // 10-20
                num2 = Math.floor(Math.random() * 11) + 10; // 10-20
                num1 = answer * num2;
                break;
            case 6: // Both numbers 10-50, at least one > 20
                if (Math.random() < 0.5) {
                    answer = Math.floor(Math.random() * 30) + 21; // 21-50
                    num2 = Math.floor(Math.random() * 31) + 10; // 10-40
                } else {
                    answer = Math.floor(Math.random() * 31) + 10; // 10-40
                    num2 = Math.floor(Math.random() * 30) + 21; // 21-50
                }
                num1 = answer * num2;
                break;
            case 7: // Both numbers 21-99
                answer = Math.floor(Math.random() * 79) + 21; // 21-99
                num2 = Math.floor(Math.random() * 79) + 21; // 21-99
                num1 = answer * num2;
                break;
            case 8: // Both numbers 51-99
                answer = Math.floor(Math.random() * 49) + 51; // 51-99
                num2 = Math.floor(Math.random() * 49) + 51; // 51-99
                num1 = answer * num2;
                break;
        }
        return [num1, num2, answer];
    }

    getFactors(n) {
        const factors = [];
        for (let i = 1; i <= n; i++) {
            if (n % i === 0) {
                factors.push(i);
            }
        }
        return factors;
    }

    generateMixedLevel() {
        // Randomly select one of the four operations
        const operations = ['addition', 'subtraction', 'multiplication', 'division'];
        const selectedOperation = operations[Math.floor(Math.random() * operations.length)];
        
        let num1, num2, answer, operator;
        
        // Generate problem based on selected operation and current level
        switch (selectedOperation) {
            case 'addition':
                [num1, num2, answer] = this.generateAdditionLevel();
                operator = '+';
                break;
                
            case 'subtraction':
                [num1, num2, answer] = this.generateSubtractionLevel();
                operator = '−';
                break;
                
            case 'multiplication':
                [num1, num2, answer] = this.generateMultiplicationLevel();
                operator = '×';
                break;
                
            case 'division':
                [num1, num2, answer] = this.generateDivisionLevel();
                operator = '÷';
                break;
        }
        
        return [num1, num2, answer, operator];
    }

    startTimer() {
        this.ui.updateTimerDisplay();
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.ui.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    appendToInput(number) {
        // Handle minus sign
        if (number === '-') {
            // Only allow minus at the beginning if field is empty
            if (this.ui.answerInput.value === '') {
                this.ui.answerInput.value = '-';
            }
        } else {
            // For digits, just append
            this.ui.answerInput.value += number;
        }
    }

    clearInput() {
        this.ui.answerInput.value = '';
    }

    submitAnswer() {
        // Prevent score updates after game is finished
        if (this.gameFinished) {
            console.log('🚫 Game already finished, ignoring answer submission');
            return;
        }
        
        // Check if answer field is empty or only whitespace
        if (!this.ui.answerInput.value.trim()) {
            return; // Do nothing if empty
        }
        
        const userAnswer = parseInt(this.ui.answerInput.value);
        
        // Track total questions answered
        this.totalQuestions++;
        
        if (userAnswer === this.currentAnswer) {
            // Track correct answers
            this.correctAnswers++;
            
            // Calculate points based on speed and level
            const timeElapsed = (Date.now() - this.questionStartTime) / 1000;
            const points = this.calculatePoints(timeElapsed);
            
            this.score += points;
            this.ui.updateScore();
            this.ui.showScoreFeedback(points, true);
            
            // Level progression logic
            if (this.gameType === 'level') {
                this.correctStreak++;
                // Check advancement requirements
                let requiredStreak = 5; // Default: 5 correct answers
                if (this.currentLevel === 6 || this.currentLevel === 7) {
                    requiredStreak = 10; // All disciplines: levels 6-7 need 10 correct answers
                }
                
                if (this.correctStreak >= requiredStreak && this.currentLevel < 8) {
                    this.currentLevel++;
                    this.correctStreak = 0;
                    this.ui.updateLevelDisplay();
                }
            }
            
            // Medal progression (decreases every 5 correct answers for level mode, 4 for mini mode)
            this.medalStreak++;
            const requiredStreak = this.gameType === 'mini' ? 4 : 5;
            if (this.medalStreak >= requiredStreak && this.medalLevel > 1) {
                this.medalLevel--;
                this.medalStreak = 0;
                this.ui.updateMedal();
            }
            
            this.generateQuestion();
        } else {
            // Wrong answer: subtract 5 points and continue
            this.score -= 5;
            this.ui.updateScore();
            this.ui.showScoreFeedback(5, false);
            
            // Level demotion logic
            if (this.gameType === 'level') {
                this.correctStreak = 0;
                if (this.currentLevel > 1) {
                    this.currentLevel--;
                    this.ui.updateLevelDisplay();
                }
            }
            
            this.generateQuestion();
        }
    }

    calculatePoints(timeElapsed) {
        // timeElapsed is seconds since the current question was shown
        // Bucket: 0–3s → 1, (3–6] → 2, (6–9] → 3, (9–12] → 4, (12–15] → 5, etc.
        const bucket = Math.ceil(timeElapsed / 3);

        if (this.gameType === 'mini') {
            // Mini: 5 points for ≤3s, then -1 per 3s, minimum 1 point
            // bucket=1 → 5, 2→4, 3→3, 4→2, 5→1, 6→1, 7→1, etc.
            const pts = Math.max(1, 6 - bucket); 
            return pts;
        } else {
            // Level: base = 4 + currentLevel (L1→5 … L8→12)
            // Each extra 3s reduces by 1, min 1
            const base = 4 + this.currentLevel;
            // bucket=1 → base, 2→base-1, 3→base-2, ...
            const pts = (base + 1) - bucket;
            return Math.max(1, pts);
        }
    }

    async endGame() {
        // Mark game as finished to prevent any further score updates
        this.gameFinished = true;
        this.stopTimer();
        
        // Capture the final score at this exact moment
        const finalScore = this.score;
        console.log(`🏁 Game ended - Final score captured: ${finalScore}`);
        
        // Calculate accuracy
        const accuracy = this.totalQuestions > 0 ? Math.round((this.correctAnswers / this.totalQuestions) * 100) : 0;
        
        // Save score to Firestore using saveGlobalScore (handles duplicates and best score logic)
        let username;
        try {
            username = getActiveUsername();
        } catch (error) {
            console.error('❌ Error getting active username:', error);
            username = null;
        }
        
        console.log(`🎮 Attempting to save score - Active username: ${username}, Score: ${this.score}`);
        
        // Validate username before saving
        if (!username || username.trim() === '') {
            console.error('❌ BLOCKED: No active username set, cannot save score');
            return;
        }
        
        try {
            const result = await saveGlobalScore({ 
                username: username, 
                mode: this.gameMode, 
                gameType: this.gameType, 
                score: finalScore 
            });
            if (result && result.saved) {
                console.log(`✅ Game data saved successfully to Firestore with final score: ${finalScore}`, result.reason);
            } else {
                console.log('⏭️ Score not saved:', result ? result.reason : 'invalid parameters');
            }
        } catch (error) {
            console.error("❌ Error saving score:", error);
        }
        
        // After saving, get the updated best score from Firestore (single source of truth)
        const userBestScore = await getUserBestScore(username, this.gameMode, this.gameType);
        const isNewBest = finalScore > userBestScore;
        
        // Store the Firestore best score for consistent display
        this.firestoreBestScore = userBestScore;
        
        // Start listening to leaderboard for real-time updates
        this.listenToLeaderboard(this.gameMode, this.gameType);
        
        // Store the final score in the game object for the leaderboard to use
        this.finalScore = finalScore;
        
        // Display game over screen with personal best (leaderboard will update in real-time)
        await this.leaderboard.displayGameOverScreen();
    }
    

    listenToLeaderboard(mode, type) {
        // Unsubscribe from previous listener if exists
        if (this.leaderboardListener) {
            this.leaderboardListener();
            this.leaderboardListener = null;
        }

        try {
            // Use the centralized subscribeToLeaderboard function
            this.leaderboardListener = subscribeToLeaderboard(mode, type, (leaderboard) => {
                // Update the leaderboard display
                this.updateLeaderboardDisplay(leaderboard);
            });
            
            console.log('Started listening to leaderboard for', mode, type);
        } catch (error) {
            console.error('Error setting up leaderboard listener:', error);
        }
    }

    updateLeaderboardDisplay(leaderboard) {
        // Find the leaderboard section and update it
        const gameOverMessage = this.ui.gameOverMessage;
        if (gameOverMessage) {
            const leaderboardSection = gameOverMessage.querySelector('.leaderboard-section');
            if (leaderboardSection) {
                // Get current active username for highlighting
                const currentUsername = getActiveUsername();
                
                let leaderboardHTML = '';
                if (leaderboard.length === 0) {
                    leaderboardHTML = '<div class="leaderboard-section"><h3>Global Leaderboard</h3><p>No scores yet</p></div>';
                } else {
                    leaderboardHTML = `
                        <div class="leaderboard-section">
                            <h3>Global Leaderboard</h3>
                            <table class="stats-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Username</th>
                                        <th>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${leaderboard.map((entry, index) => `
                                        <tr class="${entry.username === currentUsername ? 'current-player' : ''}">
                                            <td>${index + 1}</td>
                                            <td>${entry.username}</td>
                                            <td>${entry.score}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }
                leaderboardSection.outerHTML = leaderboardHTML;
            }
        }
    }

    cleanupLeaderboardListener() {
        if (this.leaderboardListener) {
            this.leaderboardListener();
            this.leaderboardListener = null;
            console.log('Cleaned up leaderboard listener');
        }
    }

    resetGame() {
        // Clean up leaderboard subscription
        this.leaderboard.cleanup();
        
        // Clean up leaderboard listener
        this.cleanupLeaderboardListener();
        
        // Restore the top dinosaur visibility
        this.ui.dinosaurImage.style.display = 'block';
        this.startGame(this.gameMode, this.gameType);
    }

    async giveUp() {
        await this.endGame();
    }
}


// Initialize the login system when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🟣 DOMContentLoaded event fired - starting initialization...');
    
    // Create user manager for login handling
    console.log('🟣 Creating UserManager...');
    const userManager = new UserManager();
    userManager.initializeUserElements();
    
    // Check login status (this will handle auto-login or show login screen)
    console.log('🟣 Checking login status...');
    await userManager.checkLoginStatus();
    
    console.log('🟣 Initial page load completed');
});
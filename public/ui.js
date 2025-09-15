// UI management module
class UIManager {
    constructor() {
        this.elements = {};
    }

    initializeElements() {
        this.mainContainer = document.getElementById('mainContainer');
        this.loginScreen = document.getElementById('loginScreen');
        this.modeSelectionScreen = document.getElementById('modeSelectionScreen');
        this.operationModeScreen = document.getElementById('operationModeScreen');
        this.gameScreen = document.getElementById('gameScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.multiplicationBtn = document.getElementById('multiplicationBtn');
        this.additionBtn = document.getElementById('additionBtn');
        this.subtractionBtn = document.getElementById('subtractionBtn');
        this.divisionBtn = document.getElementById('divisionBtn');
        this.mixedBtn = document.getElementById('mixedBtn');
        this.negativeToggleBtn = document.getElementById('negativeToggleBtn');
        this.miniModeBtn = document.getElementById('miniModeBtn');
        this.levelModeBtn = document.getElementById('levelModeBtn');
        this.backToModesBtn = document.getElementById('backToModesBtn');
        this.submitBtn = document.getElementById('submitBtn');
        this.playAgainBtn = document.getElementById('playAgainBtn');
        this.switchModeBtn = document.getElementById('switchModeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.giveUpBtn = document.getElementById('giveUpBtn');
        this.scoreElement = document.getElementById('score');
        this.questionElement = document.getElementById('question');
        this.answerInput = document.getElementById('answerInput');
        this.gameOverMessage = document.getElementById('gameOverMessage');
        this.timerElement = document.getElementById('timer');
        this.modeDisplay = document.getElementById('modeDisplay');
        this.levelDisplay = document.getElementById('levelDisplay');
        this.operationTitle = document.getElementById('operationTitle');
        this.dinosaurImage = document.getElementById('dinosaurImage');
        this.medal = document.getElementById('medal');
        this.endScreenDinosaur = document.getElementById('endScreenDinosaur');
        this.endScreenMedal = document.getElementById('endScreenMedal');
        this.numberButtons = document.querySelectorAll('.number-btn[data-number]');
    }

    attachEventListeners() {
        this.multiplicationBtn.addEventListener('click', () => this.game.selectOperation('multiplication'));
        this.additionBtn.addEventListener('click', () => this.game.selectOperation('addition'));
        this.subtractionBtn.addEventListener('click', () => this.game.selectOperation('subtraction'));
        this.divisionBtn.addEventListener('click', () => this.game.selectOperation('division'));
        this.mixedBtn.addEventListener('click', () => this.game.selectOperation('mixed'));
        this.negativeToggleBtn.addEventListener('click', () => this.game.toggleNegatives());
        this.miniModeBtn.addEventListener('click', () => this.game.startGame(this.game.selectedOperation, 'mini'));
        this.levelModeBtn.addEventListener('click', () => this.game.startGame(this.game.selectedOperation, 'level'));
        this.backToModesBtn.addEventListener('click', () => this.backToModes());
        this.submitBtn.addEventListener('click', () => this.game.submitAnswer());
        this.playAgainBtn.addEventListener('click', () => this.game.resetGame());
        this.switchModeBtn.addEventListener('click', () => this.switchMode());
        this.clearBtn.addEventListener('click', () => this.game.clearInput());
        this.giveUpBtn.addEventListener('click', () => this.game.giveUp());
        
        this.answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.game.submitAnswer();
                return;
            }
            
            // Allow digits (0-9)
            if (e.key >= '0' && e.key <= '9') {
                return; // Allow the keypress
            }
            
            // Allow minus sign only as the first character
            if (e.key === '-') {
                if (e.target.value === '') {
                    return; // Allow minus if field is empty
                }
            }
            
            // Block all other characters
            e.preventDefault();
        });

        // Number keyboard event listeners
        this.numberButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const number = btn.getAttribute('data-number');
                this.game.appendToInput(number);
            });
        });
    }

    selectOperation(operation) {
        this.game.selectedOperation = operation;
        const operationNames = {
            'multiplication': 'Multiplication',
            'addition': 'Addition',
            'subtraction': 'Subtraction',
            'division': 'Division',
            'mixed': 'Mixed'
        };
        this.operationTitle.textContent = `${operationNames[operation]} - Choose Mode`;
        this.mainContainer.classList.remove('hidden');
        this.modeSelectionScreen.classList.add('hidden');
        this.operationModeScreen.classList.remove('hidden');
        // Show header with logout button on operation selection screen
        this.game.user.showHeader();
    }

    backToModes() {
        this.mainContainer.classList.remove('hidden');
        this.operationModeScreen.classList.add('hidden');
        this.modeSelectionScreen.classList.remove('hidden');
        // Show header with logout button when returning to modes
        this.game.user.showHeader();
    }

    showMainMenu() {
        console.log('🟡 showMainMenu() called');
        console.log('🟡 Hiding login screen and showing main container...');
        
        this.loginScreen.classList.add('hidden');
        this.mainContainer.classList.remove('hidden');
        this.modeSelectionScreen.classList.remove('hidden');
        this.operationModeScreen.classList.add('hidden');
        this.gameScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        
        console.log('🟡 Updating username display...');
        this.game.user.updateUsernameDisplay();
        
        // Show header with logout button on main menu
        console.log('🟡 Showing header...');
        this.game.user.showHeader();
        
        console.log('🟡 Main menu displayed successfully');
    }

    showGameScreen() {
        this.loginScreen.classList.add('hidden');
        this.mainContainer.classList.remove('hidden');
        this.modeSelectionScreen.classList.add('hidden');
        this.operationModeScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.game.user.updateUsernameDisplay();
        // Hide header during active gameplay
        this.game.user.hideHeader();
    }

    showGameOverScreen() {
        this.gameScreen.classList.add('hidden');
        this.gameOverScreen.classList.remove('hidden');
        // Show header with logout button on game over screen
        this.game.user.showHeader();
    }

    switchMode() {
        // Restore the top dinosaur visibility
        this.dinosaurImage.style.display = 'block';
        this.mainContainer.classList.remove('hidden');
        this.modeSelectionScreen.classList.remove('hidden');
        this.gameScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        // Show header with logout button when switching modes
        this.game.user.showHeader();
        this.game.stopTimer();
    }

    updateScore() {
        this.scoreElement.textContent = this.game.score;
    }

    updateModeDisplay() {
        const modeNames = {
            'multiplication': 'Multiplication',
            'addition': 'Addition',
            'subtraction': 'Subtraction',
            'division': 'Division',
            'mixed': 'Mixed'
        };
        this.modeDisplay.textContent = modeNames[this.game.gameMode];
    }

    updateLevelDisplay() {
        if (this.game.gameType === 'level') {
            this.levelDisplay.textContent = `Level ${this.game.currentLevel}`;
        } else {
            this.levelDisplay.textContent = '';
        }
    }

    updateTimerDisplay() {
        if (this.game.gameType === 'level') {
            // Display as minutes:seconds for level mode
            const minutes = Math.floor(this.game.timeLeft / 60);
            const seconds = this.game.timeLeft % 60;
            this.timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            if (this.game.timeLeft <= 5) {
                this.timerElement.classList.add('warning');
            } else {
                this.timerElement.classList.remove('warning');
            }
        } else {
            // Display as seconds for mini mode
            this.timerElement.textContent = this.game.timeLeft;
            if (this.game.timeLeft <= 5) {
                this.timerElement.classList.add('warning');
            } else {
                this.timerElement.classList.remove('warning');
            }
        }
    }

    updateMedal() {
        this.medal.style.display = 'flex';
        this.medal.textContent = this.game.medalLevel;
        
        // Update medal color based on level
        this.medal.className = 'medal';
        if (this.game.medalLevel >= 4 && this.game.medalLevel <= 10) {
            this.medal.classList.add('gray');
        } else if (this.game.medalLevel === 3) {
            this.medal.classList.add('bronze');
        } else if (this.game.medalLevel === 2) {
            this.medal.classList.add('silver');
        } else if (this.game.medalLevel === 1) {
            this.medal.classList.add('gold');
        }
    }

    updateEndScreenMedal() {
        this.endScreenMedal.style.display = 'flex';
        this.endScreenMedal.textContent = this.game.medalLevel;
        
        // Update medal color based on level
        this.endScreenMedal.className = 'medal';
        if (this.game.medalLevel >= 4 && this.game.medalLevel <= 10) {
            this.endScreenMedal.classList.add('gray');
        } else if (this.game.medalLevel === 3) {
            this.endScreenMedal.classList.add('bronze');
        } else if (this.game.medalLevel === 2) {
            this.endScreenMedal.classList.add('silver');
        } else if (this.game.medalLevel === 1) {
            this.endScreenMedal.classList.add('gold');
        }
    }

    showScoreFeedback(points, isPositive) {
        const feedback = document.createElement('div');
        feedback.className = `score-feedback ${isPositive ? 'positive' : 'negative'}`;
        feedback.textContent = `${isPositive ? '+' : '-'}${points}`;
        
        // Add to the score element
        this.scoreElement.appendChild(feedback);
        
        // Remove the feedback element after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 1500);
    }
}

export { UIManager };

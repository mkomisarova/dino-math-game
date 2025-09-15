// Leaderboard and score management module
import { getLeaderboard, getUserBestScore, subscribeToLeaderboard } from './score-service.js';

class LeaderboardManager {
    constructor() {
        this.leaderboardUnsubscribe = null;
        this.currentLeaderboard = [];
    }


    createFirebaseLeaderboardHTML(leaderboard) {
        if (leaderboard.length === 0) return '';
        
        return `
            <div class="leaderboard-section">
                <h3>Global Leaderboard</h3>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Username</th>
                            <th>Best Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leaderboard.map((entry, index) => `
                            <tr class="${entry.username === this.game.username ? 'current-player' : ''}">
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

    updateLeaderboardDisplay(leaderboard) {
        this.currentLeaderboard = leaderboard;
        const leaderboardHTML = this.createFirebaseLeaderboardHTML(leaderboard);
        
        // Find the leaderboard section in the game over message and update it
        const gameOverMessage = this.game.ui.gameOverMessage;
        if (gameOverMessage) {
            const leaderboardSection = gameOverMessage.querySelector('.leaderboard-section');
            if (leaderboardSection) {
                leaderboardSection.outerHTML = leaderboardHTML;
            } else {
                // If no leaderboard section exists, append it
                gameOverMessage.innerHTML += leaderboardHTML;
            }
        }
    }

    setupLiveLeaderboard(mode, type) {
        // Unsubscribe from previous leaderboard if exists
        if (this.leaderboardUnsubscribe) {
            this.leaderboardUnsubscribe();
        }

        // Set up new live leaderboard subscription
        this.leaderboardUnsubscribe = subscribeToLeaderboard(mode, type, (leaderboard) => {
            this.updateLeaderboardDisplay(leaderboard);
        });
    }

    cleanup() {
        // Unsubscribe from leaderboard when cleaning up
        if (this.leaderboardUnsubscribe) {
            this.leaderboardUnsubscribe();
            this.leaderboardUnsubscribe = null;
        }
    }

    async displayGameOverScreen() {
        this.game.ui.showGameOverScreen();
        
        // Update the end screen medal to match the current medal state
        this.game.ui.updateEndScreenMedal();
        
        const accuracy = this.game.totalQuestions > 0 ? Math.round((this.game.correctAnswers / this.game.totalQuestions) * 100) : 0;
        const title = "Time's Up!";
        
        try {
            // Get current best score from Firestore
            const currentBestScore = await getUserBestScore(this.game.username, this.game.gameMode, this.game.gameType);
            const isNewBest = this.game.score > currentBestScore;
            
            // Use the higher of current score or existing best score for display
            const displayBestScore = Math.max(this.game.score, currentBestScore);
            
            // Set up live leaderboard subscription
            this.setupLiveLeaderboard(this.game.gameMode, this.game.gameType);
            
            // Get initial leaderboard data
            const initialLeaderboard = await getLeaderboard(this.game.gameMode, this.game.gameType);
            const initialLeaderboardHTML = this.createFirebaseLeaderboardHTML(initialLeaderboard);
            
            this.game.ui.gameOverMessage.innerHTML = `
                <div class="level-end-screen">
                    <div class="end-title">${title}</div>
                    ${isNewBest ? '<div class="new-best-score">🎉 New Best Score! 🎉</div>' : ''}
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>Final Score</th>
                                <th>Your Best</th>
                                <th>Accuracy</th>
                                <th>Questions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${this.game.score}</td>
                                <td>${displayBestScore}</td>
                                <td>${accuracy}%</td>
                                <td>${this.game.totalQuestions}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="mobile-stats">
                        <div class="stat-card">
                            <span class="stat-label">Final Score</span>
                            <span class="stat-value">${this.game.score}</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Your Best</span>
                            <span class="stat-value">${displayBestScore}</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Accuracy</span>
                            <span class="stat-value">${accuracy}%</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Questions</span>
                            <span class="stat-value">${this.game.totalQuestions}</span>
                        </div>
                    </div>
                    ${initialLeaderboardHTML}
                </div>
            `;
        } catch (error) {
            console.error('Error setting up leaderboard:', error);
            // Simple fallback without leaderboard if Firebase fails
            this.game.ui.gameOverMessage.innerHTML = `
                <div class="level-end-screen">
                    <div class="end-title">${title}</div>
                    <div class="error-message">Unable to load leaderboard. Please check your connection.</div>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>Final Score</th>
                                <th>Accuracy</th>
                                <th>Questions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${this.game.score}</td>
                                <td>${accuracy}%</td>
                                <td>${this.game.totalQuestions}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="mobile-stats">
                        <div class="stat-card">
                            <span class="stat-label">Final Score</span>
                            <span class="stat-value">${this.game.score}</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Accuracy</span>
                            <span class="stat-value">${accuracy}%</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-label">Questions</span>
                            <span class="stat-value">${this.game.totalQuestions}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        this.game.ui.gameOverMessage.className = 'level-end-screen';
    }

    async displayGameOverScreenWithLeaderboard(leaderboard, accuracy, userBestScore, isNewBest) {
        this.game.ui.showGameOverScreen();
        
        // Update the end screen medal to match the current medal state
        this.game.ui.updateEndScreenMedal();
        
        const title = "Time's Up!";
        
        // Create leaderboard HTML
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
                                <tr class="${entry.username === this.game.username ? 'current-player' : ''}">
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
        
        this.game.ui.gameOverMessage.innerHTML = `
            <div class="level-end-screen">
                <div class="end-title">${title}</div>
                ${isNewBest ? '<div class="new-best-score">🎉 New Best Score! 🎉</div>' : ''}
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>Final Score</th>
                                <th>Your Best</th>
                                <th>Accuracy</th>
                                <th>Questions</th>
                            </tr>
                        </thead>
                    <tbody>
                        <tr>
                            <td>${this.game.score}</td>
                            <td>${userBestScore}</td>
                            <td>${accuracy}%</td>
                            <td>${this.game.totalQuestions}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="mobile-stats">
                    <div class="stat-card">
                        <span class="stat-label">Final Score</span>
                        <span class="stat-value">${this.game.score}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Your Best</span>
                        <span class="stat-value">${userBestScore}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Accuracy</span>
                        <span class="stat-value">${accuracy}%</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Questions</span>
                        <span class="stat-value">${this.game.totalQuestions}</span>
                    </div>
                </div>
                ${leaderboardHTML}
            </div>
        `;
        
        this.game.ui.gameOverMessage.className = 'level-end-screen';
    }

    async displayGameOverScreenWithPersonalBest(accuracy, userBestScore, isNewBest) {
        this.game.ui.showGameOverScreen();
        
        // Update the end screen medal to match the current medal state
        this.game.ui.updateEndScreenMedal();
        
        const title = "Time's Up!";
        
        // Create initial leaderboard HTML (will be updated by real-time listener)
        const initialLeaderboardHTML = '<div class="leaderboard-section"><h3>Global Leaderboard</h3><p>Loading...</p></div>';
        
        this.game.ui.gameOverMessage.innerHTML = `
            <div class="level-end-screen">
                <div class="end-title">${title}</div>
                ${isNewBest ? '<div class="new-best-score">🎉 New Best Score! 🎉</div>' : ''}
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>Final Score</th>
                                <th>Your Best</th>
                                <th>Accuracy</th>
                                <th>Questions</th>
                            </tr>
                        </thead>
                    <tbody>
                        <tr>
                            <td>${this.game.score}</td>
                            <td>${userBestScore}</td>
                            <td>${accuracy}%</td>
                            <td>${this.game.totalQuestions}</td>
                        </tr>
                    </tbody>
                </table>
                <div class="mobile-stats">
                    <div class="stat-card">
                        <span class="stat-label">Final Score</span>
                        <span class="stat-value">${this.game.score}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Your Best</span>
                        <span class="stat-value">${userBestScore}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Accuracy</span>
                        <span class="stat-value">${accuracy}%</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-label">Questions</span>
                        <span class="stat-value">${this.game.totalQuestions}</span>
                    </div>
                </div>
                ${initialLeaderboardHTML}
            </div>
        `;
        
        this.game.ui.gameOverMessage.className = 'level-end-screen';
    }
}

export { LeaderboardManager };

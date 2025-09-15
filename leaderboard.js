// Leaderboard and score management module
class LeaderboardManager {
    constructor() {
    }

    getBestScoreKey(mode, type) {
        return `bestScore_${this.game.user.currentUsername}_${mode}_${type}`;
    }

    getBestScore(mode, type) {
        const key = this.getBestScoreKey(mode, type);
        const saved = localStorage.getItem(key);
        return saved ? parseInt(saved) : 0;
    }

    saveBestScore(mode, type, score) {
        const currentBest = this.getBestScore(mode, type);
        if (score > currentBest) {
            const key = this.getBestScoreKey(mode, type);
            localStorage.setItem(key, score.toString());
            return true; // New best score
        }
        return false; // Not a new best score
    }

    getAllBestScores(mode, type) {
        const scores = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('bestScore_') && key.endsWith(`_${mode}_${type}`)) {
                const username = key.replace('bestScore_', '').replace(`_${mode}_${type}`, '');
                const score = parseInt(localStorage.getItem(key));
                scores.push({ username, score });
            }
        }
        return scores.sort((a, b) => b.score - a.score); // Sort by score descending
    }

    createLeaderboardHTML(leaderboard) {
        if (leaderboard.length === 0) return '';
        
        return `
            <div class="leaderboard-section">
                <h3>Leaderboard</h3>
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Best Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leaderboard.map((entry, index) => `
                            <tr class="${entry.username === this.game.user.currentUsername ? 'current-player' : ''}">
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

    displayGameOverScreen() {
        this.game.ui.showGameOverScreen();
        
        // Update the end screen medal to match the current medal state
        this.game.ui.updateEndScreenMedal();
        
        // Save best score and check if it's a new record
        const isNewBest = this.saveBestScore(this.game.gameMode, this.game.gameType, this.game.score);
        const bestScore = this.getBestScore(this.game.gameMode, this.game.gameType);
        const leaderboard = this.getAllBestScores(this.game.gameMode, this.game.gameType);
        
        const accuracy = this.game.totalQuestions > 0 ? Math.round((this.game.correctAnswers / this.game.totalQuestions) * 100) : 0;
        const title = "Time's Up!";
        
        // Create leaderboard table
        const leaderboardHTML = this.createLeaderboardHTML(leaderboard);
        
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
                            <td>${bestScore}</td>
                            <td>${accuracy}%</td>
                            <td>${this.game.totalQuestions}</td>
                        </tr>
                    </tbody>
                </table>
                ${leaderboardHTML}
            </div>
        `;
        this.game.ui.gameOverMessage.className = 'level-end-screen';
    }
}

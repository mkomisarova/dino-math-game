// User management module
class UserManager {
    constructor() {
        this.currentUsername = null;
    }

    initializeUserElements() {
        // Username system elements
        this.usernameInput = document.getElementById('usernameInput');
        this.loginBtn = document.getElementById('loginBtn');
        this.currentUsernameElement = document.getElementById('currentUsername');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.header = document.getElementById('header');
        
        // Ensure header starts completely hidden
        this.header.classList.add('hidden');
        this.logoutBtn.style.display = 'none';
        
        // Add event listeners
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Add Enter key listener for username input
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
    }

    checkLoginStatus() {
        const savedUsername = localStorage.getItem('mathGameUsername');
        if (savedUsername) {
            this.currentUsername = savedUsername;
            this.game.ui.showMainMenu();
        } else {
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        this.game.ui.loginScreen.classList.remove('hidden');
        this.game.ui.mainContainer.classList.add('hidden');
        // Hide header on login screen - ensure it's completely hidden
        this.header.classList.add('hidden');
        this.logoutBtn.style.display = 'none';
    }

    handleLogin() {
        const username = this.usernameInput.value.trim();
        if (username) {
            this.currentUsername = username;
            localStorage.setItem('mathGameUsername', username);
            this.game.ui.showMainMenu();
        }
    }

    handleLogout() {
        this.currentUsername = null;
        localStorage.removeItem('mathGameUsername');
        this.usernameInput.value = '';
        // Ensure header is hidden before showing login screen
        this.header.classList.add('hidden');
        this.logoutBtn.style.display = 'none';
        this.showLoginScreen();
    }

    updateUsernameDisplay() {
        this.currentUsernameElement.textContent = this.currentUsername;
    }

    showHeader() {
        this.header.classList.remove('hidden');
        this.logoutBtn.style.display = 'inline-block';
    }

    hideHeader() {
        this.header.classList.add('hidden');
        this.logoutBtn.style.display = 'none';
    }
}

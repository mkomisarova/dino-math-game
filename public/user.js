// User management module
import { ensureUserExists, setActiveUsername, clearActiveUsername, getActiveUsername } from './user-service.js';

// Test that the import is working
console.log('✅ user.js loaded, getActiveUsername imported:', typeof getActiveUsername);

class UserManager {
    constructor() {
    }

    initializeUserElements() {
        console.log('🔵 Initializing user elements...');
        
        // Username system elements
        this.usernameInput = document.getElementById('usernameInput');
        this.loginBtn = document.getElementById('loginBtn');
        this.currentUsernameElement = document.getElementById('currentUsername');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.header = document.getElementById('header');
        
        console.log('🔵 DOM elements found:', {
            usernameInput: !!this.usernameInput,
            loginBtn: !!this.loginBtn,
            currentUsernameElement: !!this.currentUsernameElement,
            logoutBtn: !!this.logoutBtn,
            header: !!this.header
        });
        
        // Ensure header starts completely hidden
        this.header.classList.add('hidden');
        this.logoutBtn.style.display = 'none';
        
        // Add event listeners
        console.log('🔵 Adding click event listener to login button...');
        this.loginBtn.addEventListener('click', () => {
            console.log('🔵 Login button click event triggered!');
            this.handleLogin();
        });
        
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Add Enter key listener for username input
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('🔵 Enter key pressed in username input!');
                this.handleLogin();
            }
        });
        
        console.log('🔵 User elements initialization completed');
    }

    async checkLoginStatus() {
        let activeUsername;
        try {
            activeUsername = getActiveUsername();
        } catch (error) {
            console.error('❌ Error getting active username in checkLoginStatus:', error);
            activeUsername = null;
        }
        
        if (activeUsername) {
            // Auto-login with active username
            await this.autoLogin(activeUsername);
        } else {
            this.showLoginScreen();
        }
    }
    
    async autoLogin(username) {
        console.log('🔵 Auto-login with username:', username);
        
        if (!username || username.trim() === '') {
            console.error('❌ Invalid username for auto-login:', username);
            this.showLoginScreen();
            return;
        }
        
        try {
            // Ensure user exists in Firestore
            const userReady = await ensureUserExists(username);
            if (userReady) {
                // Initialize game with username
                if (typeof window.initializeGame === 'function') {
                    window.initializeGame(username);
                    
                    // Verify the active username was set correctly
                    let currentActiveUsername;
                    try {
                        currentActiveUsername = getActiveUsername();
                    } catch (error) {
                        console.error('❌ Error getting active username for verification:', error);
                        currentActiveUsername = null;
                    }
                    
                    if (currentActiveUsername === username) {
                        console.log('✅ Auto-login successful, active username correctly set:', currentActiveUsername);
                    } else {
                        console.error('❌ Active username mismatch in auto-login!');
                    }
                }
            } else {
                console.error('❌ Failed to ensure user exists in Firestore');
                this.showLoginScreen();
            }
        } catch (error) {
            console.error('❌ Error during auto-login:', error);
            this.showLoginScreen();
        }
    }

    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loginScreen) loginScreen.classList.remove('hidden');
        if (mainContainer) mainContainer.classList.add('hidden');
        
        // Hide header on login screen - ensure it's completely hidden
        this.header.classList.add('hidden');
        this.logoutBtn.style.display = 'none';
    }

    async handleLogin() {
        console.log('🔵 Button clicked - handleLogin() called');
        
        const username = this.usernameInput.value.trim();
        console.log('🔵 Username read from input:', username);
        
        if (username) {
            console.log('🔵 Username is not empty, proceeding with login...');
            try {
                // Show loading state
                console.log('🔵 Setting button to loading state...');
                this.loginBtn.textContent = 'Creating Account...';
                this.loginBtn.disabled = true;
                
                // Ensure user exists in Firestore
                console.log('🔵 Calling ensureUserExists for username:', username);
                const userReady = await ensureUserExists(username);
                console.log('🔵 ensureUserExists result:', userReady);
                
                if (userReady) {
                    // Set active username in localStorage
                    console.log('🔵 Setting active username:', username);
                    setActiveUsername(username);
                    
                    // Initialize game with username
                    console.log('🔵 Checking if window.initializeGame exists...');
                    if (typeof window.initializeGame === 'function') {
                        console.log('🔵 Calling window.initializeGame with username:', username);
                        window.initializeGame(username);
                        console.log('🔵 Game initialization completed');
                        
                        // Verify the active username is set correctly
                        let currentActiveUsername;
                        try {
                            currentActiveUsername = getActiveUsername();
                        } catch (error) {
                            console.error('❌ Error getting active username for verification:', error);
                            currentActiveUsername = null;
                        }
                        
                        if (currentActiveUsername === username) {
                            console.log('✅ Active username correctly set:', currentActiveUsername);
                        } else {
                            console.error('❌ Active username mismatch!');
                        }
                    } else {
                        console.error('❌ window.initializeGame function not found!');
                    }
                } else {
                    console.error('❌ Failed to create/verify user in Firestore');
                    alert('Failed to create account. Please try again.');
                }
            } catch (error) {
                console.error('❌ Error during login:', error);
                alert('Login failed. Please check your connection and try again.');
            } finally {
                // Reset button state
                console.log('🔵 Resetting button state...');
                this.loginBtn.textContent = 'Start Playing';
                this.loginBtn.disabled = false;
            }
        } else {
            console.log('🔵 Username is empty, doing nothing');
        }
    }

    handleLogout() {
        console.log('🔴 Logging out user...');
        
        // Clean up game instance to prevent score leakage
        if (window.gameInstance) {
            console.log('🔴 Cleaning up game instance...');
            if (window.gameInstance.timer) {
                window.gameInstance.stopTimer();
            }
            window.gameInstance.cleanupLeaderboardListener();
            window.gameInstance = null;
        }
        
        // Clear active username from localStorage
        clearActiveUsername();
        this.usernameInput.value = '';
        
        // Ensure header is hidden before showing login screen
        this.header.classList.add('hidden');
        this.logoutBtn.style.display = 'none';
        
        // Show login screen
        this.showLoginScreen();
        
        console.log('🔴 Logout completed - active username cleared and game instance cleaned up');
        
        // Note: We don't delete the Firestore user document
        // This preserves the user's scores and history
    }

    updateUsernameDisplay() {
        let activeUsername;
        try {
            activeUsername = getActiveUsername();
        } catch (error) {
            console.error('❌ Error getting active username in updateUsernameDisplay:', error);
            activeUsername = null;
        }
        
        if (activeUsername) {
            this.currentUsernameElement.textContent = activeUsername;
            console.log('🔵 Username display updated to:', activeUsername);
        } else {
            console.error('❌ Cannot update username display - no active username');
        }
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

export { UserManager };

// User service for Firebase Firestore user operations
import { 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from './firebase-config.js';

/**
 * Check if a user exists in Firestore
 * @param {string} username - The username to check
 * @returns {boolean} True if user exists, false otherwise
 */
export async function userExists(username) {
  try {
    const userRef = doc(db, 'users', username);
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
}

/**
 * Create a new user document in Firestore
 * @param {string} username - The username
 * @returns {boolean} True if user was created successfully, false otherwise
 */
export async function createUser(username) {
  try {
    const userRef = doc(db, 'users', username);
    await setDoc(userRef, {
      username,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
    console.log(`User ${username} created successfully in Firestore`);
    return true;
  } catch (error) {
    console.error('Error creating user:', error);
    return false;
  }
}

/**
 * Update user's last login timestamp
 * @param {string} username - The username
 * @returns {boolean} True if update was successful, false otherwise
 */
export async function updateLastLogin(username) {
  try {
    const userRef = doc(db, 'users', username);
    await setDoc(userRef, {
      lastLoginAt: serverTimestamp()
    }, { merge: true }); // Merge with existing data
    return true;
  } catch (error) {
    console.error('Error updating last login:', error);
    return false;
  }
}

/**
 * Ensure user exists in Firestore (create if doesn't exist, update login time if exists)
 * @param {string} username - The username
 * @returns {boolean} True if user is ready, false otherwise
 */
export async function ensureUserExists(username) {
  try {
    const exists = await userExists(username);
    
    if (!exists) {
      // Create new user
      return await createUser(username);
    } else {
      // Update last login time
      return await updateLastLogin(username);
    }
  } catch (error) {
    console.error('Error ensuring user exists:', error);
    return false;
  }
}

export function getActiveUsername() {
  const username = localStorage.getItem("username");
  console.log("[getActiveUsername] returning:", username);
  return username || null;
}

/**
 * Set the active username in localStorage
 * @param {string} username - The username to set as active
 */
export function setActiveUsername(username) {
  if (username && username.trim() !== '') {
    localStorage.setItem('username', username.trim());
    console.log('✅ Active username set to:', username.trim());
  } else {
    console.error('❌ Cannot set empty or invalid username:', username);
  }
}

/**
 * Clear the active username from localStorage (logout)
 */
export function clearActiveUsername() {
  localStorage.removeItem('username');
  console.log('🔴 Active username cleared');
}

// Test that the function is properly exported
console.log('✅ user-service.js loaded, getActiveUsername function available:', typeof getActiveUsername);

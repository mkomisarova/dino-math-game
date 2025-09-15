// Score service for Firebase Firestore operations
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase-config.js';


/**
 * Save a user's score to Firestore using deterministic document ID: scores/{mode}_{gameType}_{username}
 * Enforces one document per user per mode/gameType
 * @param {Object} params - The parameters object
 * @param {string} params.username - The username
 * @param {string} params.mode - The game mode (e.g., 'multiplication', 'addition', etc.)
 * @param {string} params.gameType - The game type (e.g., 'mini', 'level')
 * @param {number} params.score - The score to save
 */
export async function saveGlobalScore({ username, mode, gameType, score }) {
  // Validate username - block saving if invalid
  if (!username || username.trim() === '' || typeof username !== 'string') {
    console.error('❌ BLOCKED: Invalid username for score saving:', username);
    return { saved: false, reason: "invalid-username" };
  }
  
  if (!mode || !gameType || typeof score !== "number") {
    console.error('❌ BLOCKED: Invalid parameters for score saving:', { username, mode, gameType, score });
    return { saved: false, reason: "invalid-parameters" };
  }
  
  console.log("Saving score for:", username, "score:", score);
  
  try {
    const docId = `${mode}_${gameType}_${username}`;
    const ref = doc(db, "scores", docId);
    const snap = await getDoc(ref);
    const current = snap.exists() ? snap.data().score : null;
    
    if (current === null || score > current) {
      await setDoc(ref, {
        username,
        mode,
        gameType,
        score,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log(`✅ Score saved successfully for ${username}: ${score}`);
      return { saved: true, reason: "new-or-better" };
    }
    console.log(`⏭️ Score not saved for ${username}: ${score} (not better than ${current})`);
    return { saved: false, reason: "not-better" };
  } catch (error) {
    console.error('❌ Error saving global score:', error);
    throw error;
  }
}

/**
 * Get leaderboard for a specific mode and gameType using flat structure
 * Groups by username and keeps only the highest score per user
 * @param {string} mode - The game mode to get leaderboard for
 * @param {string} gameType - The game type to get leaderboard for
 * @returns {Array} Array of top scores (one per user) for the mode and gameType
 */
export async function getLeaderboard(mode, gameType) {
  try {
    const scoresRef = collection(db, "scores");
    const q = query(
      scoresRef,
      where("mode", "==", mode),
      where("gameType", "==", gameType)
    );
    
    const querySnapshot = await getDocs(q);
    const bestScores = {};
    
    // Group by username and keep only the highest score per user
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!bestScores[data.username] || data.score > bestScores[data.username].score) {
        bestScores[data.username] = {
          id: doc.id,
          username: data.username,
          score: data.score,
          timestamp: data.timestamp
        };
      }
    });
    
    // Convert to array and sort by score descending
    const leaderboard = Object.values(bestScores).sort((a, b) => b.score - a.score);
    
    return leaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
}

/**
 * Get a user's best score for a specific mode and gameType from Firestore using flat structure
 * @param {string} username - The username
 * @param {string} mode - The game mode
 * @param {string} gameType - The game type
 * @returns {number} The user's best score for this mode and gameType
 */
export async function getUserBestScore(username, mode, gameType) {
  try {
    const docId = `${mode}_${gameType}_${username}`;
    const docRef = doc(db, "scores", docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.score || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error getting user best score:', error);
    return 0;
  }
}

/**
 * Set up live leaderboard listener using Firestore onSnapshot
 * De-duplicates scores and keeps only the highest score per user
 * @param {string} mode - The game mode
 * @param {string} gameType - The game type
 * @param {function} onChange - Callback function to handle leaderboard updates
 * @returns {function} Unsubscribe function to stop listening
 */
export function subscribeToLeaderboard(mode, gameType, onChange) {
  try {
    // Pull a generous set; we'll de-dupe client-side.
    const q = query(
      collection(db, "scores"),
      where("mode", "==", mode),
      where("gameType", "==", gameType),
      orderBy("score", "desc"),
      limit(200)
    );

    return onSnapshot(q, (snap) => {
      const bestByUser = new Map();
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        // Keep only the best per username
        const prev = bestByUser.get(d.username);
        if (!prev || d.score > prev.score || (!prev.updatedAt && d.updatedAt)) {
          bestByUser.set(d.username, d);
        }
      });
      const leaderboard = Array.from(bestByUser.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);
      onChange(leaderboard);
    }, (err) => {
      console.error("Error in leaderboard listener:", err);
      onChange([]);
    });
  } catch (error) {
    console.error('Error setting up leaderboard subscription:', error);
    return () => {}; // Return empty unsubscribe function
  }
}

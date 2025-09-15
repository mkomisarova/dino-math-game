// Optional one-time cleanup utility to delete old duplicate docs
// This script is NOT included in the web build and should only be run manually in dev console
// Usage: import('./scripts/cleanupDuplicates.js').then(m => m.cleanupDuplicateScores('multiplication', 'mini'))

import {
  getFirestore, collection, query, where, getDocs, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore();

export async function cleanupDuplicateScores(mode, gameType) {
  console.log(`Starting cleanup for mode: ${mode}, gameType: ${gameType}`);
  
  const q = query(collection(db, "scores"),
    where("mode", "==", mode),
    where("gameType", "==", gameType)
  );
  const snap = await getDocs(q);
  const byUser = {};
  
  snap.forEach(ds => {
    const d = ds.data();
    if (!byUser[d.username] || d.score > byUser[d.username].score) {
      byUser[d.username] = { ...d, _id: ds.id };
    }
  });
  
  // delete everything that isn't the best per user
  const keepIds = new Set(Object.values(byUser).map(x => x._id));
  const deletions = [];
  
  snap.forEach(ds => {
    if (!keepIds.has(ds.id)) {
      deletions.push(deleteDoc(doc(db, "scores", ds.id)));
    }
  });
  
  await Promise.allSettled(deletions);
  
  const result = { 
    deleted: deletions.length,
    kept: keepIds.size,
    total: snap.size
  };
  
  console.log(`Cleanup complete:`, result);
  return result;
}

// Helper function to cleanup all modes and gameTypes
export async function cleanupAllDuplicateScores() {
  const modes = ['multiplication', 'addition', 'subtraction', 'division'];
  const gameTypes = ['mini', 'level'];
  
  const results = {};
  
  for (const mode of modes) {
    for (const gameType of gameTypes) {
      try {
        results[`${mode}_${gameType}`] = await cleanupDuplicateScores(mode, gameType);
      } catch (error) {
        console.error(`Error cleaning up ${mode}_${gameType}:`, error);
        results[`${mode}_${gameType}`] = { error: error.message };
      }
    }
  }
  
  console.log('All cleanup operations completed:', results);
  return results;
}

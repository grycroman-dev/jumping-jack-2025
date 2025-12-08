import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, onDisconnect, set, push, serverTimestamp, query, orderByChild, limitToLast, get, remove } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyDb3wGDfeghj0Y_a935uU8RO1r8hLN09Kw",
    authDomain: "jumping-jack-2025.firebaseapp.com",
    databaseURL: "https://jumping-jack-2025-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "jumping-jack-2025",
    storageBucket: "jumping-jack-2025.firebasestorage.app",
    messagingSenderId: "1040200394914",
    appId: "1:1040200394914:web:6c36b7df02c242bb8a0ffb",
    measurementId: "G-3ZV7301SMD"
};

export class OnlineManager {
    constructor() {
        this.app = null;
        this.db = null;
        this.isConnected = false;

        // Element to display count
        this.displayElement = null;
    }

    init(displayElementId) {
        this.displayElement = document.getElementById(displayElementId);

        try {
            this.app = initializeApp(firebaseConfig);
            this.db = getDatabase(this.app);
            this.setupPresence();
        } catch (e) {
            console.error("Firebase Init Failed:", e);
        }
    }

    setupPresence() {
        // Reference to the special '.info/connected' path
        const connectedRef = ref(this.db, ".info/connected");

        // Reference to our presence list
        const listRef = ref(this.db, "presence");

        // Create a new reference for this user in the list
        const userRef = push(listRef);

        onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // We're connected!
                this.isConnected = true;

                // Add ourselves to the list
                set(userRef, {
                    joined: serverTimestamp(),
                    device: navigator.userAgent
                });

                // Remove ourselves when we disconnect
                onDisconnect(userRef).remove();
            } else {
                this.isConnected = false;
            }
        });

        // Listen for count updates
        onValue(listRef, (snap) => {
            const count = snap.size; // .size returns number of children
            this.updateDisplay(count);
        });
    }

    updateDisplay(count) {
        if (this.displayElement) {
            this.displayElement.innerText = `ONLINE: ${count}`;
            this.displayElement.style.color = '#00FF00';
            this.displayElement.style.textShadow = '0 0 10px #00FF00';
        }
    }

    saveScore(name, score) {
        if (!this.db) {
            return Promise.reject('DB not initialized');
        }
        const scoresRef = ref(this.db, 'scores');

        return push(scoresRef, {
            name: name,
            score: score,
            timestamp: serverTimestamp()
        })
            .then(() => {
                // Cleanup old scores to keep only top 10
                return this.cleanupOldScores();
            })
            .catch((error) => {
                console.error('❌ Failed to save score:', error);
                throw error;
            });
    }

    async cleanupOldScores() {
        if (!this.db) return;

        try {
            const scoresRef = ref(this.db, 'scores');
            const snapshot = await get(scoresRef);

            if (!snapshot.exists()) return;

            // Get all scores with their keys
            const allScores = [];
            snapshot.forEach((child) => {
                allScores.push({
                    key: child.key,
                    ...child.val()
                });
            });

            // Sort by score descending
            allScores.sort((a, b) => b.score - a.score);

            // Keep only top 10, delete the rest
            if (allScores.length > 10) {
                const toDelete = allScores.slice(10);

                const deletePromises = toDelete.map(score => {
                    const scoreRef = ref(this.db, `scores/${score.key}`);
                    return remove(scoreRef);
                });

                await Promise.all(deletePromises);
            }
        } catch (error) {
            console.error('❌ Cleanup failed:', error);
        }
    }

    subscribeToLeaderboard(callback) {
        if (!this.db) return;
        const scoresRef = ref(this.db, 'scores');
        const topScoresQuery = query(scoresRef, orderByChild('score'), limitToLast(15));

        onValue(topScoresQuery, (snapshot) => {
            const scores = [];
            snapshot.forEach((child) => {
                scores.push(child.val());
            });
            // Firebase returns ascending order, so reverse to get highest first
            callback(scores.reverse());
        });
    }
}

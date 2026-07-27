/* ==========================================================================
   Firebase Config & Initialization Manager
   ========================================================================== */

const STORAGE_KEY_FB_CONFIG = 'adlink_hub_firebase_config';

class FirebaseManager {
  constructor() {
    this.app = null;
    this.db = null;
    this.storage = null;
    this.isFirebaseActive = false;
    this.config = this.loadSavedConfig();
    this.initFirebase();
  }

  loadSavedConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FB_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load saved Firebase config:', e);
    }
    // Pre-configured Firebase project for add-banner-hub
    return {
      apiKey: "AIzaSyAj_MCWRf0QdcdCH8SCrTg_SCEKvfkdz2w",
      authDomain: "add-banner-hub.firebaseapp.com",
      projectId: "add-banner-hub",
      storageBucket: "add-banner-hub.firebasestorage.app",
      appId: "1:869539695443:web:5b277b9ea3f80c1dedefa6"
    };
  }

  saveConfig(config) {
    try {
      localStorage.setItem(STORAGE_KEY_FB_CONFIG, JSON.stringify(config));
      this.config = config;
      return this.initFirebase();
    } catch (e) {
      console.error('Failed to save Firebase config:', e);
      return false;
    }
  }

  clearConfig() {
    localStorage.removeItem(STORAGE_KEY_FB_CONFIG);
    this.config = null;
    this.isFirebaseActive = false;
    this.app = null;
    this.db = null;
    this.storage = null;
  }

  initFirebase() {
    if (!this.config || !this.config.apiKey || !this.config.projectId) {
      this.isFirebaseActive = false;
      return false;
    }

    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
          this.app = firebase.initializeApp(this.config);
        } else {
          this.app = firebase.app();
        }
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.isFirebaseActive = true;
        console.log('Firebase initialized successfully with project:', this.config.projectId);
        return true;
      }
    } catch (err) {
      console.error('Firebase initialization error:', err);
      this.isFirebaseActive = false;
      return false;
    }
    return false;
  }
}

// Global Singleton Instance
window.firebaseManager = new FirebaseManager();

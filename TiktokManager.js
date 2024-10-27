// tiktokManager.js
const { WebcastPushConnection } = require("tiktok-live-connector");

class TikTokLiveManager {
  constructor() {
    this.connections = new Map(); // Menyimpan koneksi per socketId
  }

  async connectToLive(username, socketId) {
    try {
      if (this.connections.has(socketId)) {
        console.log(`Reusing existing connection for ${username}`);
        return this.connections.get(socketId);
      }

      const tiktokLiveConnection = new WebcastPushConnection(username, {
        enableExtendedGiftInfo: true,
        requestPollingIntervalMs: 2000,
        retry: { maxAttempts: 3, delay: 1000 },
      });

      this.connections.set(socketId, tiktokLiveConnection);
      return tiktokLiveConnection;
    } catch (error) {
      console.error(`Failed to connect to TikTok Live for ${username}:`, error);
      throw error;
    }
  }

  async disconnectFromLive(socketId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(socketId);
      console.log(`Disconnected TikTok Live for socket ${socketId}`);
    }
  }
}

module.exports = new TikTokLiveManager();

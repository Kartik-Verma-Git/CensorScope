const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbPromise;

async function initDB() {
    if (!dbPromise) {
        dbPromise = open({
            filename: path.join(__dirname, 'censorship.db'),
            driver: sqlite3.Database
        }).then(async (db) => {
            await db.exec(`
                CREATE TABLE IF NOT EXISTS censorship_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    domain TEXT NOT NULL,
                    country TEXT NOT NULL,
                    isBlocked BOOLEAN NOT NULL,
                    blockType TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    confidence INTEGER NOT NULL,
                    lastVerified TEXT NOT NULL,
                    dataSource TEXT NOT NULL,
                    UNIQUE(domain, country)
                )
            `);
            console.log("✅ SQLite Database initialized");
            return db;
        });
    }
    return dbPromise;
}

async function saveResult(domain, result) {
    const db = await initDB();
    await db.run(`
        INSERT INTO censorship_logs (domain, country, isBlocked, blockType, reason, confidence, lastVerified, dataSource)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(domain, country) DO UPDATE SET
            isBlocked = excluded.isBlocked,
            blockType = excluded.blockType,
            reason = excluded.reason,
            confidence = excluded.confidence,
            lastVerified = excluded.lastVerified,
            dataSource = excluded.dataSource
    `, [
        domain, 
        result.country, 
        result.isBlocked, 
        result.blockType, 
        result.reason, 
        result.confidence, 
        result.lastVerified, 
        result.dataSource
    ]);
}

async function getResult(domain, country) {
    const db = await initDB();
    return db.get(`SELECT * FROM censorship_logs WHERE domain = ? AND country = ?`, [domain, country]);
}

module.exports = { initDB, saveResult, getResult };

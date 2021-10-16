require("dotenv").config();
const { Pool } = require("pg");

class PostgresqlDB {
    static singleton;

    constructor() {
        if (!PostgresqlDB.singleton) { this.start(); PostgresqlDB.singleton = this; }
        return PostgresqlDB.singleton;
    }

    async start() {
        this.pool = await new Pool({
            connectionString: process.env.POSTGRESQL_URI,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 0,
            idleTimeoutMillis: 10000,
            max: 1,
        });
        console.log('Start Connection');
    }

    async end() {
        await this.pool.end();
        console.log('End Connection');
    }

    async execute(command) {
        if (this.pool.ended) { await this.start(); }
        try {
            return { "success": true, "data": await this.pool.query(command) };
        } catch (error) {
            console.log('Postgresql DB Error : ', error);
            return { "success": false, "data": null }
        }
    }

    async setPlayer(playerInfo) {
        var { playerID, playerName } = playerInfo;
        const date = new Date().toISOString();
        const command = `INSERT INTO accounts VALUES('${playerID}', '${playerName}', NULL, 0, 0, '${date}', '${date}')`;
        const { success, data } = await this.execute(command);
        return { "success": success, "data": null }
    }

    async existName(playerName) {
        const command = `SELECT * FROM accounts WHERE name LIKE '${playerName}'`;
        const { success, data } = await this.execute(command);
        if (success) {
            return { "success": true, "data": data.rows.length === 1 }
        } else { return { "success": false, "data": null } }
    }

    async getPlayerByName(playerName) {
        const command = `SELECT * FROM accounts WHERE name LIKE '${playerName}'`;
        const { success, data } = await this.execute(command);
        if (success) {
            return { "success": true, "data": data.rows.length !== 0 ? data.rows[0] : null }
        } else { return { "success": false, "data": null } }
    }

    async getPlayerByID(playerID) {
        const command = `SELECT * FROM accounts WHERE id LIKE '${playerID}'`;
        const { success, data } = await this.execute(command);
        if (success) {
            return { "success": true, "data": data.rows.length !== 0 ? data.rows[0] : null }
        } else { return { "success": false, "data": null } }
    }

    async updatePlayerByID(playerInfo) {
        var { playerID, key } = playerInfo;
        if (!this.database.has(playerID)) { return { "success": true, "data": null } }
        var command = null;
        switch (key) {
            case 'win':
                var command = `UPDATE accounts SET win_game = win_game + 1 WHERE id LIKE '${playerID}'`;
                break;
            case 'lose':
                var command = `UPDATE accounts SET lose_game = lose_game + 1 WHERE id LIKE '${playerID}'`;
                break;
            default:
                break;
        }
        if (command === null) { return { "success": true, "data": null } }
        const { success, data } = await this.execute(command);
        return { "success": success, "data": null }
    }
}

class LocalDB {
    static singleton;

    constructor() {
        if (!LocalDB.singleton) { this.database = new Map(); this.initMasterAccount(); LocalDB.singleton = this; }
        return LocalDB.singleton;
    }

    initMasterAccount() {
        const developer = { playerName: "DEVELOPER", playerID: process.env.DEVELOP_PLAYERID }
        this.setPlayer(developer);
    }

    async start() { console.log('Start Connection'); }

    async end() { console.log('End Connection'); }

    async setPlayer(playerInfo) {
        var { playerID, playerName } = playerInfo;
        const date = new Date();
        const player = { id: playerID, name: playerName, email: null, win_game: 0, lose_game: 0, join_date: date, last_date: date }
        this.database.set(playerName, player);
        return { "success": true, "data": null }
    }

    async existName(playerName) {
        return { "success": true, "data": this.database.has(playerName) }
    }

    async getPlayerByName(playerName) {
        return { "success": true, "data": this.database.has(playerName) ? this.database.get(playerName) : null }
    }

    async getPlayerByID(playerID) {
        var player = null;
        this.database.forEach((value) => { if (value.id === playerID) { player = value; } });
        return { "success": true, "data": player }
    }

    async updatePlayerByID(playerInfo) {
        var { playerID, key } = playerInfo;
        if (!this.database.has(playerID)) { return { "success": true, "data": null } }
        switch (key) {
            case 'win':
                (await this.getPlayerByID(playerID)).win_game += 1
                break;
            case 'lose':
                (await this.getPlayerByID(playerID)).lose_game += 1
                break;
            default:
                break;
        }
        return { "success": true, "data": null }
    }
}

module.exports = { PostgresqlDB, LocalDB }
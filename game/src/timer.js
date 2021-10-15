class GameTimer {
    constructor(players) {
        this.players = players;
        this.totalTime = new Map(this.players.map(player => [player, 0]));
        this.lastDate = new Map(this.players.map(player => [player, null]));
    }

    on(player) { this.lastDate.set(player, Date.now()); }

    off(player) {
        var time = Date.now() - this.lastDate.get(player);
        this.totalTime.set(player, this.totalTime.get(player) + time);
        return time
    }

    read(player) { return this.totalTime.get(player) }
}

export class TurnBaseTimer extends GameTimer {
    constructor(players, turnMax) {
        super(players);
        this.turnMax = turnMax;
        this.alive = new Map(this.players.map(player => [player, true]));
    }

    off(player) {
        var time = super.off(player);
        if (this.turnMax < time) { this.alive.set(player, false); }
        return time
    }

    live(player) { return this.alive.get(player) }
}

export class ShieldBaseTimer extends GameTimer {
    constructor(players, shieldMax, healthMax) {
        super(players);
        this.shieldMax = shieldMax;
        this.healthMax = healthMax;
        this.alive = new Map(this.players.map(player => [player, true]));
        this.shield = new Map(this.players.map(player => [player, shieldMax]));
        this.health = new Map(this.players.map(player => [player, healthMax]));
    }

    off(player) {
        var time = super.off(player);
        this.health.set(player, this.health.get(player) - Math.max(this.shield - time, 0));
        if (this.shield < time || this.health < 0) { this.alive.set(player, false); }
        return time
    }

    live(player) { return this.alive.get(player) }
}
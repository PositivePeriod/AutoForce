import { Board } from "./board.js";
import { setColor } from "./color.js";

export class App {
    constructor() {
        this.width = 5;
        this.height = 5;

        this.wait = { "type": null, "func": null, "data": null };
        this.pos = null;

        this.make();
        this.play();

        window.onresize = this.resize;
    }

    resize(event) {
        var innerWidth = window.innerWidth;
        console.log(innerWidth);
    }

    make() {
        this.table = document.createElement("table");
        this.table.setAttribute("id", "game-map")
        for (var i = 0; i < this.width; i++) {
            var row = this.table.insertRow(i);
            for (var j = 0; j < this.height; j++) {
                row.insertCell(j);
            }
        }
        document.body.appendChild(this.table);
        this.clickOn();
    }

    show(IColor, youColor) {
        var myName = this.board.I.name;
        document.getElementById("turn").innerText = `Turn : ${this.board.turn}`;
        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.height; j++) {
                var cell = this.table.rows[j].cells[i];
                cell.innerText = this.board.map[i][j];
                setColor(cell, (this.board.map[i][j] === myName ? IColor : youColor) + `-${this.board.map[i][j]}`);
            }
        }
    }

    showBundle(playerName, bundle) {
        for (const [x, y] of bundle) {
            var cell = this.table.rows[y].cells[x];
            setColor(cell, `choice-${playerName}`);
        }
    }

    async play() {
        this.board = new Board(this.width, this.height);
        this.bundle = this.board.findBundles(this.board.I)[0];
        while (true) {
            var I = this.board.I;
            var you = this.board.you;
            var moves = this.board.findBundleMove(I, this.bundle); // already chosen bundle

            if (moves.size === 0) {
                this.board.deleteBundle(I, this.bundle);
                if (this.board.checkNoPiece(I)) {
                    this.win(you);
                    this.show('need', 'need');
                    return
                } else {
                    this.bundle = this.board.findPieces(I);
                    moves = this.board.findBundleMove(I, this.bundle);
                    if (moves.size === 0) { // bug fix
                        this.win(you);
                        this.show('need', 'need');
                        return
                    }
                }
            }
            this.show('need', 'noNeed');
            this.showBundle(I.name, this.bundle);
            document.getElementById("status").innerText = `Status : ${I.name} select move`;
            if (moves.size === 1 && document.getElementById("uniqueAlert").checked) { alert('Select move automatically because the valid move is unique'); }
            var { piece, dir } = moves.size === 1 ? [...moves][0] : await this.choose("move", [...moves]);
            this.board.movePiece(I, piece, dir);
            if (this.board.checkBaseEnter(I)) { this.win(I); this.show('need', 'need'); return }
            this.show('light', 'need');
            document.getElementById("status").innerText = `Status : ${I.name} select bundle`;
            var bundles = this.board.findBundles(you);
            if (bundles.length === 1 && document.getElementById("uniqueAlert").checked) { alert('Select bundle automatically because the bundle is unique'); }
            this.bundle = bundles.length === 1 ? bundles[0] : await this.choose("bundle", bundles);
            this.board.nextTurn();
            if (document.getElementById("turnAlert").checked) { alert('New turn!'); }
        }
    }

    choose(type, data) { // data : Array
        return new Promise(function (resolve, reject) {
            var check = (chosenDatum) => {
                if (data.some(datum => JSON.stringify(datum) === JSON.stringify(chosenDatum))) {
                    this.wait = { "type": null };
                    resolve(chosenDatum);
                }
            }
            this.wait = { "type": type, "func": check, "data": data };
            // random move for timeout
            // setTimeout(() => { resolve({ "data": undefined, "msg": "timeout" }); }, timeout); 
        }.bind(this));
    }

    clickOn() { this.table.addEventListener("click", this.handleClick.bind(this)); }
    clickOff() { this.table.removeEventListener("click", this.handleClick.bind(this)); }

    handleClick(e) {
        try {
            var td = e.target.closest("td");
            var [x1, y1] = [td.cellIndex, td.parentNode.rowIndex];
        } catch (e) { if (e instanceof TypeError) { return } else { throw e } }
        switch (this.wait.type) {
            case "move":
                if (this.board.map[x1][y1] === this.board.I.name) {
                    var pieceInBundle = [...this.bundle].some(piece => JSON.stringify(piece) === JSON.stringify([x1, y1]));
                    if (pieceInBundle) {
                        this.pos = [x1, y1];
                        this.show('need', 'noNeed');
                        this.showBundle(this.board.I.name, this.bundle);
                        setColor(this.table.rows[y1].cells[x1], `focus-${this.board.I.name}`);
                    }
                } else if (this.board.map[x1][y1] === null && this.pos) {
                    var [x2, y2] = this.pos;
                    if (this.pos && Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1) {
                        this.wait.func({ "piece": this.pos, "dir": [x1 - x2, y1 - y2] });
                        this.pos = null;

                        this.show('need', 'noNeed');
                    }
                }
                break;
            case "bundle":
                if (this.board.map[x1][y1] === this.board.you.name) {
                    var bundle = this.board.findBundleFromPos([x1, y1]);
                    this.show('light', 'need');
                    this.showBundle(this.board.you.name, bundle);
                    if (JSON.stringify(this.pos) === JSON.stringify([x1, y1])) { this.wait.func(bundle); }
                    else { this.pos = [x1, y1]; }
                }
                break;
            case null:
                break;
            default:
                console.log('Error', this.wait.type)
                break;
        }
    }

    win(player) {
        document.getElementById("status").innerText = `Status : ${player.name} win`;
    }
}

window.onload = () => { new App(); };

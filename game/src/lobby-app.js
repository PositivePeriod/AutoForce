import { ClientGameBoard } from "./board.js";
import { setColor } from "./color.js";

export class App {
    constructor(socket, playerIDA, playerIDB) {
        this.width = 5;
        this.height = 5;
        this.wait = { "type": null };
        this.pos = null;

        this.socket = socket;
        this.board = new ClientGameBoard(this.width, this.height, playerIDA, playerIDB);

        this.initDOM();
        this.clickOn();
    }

    initDOM() {
        let label = document.createElement('label');
        label.innerHTML = '<input type="checkbox" id="turnAlert">Alert for new turn';
        document.body.appendChild(label);
        label = document.createElement('label');
        label.innerHTML = '<input type="checkbox" id="uniqueAlert">Alert for unique selection';
        document.body.appendChild(label);
        let h3 = document.createElement('h3');
        h3.setAttribute('id', 'turn');
        h3.innerText = 'Turn :'
        document.body.appendChild(h3);
        h3 = document.createElement('h3');
        h3.setAttribute('id', 'status');
        h3.innerText = 'Status :'
        document.body.appendChild(h3);
        this.table = document.createElement("table");
        this.table.setAttribute("id", "game-map")
        for (var i = 0; i < this.width; i++) {
            var row = this.table.insertRow(i);
            for (var j = 0; j < this.height; j++) {
                row.insertCell(j);
            }
        }
        document.body.appendChild(this.table);
    }

    update(turn, playerMap, colorMap) {
        this.board.turn = turn;
        document.getElementById("turn").innerText = `Turn : ${turn}`;

        this.board.map = playerMap;
        this.board.colorMap = colorMap;
        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.height; j++) {
                var cell = this.table.rows[j].cells[i];
                cell.innerText = this.board.map[i][j];
                setColor(cell, this.board.colorMap[i][j]);
            }
        }
    }

    show(IColor, youColor) {
        var myName = this.board.I.name;
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

    clickOn() { this.table.addEventListener("click", this.handleClick.bind(this)); }
    clickOff() { this.table.removeEventListener("click", this.handleClick.bind(this)); }

    handleClick(e) {
        try {
            var td = e.target.closest("td");
            var [x1, y1] = [td.cellIndex, td.parentNode.rowIndex];
        } catch (e) { if (e instanceof TypeError) { return } else { throw e } }
        console.log('handleClick', x1, y1, this.wait.type);
        switch (this.wait.type) {
            case "move":
                console.log('move check', this.board.map[x1][y1], this.pos, this.wait.data);
                if (this.board.map[x1][y1] === this.board.I.name) {
                    console.log('move1');
                    console.log(this.wait.data);
                    var pieceInBundle = [...this.wait.data].some(piece => JSON.stringify(piece.piece) === JSON.stringify([x1, y1]));
                    if (pieceInBundle) {
                        console.log('move1-1');
                        this.pos = [x1, y1];
                        this.show('need', 'noNeed');
                        this.showBundle(this.board.I.name, this.wait.data.map((move) => move.piece));
                        setColor(this.table.rows[y1].cells[x1], `focus-${this.board.I.name}`);
                    }
                } else if (this.board.map[x1][y1] === null && this.pos) {
                    console.log('move2');
                    var [x2, y2] = this.pos;
                    if (this.pos && Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1) {
                        var chosenMove = { "piece": this.pos, "dir": [x1 - x2, y1 - y2] };
                        if (this.wait.data.some(datum => JSON.stringify(datum) === JSON.stringify(chosenMove))) {
                            this.wait = { "type": null };
                            this.socket.emit('choose', chosenMove);
                        }
                        this.pos = null;
                    }
                }
                break;
            case "bundle":
                if (this.board.map[x1][y1] === this.board.you.name) {
                    console.log('bundle1');
                    var bundle = this.board.findBundleFromPos([x1, y1]);
                    this.show('light', 'need');
                    this.showBundle(this.board.you.name, bundle);
                    if (JSON.stringify(this.pos) === JSON.stringify([x1, y1])) {
                        console.log('bundle1-1');
                        var chosenBundle = bundle;
                        // this.wait.data.forEach(datum => {console.log(JSON.stringify(datum) === JSON.stringify(chosenBundle)
                        console.log(chosenBundle, this.wait.data);
                        if (this.wait.data.some(datum => {
                            // (function (a, b) {return a[0] - b[0] === 0? a[1]-b[1] : a[0] - b[0];})
                            datum.sort(); chosenBundle.sort();
                            return JSON.stringify(datum) === JSON.stringify(chosenBundle)
                        }
                        )) {
                            this.wait = { "type": null };
                            console.log('chooseBUNDLE', chosenBundle)
                            this.socket.emit('choose', chosenBundle);
                        }
                    }
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
}
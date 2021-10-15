const express = require("express");
const socketio = require("socket.io");
const shortid = require("shortid");
const ServerGameBoard = require("./board");

var app = express();
app.use("/", express.static(__dirname));
const port = process.env.PORT || 5000;
var server = app.listen(port, () => { console.log(`Bundle : http://localhost:${port}`); });
var io = socketio(server)

const MSG = Object.freeze({
    CONNECT_SERVER: "connect",
    JOIN_PLAY: "joinPlay",
    REGISTER: "register",

    DISCONNECT_SERVER: "disconnect",
});

const serverDB = new Map([]); //  playerName, playerID - 진짜 db로 바꿀 것
const onlineSocketID = []; // socketID
const gameQueue = [];

async function joinPlay() {
    console.log(this.id, 'waiting in the queue');
    gameQueue.push(this.id);
    if (gameQueue.length >= 2) {
        var player1socketID = gameQueue.shift();
        var player2socketID = gameQueue.shift();
        await startGame(player1socketID, player2socketID);
    }
}

async function startGame(socketIDA, socketIDB) {
    console.log('startGame between', socketIDA, 'and', socketIDB);
    var gameID = shortid.generate();
    var socketA = await io.sockets.sockets.get(socketIDA);
    var socketB = await io.sockets.sockets.get(socketIDB);
    var playerIDA = socketA.data.playerID;
    var playerIDB = socketB.data.playerID;
    socketA.join(gameID);
    socketB.join(gameID);
    io.to(gameID).emit('startGame', { "id": gameID, "players": [playerIDA, playerIDB] });
    await play(gameID, socketA, socketB, playerIDA, playerIDB);
}

async function play(gameID, socketA, socketB, playerIDA, playerIDB) {
    const [width, height] = [5, 5];
    const board = new ServerGameBoard(width, height, playerIDA, playerIDB, socketA, socketB);
    var bundle = board.findBundles(board.I)[0];
    while (true) {
        var I = board.I;
        var you = board.you;
        var moves = board.findBundleMove(I, bundle); // already chosen bundle

        if (moves.length === 0) {
            board.deleteBundle(I, bundle);
            if (board.checkNoPiece(I)) {
                win(you);
                board.color('need', 'need');
                show(gameID, board);
                return
            } else {
                bundle = board.findPieces(I);
                moves = board.findBundleMove(I, bundle);
                if (moves.length === 0) { // bug fix
                    win(you);
                    board.color('need', 'need');
                    show(gameID, board);
                    return
                }
            }
        }
        board.color('need', 'noNeed');
        board.colorBundle(I.name, bundle);
        show(gameID, board);
        alertSocket(gameID, 'status', `Status : ${I.playerID} move piece`)

        if (moves.length === 1) {
            alertSocket(gameID, 'selectionAlert', 'Select move automatically because the valid move is unique');
            var { piece, dir } = moves[0];
        } else { var { piece, dir } = await choose(I, "move", moves); }
        board.movePiece(I, piece, dir);
        if (board.checkBaseEnter(I)) {
            win(I);
            board.color('need', 'need');
            return
        }
        board.color('light', 'need');
        show(gameID, board);

        alertSocket(gameID, 'status', `Status : ${I.playerID} select bundle`)
        var bundles = board.findBundles(you);
        if (bundles.length === 1) {
            alertSocket(gameID, 'selectionAlert', 'Select bundle automatically because the bundle is unique');
            var bundle = bundles[0];
        } else { var bundle = await choose(I, "bundle", bundles); console.log('qwert', bundle); }
        board.nextTurn();
        alertSocket(gameID, 'turnAlert', `New turn`);
    }
}

function win(gameID, player) {
    io.to(gameID).emit('sendMSG', { "type": "win", "msg": `${player.playerID} wins`, "data": player.playerID });
    // process db to store result
}

function show(gameID, board) {
    var data = {
        "turn": board.turn, "playerMap": board.map, "colorMap": board.colorMap
    }
    io.to(gameID).emit('updateGame', data);
}


async function choose(player, type, possibleData) {
    var resolveFunc = null;
    var result = new Promise(function (resolve, reject) {
        resolveFunc = resolve;
        // random move for timeout
        // setTimeout(() => { resolve({ "data": undefined, "msg": "timeout" }); }, timeout);
    })

    player.socket.once("choose", (chosenDatum) => {
        // 순환 불가능한 거나 주거나 양식 안 맞는 거 줘서 서버 터질 수도...
        switch (type) {
            case "move":
                if (possibleData.some((datum) => { return JSON.stringify(datum) === JSON.stringify(chosenDatum) })) {
                    resolveFunc(chosenDatum);
                }
                break;
            case "bundle":
                if (possibleData.some((datum) => {
                    datum.sort(); chosenDatum.sort();
                    return JSON.stringify(datum) === JSON.stringify(chosenDatum)
                })) {
                    resolveFunc(chosenDatum);
                }
                break;
            default:
                break;
        }
        resolveFunc(chosenDatum[Math.floor(Math.random() * chosenDatum.length)]);
    });
    player.socket.emit("choose", { "type": type, "data": possibleData })
    return result
}


function alertSocket(gameID, type, msg) { io.to(gameID).emit('sendMSG', { "type": type, "msg": msg }); }

function disconnect(reason) {
    console.log(this.id, ' left because ', reason)
    onlineSocketID.delete(this.id);
    // socket.leave('online'); - 이미 disconnect라 나가진 듯
    console.log('server player#', onlineSocketID.length)
    io.to('online').emit('info', { "onlinePlayer": onlineSocketID.length });
    // leave all games, 가능한 모든 room에서 나가기
}

io.on(MSG.CONNECT_SERVER, (socket) => {
    console.log('Connected Socket : ', socket.id);
    onlineSocketID.push(socket.id);
    socket.data.registered = false;

    socket.on('register', (data) => {
        var { type, playerName, playerID } = data;
        if (socket.data.registered) { socket.emit('register', { "success": false, "msg": "Already registered" }); return; }
        switch (type) {
            case "signIn":
                if (!serverDB.has(playerName) && serverDB.has(playerName) === playerID) {
                    socket.emit('register', { "success": false, "msg": "Inexistent playerName" });
                } else if (serverDB.has(playerName) !== playerID) {
                    socket.emit('register', { "success": false, "msg": "Invalid playerID" });
                } else {
                    // login!
                    socket.data.playerID = playerID;
                    socket.data.registered = true;
                    socket.emit('register', { "success": true, "msg": null });
                }
                break;
            case "signUp":
                if (serverDB.has(playerName)) {
                    socket.emit('register', { "success": false, "msg": "Existent playerName" });
                } else {
                    // 실제로는 이메일 등록 안 하면 지워지는 걸로?
                    const playerID = shortid.generate();
                    serverDB.set(playerName, playerID);
                    // login!
                    socket.data.playerID = playerID;
                    socket.data.registered = true;
                    socket.emit('register', { "success": true, "msg": null, "playerID": playerID });
                }
                break;
            default:
                break;
        }

        if (socket.data.registered) {
            socket.join('online');
            console.log('#Server Player : ', onlineSocketID.length)
            io.to('online').emit('info', { "onlinePlayer": onlineSocketID.length });
            socket.on(MSG.JOIN_PLAY, joinPlay.bind(socket));
            socket.on(MSG.DISCONNECT_SERVER, disconnect.bind(socket));
        }
    })
});

// 시간 지나면 ping timeout으로 튕기기는 하는데
// 바로 안 나가지는 경우가 존재!

// V4ORbKpNAAAJ  left because  transport close
// server player# 1
// KaclNCji6IKGQvr7AAAB  left because  ping timeout
// server player# 0
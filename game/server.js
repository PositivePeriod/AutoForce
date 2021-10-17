const express = require("express");
const socketio = require("socket.io");
const { nanoid } = require('nanoid');
const ServerGameBoard = require("./board");
const { PostgresqlDB, LocalDB } = require("./database");

var app = express();
app.use("/", express.static(__dirname));

// 404 처리
const port = process.env.PORT || 5000;
var server = app.listen(port, () => { console.log(`Bundle : http://localhost:${port}`); });
var io = socketio(server);

const gameBoard = new Map();

async function play(gameID, socketA, socketB) {
    const [width, height] = [5, 5];
    const board = new ServerGameBoard(width, height, socketA, socketB);
    gameBoard.set(gameID, board);
    var bundle = board.findBundles(board.I)[0];
    while (gameBoard.has(gameID) && !board.ended) {
        var [I, you] = [board.I, board.you];
        var moves = board.findBundleMove(I, bundle); // already chosen bundle
        if (moves.length === 0) {
            board.deleteBundle(I, bundle);
            if (board.checkNoPiece(I)) { await win(gameID, you.playerName); return; }
            else {
                bundle = board.findPieces(I); // use all pieces as bundle in pieces
                moves = board.findBundleMove(I, bundle);
                if (moves.length === 0) { await win(gameID, you.playerName); return; }
            }
        }
        board.color('need', 'noNeed');
        board.colorBundle(I.name, bundle);
        show(gameID);
        alertSocket(gameID, 'status', `Status : ${I.playerName} move piece`)

        if (moves.length === 1) {
            alertSocket(gameID, 'selectionAlert', 'Select move automatically because the valid move is unique');
            var { piece, dir } = moves[0];
        } else { var { piece, dir } = await choose(I, "move", moves); }
        board.movePiece(I, piece, dir);
        if (board.checkBaseEnter(I)) { await win(gameID, I.playerName); return; }
        board.color('light', 'need');
        show(gameID);
        alertSocket(gameID, 'status', `Status : ${I.playerName} select bundle`);
        var bundles = board.findBundles(you);
        if (bundles.length === 1) {
            alertSocket(gameID, 'selectionAlert', 'Select bundle automatically because the bundle is unique');
            var bundle = bundles[0];
        } else { var bundle = await choose(I, "bundle", bundles); console.log('qwert', bundle); }
        board.nextTurn();
        alertSocket(gameID, 'turnAlert', `New turn`);
    }
}

async function win(gameID, playerName) {
    const board = gameBoard.get(gameID);
    if (!board) { return; }
    var { unknownNames, winnerNames, loserNames } = board.win(playerName);
    await finishGame(gameID, winnerNames, [...unknownNames, ...loserNames]); // only for 1vs1
}

async function lose(gameID, playerName) {
    const board = gameBoard.get(gameID);
    if (!board) { return; }
    var { unknownNames, winnerNames, loserNames } = board.lose(playerName);
    await finishGame(gameID, [...unknownNames, ...winnerNames], [...loserNames]); // only for 1vs1}
}

async function finishGame(gameID, winnerNames, loserNames) {
    const board = gameBoard.get(gameID);
    board.color('need', 'need'); show(gameID);
    io.to(gameID).emit('sendMSG', {
        "type": "win",
        "msg": `${winnerNames} win ${loserNames} lose`,
        "data": { winnerNames: winnerNames, loserNames: loserNames }
    });
    console.log(`Game ${gameID} finish : ${winnerNames} win, ${loserNames} lose`);
    for (const player of board.players) { player.socket.data.gameID = null; }
    gameBoard.delete(gameID);
    for (const winnerName of winnerNames) {
        const { success } = await DB.updatePlayerByID({ key: "win", playerName: winnerName });
        if (!success) { console.log('could not save, server problem'); }
    }
    for (const loserName of loserNames) {
        const { success } = await DB.updatePlayerByID({ key: "lose", playerName: loserName });
        if (!success) { console.log('could not save, server problem'); }
    }
    io.socketsLeave(gameID);
}

function show(gameID) {
    if (gameBoard.has(gameID)) {
        const board = gameBoard.get(gameID);
        if (!board.ended) {
            var data = { "turn": board.turn, "playerMap": board.map, "colorMap": board.colorMap }
            io.to(gameID).emit('updateGame', data);
        }
    }
}

async function choose(player, type, possibleData) {
    var resolveFunc = null;
    var result = new Promise(function (resolve, reject) {
        resolveFunc = resolve;
        // random move for timeout
        // setTimeout(() => { resolve({ "data": undefined, "msg": "timeout" }); }, timeout);
    });

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

const DB = new PostgresqlDB();
const onlineSockets = new Set([]); // Array[socketID]
const publicGameQueue = []; // Array[socketID] waiting for game

const validPlayerName = (name) => typeof name === 'string' && 3 <= name.length && name.length <= 20 && /^[0-9a-zA-Z_-]+$/.test(name);
const validPlayerID = (id) => typeof id === 'string' && id.length === 21 && /^[0-9a-zA-Z_-]+$/.test(id);
const callbackToSend = (socket, event, callback) => (response) => { if (callback) { callback(response); } else { socket.emit(event, response); }; };
const sendTosendError = (send) => (msg) => { console.log('Error', msg); send({ "success": false, "msg": "Server Problem" }); }

io.on("connect", async (socket) => {
    console.log('Connected Socket : ', socket.id);
    socket.data.registered = false;

    socket.on('register', async (data, callback) => {
        var { type, playerName, playerID } = data;
        // callback 실행시 매우 큰 보안 문제 발생 가능성? , 같은 채널로 보낸 이후 반대쪽에 socket.once로 받아서 promise 처리하는 것이 더 안전할 것
        const send = callbackToSend(socket, 'register', callback);
        const sendError = sendTosendError(send);
        const saveRegisteredInfo = (name, id) => {
            console.log(`Socket Registered as ${name}`);
            socket.data.playerID = id;
            socket.data.playerName = name;
            socket.data.registered = true;
        }

        const validType = typeof type === 'string' && ['signIn', 'signUp'].includes(type);
        if (!validType) { send({ "success": false, "msg": "Invalid type" }); return; }
        if (!validPlayerName(playerName)) {
            if (!(3 <= playerName.length && playerName.length <= 20)) { send({ "success": false, "msg": "PlayerName length should be 3 ~ 20" }); return; }
            if (!(/^[0-9a-zA-Z_-]+$/.test(playerName))) { send({ "success": false, "msg": "PlayerName should only contains alphabet, number, _ and -" }); return; }
            send({ "success": false, "msg": "Invalid playerName" }); return;
        }
        if (socket.data.registered) { send({ "success": false, "msg": "Already registered socket" }); return; }
        switch (type) {
            case "signIn":
                if (!validPlayerID(playerID)) { send({ "success": false, "msg": "Invalid playerName" }); return; }
                var checkExistence = await DB.existName(playerName);
                if (!checkExistence.success) { sendError('signIn checkExistence'); return; }
                if (!checkExistence.data) { send({ "success": false, "msg": "Inexistent playerName" }); return; }

                var checkValidity = await DB.getPlayerByName(playerName);
                if (!checkValidity.success) { sendError('signIn checkValidity'); return; }
                if (checkValidity.data.id !== playerID) { send({ "success": false, "msg": "Invalid playerID" }); return; }

                var allSockets = await io.sockets.sockets;
                for (const [socketID, socket] of [...allSockets]) {
                    // console.log(socket.data);
                    if (socket.data.playerName === playerName) {
                        socket.disconnect();
                        if (socket.data.gameID) {
                            console.log('alertSocket disconnected', `Player ${socket.data.playerName} disconnected`);
                            alertSocket(socket.data.gameID, 'alert', `Player ${socket.data.playerName} disconnected`);
                            await lose(socket.data.gameID, socket.data.playerName);
                        }
                        if (publicGameQueue.includes(socket.id)) {
                            const index = publicGameQueue.indexOf(socket.id);
                            if (index !== -1) { publicGameQueue.splice(index, 1); }
                        }
                        onlineSockets.delete(socket.id);
                        console.log('#Server Player : ', onlineSockets.size);
                        io.to('online').emit('sendMSG', { "type": "onlinePlayer", "msg": onlineSockets.size });
                        // socket.leave('online'); - 이미 disconnect라 나가진 듯
                        // leave all games, 가능한 모든 room에서 나가기
                    }
                }
                saveRegisteredInfo(playerName, playerID);
                send({ "success": true, "msg": null }); return;
                break;
            case "signUp":
                var checkExistence = await DB.existName(playerName);
                if (!checkExistence.success) { sendError('signUp checkExistence'); return; }
                if (checkExistence.data) { send({ "success": false, "msg": "Existent playerName" }); return; }

                // 실제로는 이메일 등록 안 하고 오래 지나면 지워지는 걸로? -> 등록하도록 안내!
                var playerID = nanoid();
                let result = await DB.setPlayer({ playerName: playerName, playerID: playerID });
                if (!result.success) { sendError('signUp result'); return; }

                saveRegisteredInfo(playerName, playerID);
                send({ "success": true, "msg": null, "playerID": playerID }); return;
                break;
            default:
                console.log('Unexpected type not in [signIn, signUp] : ', type)
                send({ "success": false, "msg": "Invalid type" }); return;
                break;
        }
    });

    socket.on('online', async (callback) => { // not open api? 필요없을지도? - game 하겠다는 의지를 가진 사람으로 한정시켜도 될 듯
        const send = callbackToSend(socket, 'online', callback);
        if (!socket.data.registered) { send({ "success": false, "msg": "Not registered" }); return; }
        if (socket.data.online) { send({ "success": false, "msg": "Already online" }); return; }
        socket.data.online = true;
        send({ "success": true, "msg": null });
        // make into class function
        onlineSockets.add(socket.id);
        await socket.join('online');
        console.log('Number of Server Player : ', onlineSockets.size);
        io.to('online').emit('sendMSG', { "type": "onlinePlayer", "msg": onlineSockets.size });
    });

    socket.on("joinPublicGame", async (callback) => {
        const send = callbackToSend(socket, 'joinPublicGame', callback);
        if (!socket.data.registered) { send({ "success": false, "msg": "Not registered" }); return; }
        if (!socket.data.online) { send({ "success": false, "msg": "Not online" }); return; }
        if (publicGameQueue.includes(socket.id)) { send({ "success": true, "msg": "Success but already joined" }); return; }
        publicGameQueue.push(socket.id);
        send({ "success": true, "msg": null });
        console.log(`Join PublicGameQueue : socketID ${socket.data.playerName}`);
        if (publicGameQueue.length >= 2) {
            // 가능하다면 async.queue로 바꾸기
            // 낮은 확률로 3에서 1로 되면서 parallel 문제?, 병렬 문제도... queue 스스로 빼는 것이 나을 듯
            var [socketIDA, socketIDB] = [publicGameQueue.shift(), publicGameQueue.shift()];
            var gameID = nanoid();
            var socketA = await io.sockets.sockets.get(socketIDA); socketA.join(gameID); socketA.data.gameID = gameID;
            var socketB = await io.sockets.sockets.get(socketIDB); socketB.join(gameID); socketB.data.gameID = gameID;
            console.log(io.of(gameID).sockets);
            console.log(`Game ${gameID} Start : ${socketA.data.playerName} ${socketB.data.playerName}`);
            io.to(gameID).emit('startGame', { "id": gameID, "players": [socketA.data.playerName, socketB.data.playerName] });
            await play(gameID, socketA, socketB);
        }
    });

    socket.on("leavePublicGame", async (callback) => {
        // need to register check? i don't think so
        const send = callbackToSend(socket, 'leavePublicGame', callback);
        const index = publicGameQueue.indexOf(socket.id);
        if (index !== -1) {
            publicGameQueue.splice(index, 1);
            send({ "success": true, "msg": null }); return;
        }
        else { send({ "success": true, "msg": "Success but acutally not joined" }); return; }
    });

    socket.on("playerInfo", async function (data, callback) {
        const send = callbackToSend(socket, 'playerInfo', callback);
        const sendError = sendTosendError(send);
        var { playerName } = data;

        if (!socket.data.registered) { send({ "success": false, "msg": "No registered" }); return; }
        if (!validPlayerName(playerName)) { send({ "success": false, "msg": "Invalid playerName" }); return; }
        var { success, data } = await DB.getPlayerByName(playerName);
        if (!success) { sendError('playerInfo'); return; }
        if (data === null) { send({ "success": false, "msg": "Inexistent playerName" }); } // TODO rename msg -> data
        else {
            var { name, win_game, lose_game, join_date, last_date } = data;
            var playerInfo = { playerName: name, win: win_game, lose: lose_game, join: join_date, last: last_date, };
            send({ "success": true, "msg": playerInfo });
        }
        return;
    });

    socket.on("disconnect", async (reason) => {
        console.log(`Socket left : ${socket.data.playerName} : ${reason}`);
        if (socket.data.gameID) {
            console.log('alertSocket disconnected', `Player ${socket.data.playerName} disconnected`);
            alertSocket(socket.data.gameID, 'alert', `Player ${socket.data.playerName} disconnected`);
            await lose(socket.data.gameID, socket.data.playerName);
        }
        if (publicGameQueue.includes(socket.id)) {
            const index = publicGameQueue.indexOf(socket.id);
            if (index !== -1) { publicGameQueue.splice(index, 1); }
        }
        onlineSockets.delete(socket.id);
        console.log('#Server Player : ', onlineSockets.size);
        io.to('online').emit('sendMSG', { "type": "onlinePlayer", "msg": onlineSockets.size });
        // socket.leave('online'); - 이미 disconnect라 나가진 듯
        // leave all games, 가능한 모든 room에서 나가기
    });
});

// 시간 지나면 ping timeout으로 튕기기는 하는데
// 바로 안 나가지는 경우가 존재!

// V4ORbKpNAAAJ  left because  transport close
// server player# 1
// KaclNCji6IKGQvr7AAAB  left because  ping timeout
// server player# 0
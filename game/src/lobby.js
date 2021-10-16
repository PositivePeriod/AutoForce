import { loadCookie, saveCookie, backupCookie } from "./cookie.js";
import { App } from "./lobby-app.js"

var app;

var playerNameElement = document.getElementById('playerName');
var registerButtonElement = document.getElementById('register');
registerButtonElement.onclick = main


function response(socket, event, ...args) {
    var resolveFunc = null;
    var result = new Promise(function (resolve, reject) { resolveFunc = resolve; });
    socket.emit(event, ...args, function (func, response) { func(response); }.bind(null, resolveFunc));
    return result
}

const logElem = document.getElementById('log');
function updateLog(msg) { logElem.innerText += '\n' + msg; logElem.scrollTop = logElem.scrollHeight; }

async function main() {
    console.log('main Start!');
    // console.log(window.location.host);
    var socket = io(window.location.host);
    // connected
    socket.on("connect", () => { updateLog('connected as ' + socket.id); });
    // register
    socket.registered = false;
    var { playerID, playerName } = loadCookie();
    console.log('Saved playerID', playerID);
    console.log('Saved playerName', playerName);
    var type = playerID === null ? 'signUp' : 'signIn';
    const saveInfo = (name, id) => {
        socket.registered = true;
        playerNameElement.innerText = `PlayerName : ${name}`;
        console.log(`PlayerName : ${name}\nplayerID : ${id}\nDo not share playerID\nOther people can use it to impersonate you`);
    }
    while (!socket.registered) {
        switch (type) {
            case "signIn":
                var { success, msg } = await response(socket, "register", { "type": "signIn", "playerName": playerName, "playerID": playerID });
                if (success) { saveInfo(playerName, playerID); }
                else {
                    console.log(msg);
                    alert(msg);
                    if (msg === 'Server Problem') { console.log('stop'); return; }
                    alert('Failed to login; make new account');
                    backupCookie();
                    type = 'signUp';
                }
                break;
            case "signUp":
                while (!socket.registered) {
                    var newPlayerName = window.prompt("Make Your Own Name!");
                    if (newPlayerName) {
                        var { success, msg, playerID } = await response(socket, "register", { "type": "signUp", "playerName": newPlayerName });
                        if (success) { saveInfo(newPlayerName, playerID); saveCookie(newPlayerName, playerID) } else { alert(msg); }
                    }
                }
                break;
        }
    }
    updateLog(`Registered : ${playerID}`);
    var { success, msg } = await response(socket, "online");
    if (success) { updateLog(`Online : ${playerID}`); } else { console.log('online fail', msg); }
    var { success, msg } = await response(socket, "playerInfo", { playerName: playerName });
    console.log(success, msg);
    if (success) { var { win, lose, join, last } = msg; updateLog(`Win Lose Ratio : ${win} ${lose} ${lose !== 0 ? win / lose : `Perfect ${win}`}`); updateLog(`Join Date - Last Date: ${new Date(join).toDateString()} ${new Date(last).toDateString()}`); }
    else { console.log('get my playerInfo fail', msg); }

    socket.on("info", (data) => {
        var { onlinePlayer } = data;
        updateLog(`Server players : ${onlinePlayer}`);
    })

    socket.on('startGame', (data) => {
        var { id, players } = data;
        var [playerAID, playerBID] = players;
        updateLog(`Game id ${id} starts! between ${players}`);
        app = new App(socket, playerAID, playerBID);
    });
    socket.on('sendMSG', (data) => {
        switch (data.type) {
            case "status":
            case "win":
                document.getElementById("status").innerText = data.msg;
                break;
            case "turnAlert":
                if (document.getElementById("turnAlert").checked) { alert(data.msg); }
                break;
            case "selectionAlert":
                if (document.getElementById("uniqueAlert").checked) { alert(data.msg); }
                break;
            default:
                console.log('Unexprected MSG : ', data);
                break;
        }
    })

    socket.on("updateGame", (data) => {
        var { turn, playerMap, colorMap } = data;
        app.update(turn, playerMap, colorMap);
    })
    socket.on("choose", (data) => { app.wait = data; })

    socket.on("disconnect", () => { updateLog('disconnected\n' + '-'.repeat(50)); });

    document.getElementById('join').addEventListener('click', async () => {
        var { success, msg } = await response(socket, "publicGame");
        if (success) { updateLog('waiting queue'); }
        else { console.log(msg); }
    });
}

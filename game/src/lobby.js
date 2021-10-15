import { getCookie, setCookie } from "./cookie.js";
import { App } from "./lobby-app.js"

const button = document.getElementById('join');
const logElem = document.getElementById('log');

function prepareSocket() {
    console.log('clicked!!!!');
    // console.log(window.location.host);
    var socket = io(window.location.host);
    // connected

    socket.on("connect", () => {
        logElem.innerText += '\nconnected as ' + socket.id;
        logElem.scrollTop = logElem.scrollHeight;
    });

    // register
    var playerID = getCookie('_playerID');
    if (playerID) {
        var playerName = getCookie('_playerName');
        socket.emit("register", { "type": "signIn", "playerName": playerName, "playerID": playerID });
    } else {
        socket.emit("register", { "type": "signUp", "playerName": playerName}, );
        setCookie('_playerID', playerID);
        setCookie('_playerName', playerName);
    }

    socket.on("register", (data) => {
        var { success, msg } = data;
        if (!success) { alert(msg); return; }

        logElem.innerText += `\nRegistered : ${playerID}`;
        logElem.scrollTop = logElem.scrollHeight;
    });

    socket.on("info", (data) => {
        var { onlinePlayer } = data;
        logElem.innerText += `\nServer players : ${onlinePlayer}`;
        logElem.scrollTop = logElem.scrollHeight;
    })

    socket.on('startGame', (data) => {
        var { id, players } = data;
        var [playerAID, playerBID] = players;
        logElem.innerText += `\nGame id ${id} starts! between ${players}`;
        logElem.scrollTop = logElem.scrollHeight;
        var app = new App(socket, playerAID, playerBID);
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
            console.log('turn', turn, playerMap, colorMap);
            app.update(turn, playerMap, colorMap);
        })

        socket.on("choose", (data) => {
            console.log('choose', data);
            app.wait = data;
        })
    });

    socket.on("disconnect", () => {
        console.log('disconnected');
        logElem.innerText += '\ndisconnected';
        logElem.innerText += '\n' + '-'.repeat(50);
        logElem.scrollTop = logElem.scrollHeight;
    });
    return socket
}

function joinQueue(event) {
    // this === socket
    this.emit("joinPlay", null);
    logElem.innerText += '\nwaiting queue';
    logElem.scrollTop = logElem.scrollHeight;
}

function main() {
    console.log('main start!')
    var socket = prepareSocket();
    button.addEventListener('click', joinQueue.bind(socket));
}
window.onload = main;
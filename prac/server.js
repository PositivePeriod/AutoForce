const socketio = require('socket.io');
const express = require("express");

var app = express();
app.use("/", express.static(__dirname));
const port = process.env.PORT || 8090;
var server = app.listen(port, () => { console.log(`Bundle : http://localhost:${port}`); });
var io = socketio(server)

io.on('connection', function (socket) {
    console.log('New socket connected to server : ', socket.id)
    socket.on('ferret', function (arg, ack) {
        console.log("arg : ", arg);
        console.log('Just written in server')
        ack('Response from server! 2');
    });
});
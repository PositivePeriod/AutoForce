const { PostgresqlDB, LocalDB } = require("../game/database");

var DBManager = new LocalDB();
var post = new PostgresqlDB();
var local = new LocalDB();

function singletonCheck() {
    console.log(new PostgresqlDB() === new PostgresqlDB());
}

async function test1() {
    var nameList = ['qwe', '1234', 'DEVELOPER', 'ewfrgty7eej5hs4535hw6j']
    for (const name of nameList) {
        var a = await DBManager.existName(name);
        console.log(name, a);
        // console.log(DBManager.pool.totalCount, DBManager.pool.waitingCount);
    }
}

function test1wrap() {
    qwerty();
    qwerty();
    qwerty();
    console.log(1234);
    // DBManager.pool.end();
    console.log('end connection');
}
async function test2() {
    // console.log(DBManager.pool.ended);
    await DBManager.end();
    // console.log(DBManager.pool.ended);
    console.log(await DBManager.getPlayerByName('DEVELOPER')); // player object
    console.log(await DBManager.getPlayerByID('AKCOviCah32K7pJKbMimL')); // player object
    console.log(await DBManager.getPlayerByName('lp')); // null
    console.log(await DBManager.getPlayerByID('lp')); // null
    console.log(await DBManager.existName('DEVELOPER')); // true
    console.log(await DBManager.existName('AKCOviCah32K7pJKbMimL')); // false
}

async function test3() {
    var playerInfo = { playerName: 'client1', playerID: 'exampleid' }
    console.log(await DBManager.setPlayer(playerInfo));
    console.log(await DBManager.getPlayerByName('client1'));
    console.log(await DBManager.getPlayerByID('exampleid'));
}

async function test4() {
    // var d = await post.getPlayerByName('client1');
    // console.log(d.data.join_date, typeof d.data.join_date);
    var playerInfo = { playerName: 'client2', playerID: 'examplkokoeid' }
    console.log(await local.setPlayer(playerInfo));
    var playerInfo = { playerName: 'DEVELOPER', playerID: 'AKCOviCah32K7pJKbMimL' }
    console.log(await local.setPlayer(playerInfo));
    var d = await local.getPlayerByName('client2');
    console.log(d.data.join_date, typeof d.data.join_date);
    console.log(await DBManager.getPlayerByName('DEVELOPER'));
    console.log(await DBManager.getPlayerByID('AKCOviCah32K7pJKbMimL'));
    console.log(await DBManager.getPlayerByName('lp'));
    console.log(await DBManager.getPlayerByID('lp'));
    console.log(await DBManager.existName('DEVELOPER')); // t
    console.log(await DBManager.existName('AKCOviCah32K7pJKbMimL'));
    console.log(await DBManager.getPlayerByName('DEVELOPER'));
}

test4();
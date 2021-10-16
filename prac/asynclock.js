var AsyncLock = require('async-lock');
var lock = new AsyncLock();

function operation(id) {
    var outside = null;
    console.log(id + " calling operation");
    lock.acquire(id, async function (done) {
        console.log(id + " Running operation")
        setTimeout(function () {
            console.log(id + " Finishing operation")
            done();
        }, 1000)
        outside = 12345;
    }, function (err, ret) {
        console.log(id + " Freeing lock", outside)
    });
}


operation('key1'); // will Run
operation('key1'); // will Wait the 1st
operation('key2'); // will Run Paralell with the 1st
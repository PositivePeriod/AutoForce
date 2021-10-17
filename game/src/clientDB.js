// https://stackoverflow.com/questions/14573223/set-cookie-and-get-cookie-with-javascript

function setCookie(name, value, days = 365 * 5) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') { c = c.substring(1, c.length); }
        if (c.indexOf(nameEQ) == 0) { return c.substring(nameEQ.length, c.length); }
    }
    return null;
}

function eraseCookie(name) { document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/' }

export function loadCookie() { return { playerID: getCookie('_playerID'), playerName: getCookie('_playerName') } }
export function saveCookie(data) { var { playerID, playerName } = data; setCookie('_playerID', playerID); setCookie('_playerName', playerName); }
export function backupCookie() {
    setCookie(`_playerID_${new Date().toISOString()}`, getCookie('_playerID'));
    setCookie(`_playerName_${new Date().toISOString()}`, getCookie('_playerName'));
    eraseCookie('_playerID'); eraseCookie('_playerName');
}

export function loadStorage() { return { playerID: localStorage.getItem('_playerID'), playerName: localStorage.getItem('_playerName') } }
export function saveStorage(data) { var { playerID, playerName } = data; localStorage.setItem('_playerID', playerID); localStorage.setItem('_playerName', playerName); }
export function backupStorage() {
    if (localStorage.getItem('_playerID') !== null && localStorage.getItem('_playerName') !== null) {
        localStorage.setItem(`_playerID_${new Date().toISOString()}`, localStorage.getItem('_playerID'));
        localStorage.setItem(`_playerName_${new Date().toISOString()}`, localStorage.getItem('_playerName'));
    }
    localStorage.removeItem('_playerID'); localStorage.removeItem('_playerName');
}
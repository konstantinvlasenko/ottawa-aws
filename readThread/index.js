'use strict';
let http = require('http');
exports.handler = (event, context, callback) => {
    const req = http.get('http://forum.chesstalk.com/showthread.php?14722-2016-Eastern-Ontario-Open-June-24-26', (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            findpgn(body);
            callback();
        });
    });
    req.on('error', callback);
};
function findpgn(body, callback){
    var _regex = /\[Event .*?(1\/2-1\/2|1-1\/2|1\/2-1|1-0|0-1)<br.*?>\\r\\n/g;
    var _found = body.match(_regex);
    _found.forEach((pgn) => {
        console.log(pgn.replace(/<br.*?>\\r\\n/g, ' ').replace(/&quot;/g,'"'));
    });
}
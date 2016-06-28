'use strict';
const AWS = require('aws-sdk');
let http = require('http');
const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
exports.handler = (event, context, callback) => {
  //event.Records = [{eventName: 'INSERT', dynamodb: { Keys: { href: { S: 'http://forum.chesstalk.com/showthread.php?6080-Montreal-Pere-Noel-2nd-round'}}}}];// - 6
  //event.Records = [{eventName: 'INSERT', dynamodb: { Keys: { href: { S: 'http://forum.chesstalk.com/showthread.php?14408-Quebec-Carnival-tournament-after-round-1'}}}}];// - 18
  //event.Records = [{eventName: 'INSERT', dynamodb: { Keys: { href: { S: 'http://forum.chesstalk.com/showthread.php?10270-Eric-Hansen-Sam-Shankland-incredible-finish!'}}}}];// - 1 full game
  //event.Records = [{eventName: 'INSERT', dynamodb: { Keys: { href: { S: 'http://forum.chesstalk.com/showthread.php?522-CanBase-II-Canadian-games-database-update'}}}}];// - 1/2-\r\n1/2
  processRecords(event, (err) => {
    if (err) callback(err);
    else callback();
  });
};
function processRecords(event, callback){
  if(event.Records.length > 0){
    var _rec = event.Records.shift();
    if(_rec.eventName === 'INSERT'){
      let _url = _rec.dynamodb.Keys.href.S;
      //console.log(_url);  
      const req = http.get(_url, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          var _games = unique(findGames(body, _url));
            updateCount(_url, _games.length, (err) => {
              if (err) callback(err);
              else {
                saveGames(_games, (err) => {
                  if (err) {
                      console.log(_url);
                      callback(err);
                  }
                  else processRecords(event, callback); 
                });
              }
            });
        });
      });
      req.on('error', callback);
    }else callback();
  }else callback();
}
function findGames(body, url){
  body = body.replace(/<[^>]*>/ig, '');
  let _games = [];
  let _regex = /(?:\\r\\n)(\[Event .*?(1\/2-1\/2|1\/2-\\r\\n1\/2|1-1\/2|1\/2-1|1-0|0-1))\\r\\n/g;
  let _match = _regex.exec(body);
  while(_match !== null){
    let _pgn = _match[1].replace(/&quot;/g,'"');
    /* delete recursive annotation variations */
    let rav_regex = /(\([^\(\)]+\))+?/g;
    while (rav_regex.test(_pgn)) {
        _pgn = _pgn.replace(rav_regex, '');
    }
    rav_regex = /({[^{}]+})+?/g;
    while (rav_regex.test(_pgn)) {
        _pgn = _pgn.replace(rav_regex, '');
    }
    let _game = PGN2JSON(_pgn);
    _game.url = url;
    _game.id = _game.Date + '|' + _game.White + '|' + _game.Black;
    _games.push({ PutRequest: { Item: _game } });
    _match = _regex.exec(body);
  }
  return _games;
}
function PGN2JSON(pgn){
    let _regex = /^(\[(.|\\r\\n)*\])(\\r\\n)*({.*?})?\s?\.*\d+?\.(\\r\\n|.)*$/g;   
    /* get header part of the PGN file */
    //let _match = _regex.exec(pgn);
    let _headerString = pgn.replace(_regex, '$1');
    let _headers = _headerString.split(/\\r\\n/);
    let _game = {};
    for (var i = 0; i < _headers.length; i++) {
      let key = _headers[i].replace(/^\[([A-Z][A-Za-z]*)\s.*\]$/, '$1');
      let value = _headers[i].replace(/^\[[A-Za-z]+\s"(.*)"\]$/, '$1');
      if (trim(key).length > 0 && value !== '' && value !== '?' && value !== null ) {
        _game[trim(key)] = value;
      }
    }
    /* delete header to get the moves */
    _game.moves = pgn.replace(_headerString, '').replace(/\\r\\n/g, ' ');
    return _game;
}
function saveGames(games, callback){
  if(games.length > 0){
    let _params = { RequestItems: {} };
    _params.RequestItems.games = games.splice(0, 25);
    dynamodb.batchWrite(_params, (e, data) => {
      if(e) callback(e);
      else saveGames(games, callback);
    });
  } else callback();
}
function unique (putRequests){
    let _result = [];
    putRequests.forEach(function(pr){
        var _duplicate = _result.filter(function(i){
            return (i.PutRequest.Item.id === pr.PutRequest.Item.id);
        });
        if(_duplicate.length === 0) _result.push(pr);
    });
    return _result;
}
function updateCount(url, count, callback){
  let _params = {
    TableName: 'threads',
    Key: { href: url },
    UpdateExpression: 'set games = :val',
    ExpressionAttributeValues: {
      ':val': count     
    }
  };
  dynamodb.update(_params, (e, data) => {
    if(e) callback(e);
    else callback();
  });
}
function trim(str) {
  return str.replace(/^\s+|\s+$/g, '');
}
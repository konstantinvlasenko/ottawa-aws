'use strict';
const AWS = require('aws-sdk');
let http = require('http');
const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
exports.handler = (event, context, callback) => {
  const req = http.get('http://forum.chesstalk.com/showthread.php?14722-2016-Eastern-Ontario-Open-June-24-26', (res) => {
    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      var _games = findGames(body);
      save(_games, (err) => {
        if (err) callback(err);
        else callback();
      });
    });
  });
  req.on('error', callback);
};
function findGames(body, callback){
  let _regex = /\[Event .*?(1\/2-1\/2|1-1\/2|1\/2-1|1-0|0-1)(<br.*?>|)\\r\\n/g;
  let _found = body.match(_regex);
  console.log(_found.length);
  return _found.map((pgn) => {
    let _parts = pgn.replace(/<br.*?>/g, '').replace(/\\r\\n/g, '').replace(/&quot;/g,'"').replace(/\[/g,'').split(']');
    let _game = {};
    _game.moves = _parts.pop();
    _parts.forEach((p) => {
      let _prop = p.split(' "');
      _game[_prop[0]] = _prop[1].slice(0,-1);
    });
    Object.keys(_game).forEach(function(k){
      if(_game[k] === '' || _game[k] === null || (Array.isArray(_game[k]) && _game[k].length === 0)) delete _game[k];
    });
    _game.id = _game.Date + '|' + _game.White + '|' + _game.Black;
    return { PutRequest: { Item: _game } };
  });
}
function save(games, callback){
  if(games.length > 0){
    let _params = { RequestItems: {} };
    _params.RequestItems.games = games.splice(0, 25);
    dynamodb.batchWrite(_params, (e, data) => {
      if(e) callback(e);
      else save(games, callback);
    });
  } else callback();
}
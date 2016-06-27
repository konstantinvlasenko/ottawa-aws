'use strict';
const AWS = require('aws-sdk');
const sns = new AWS.SNS({apiVersion: '2010-03-31'});
const total = 496;

exports.handler = (event, context, callback) => {
  Array.from(Array(total).keys()).slice(1).forEach((page) => {
    let _target = 'http://forum.chesstalk.com/forumdisplay.php?2-ChessTalk-CANADA-S-CHESS-DISCUSSION-BOARD-go-to-www-strategygames-ca-for-your-chess-needs!/page'.concat(page);
    let _params = {
      TopicArn: 'arn:aws:sns:us-west-2:711538466931:CHESS-SNSCHESS-131A3E06KSWTR',
      Message: _target
    };
    sns.publish(_params, (err, data) => {
      if (err) callback(err);
      else callback();
    });
  });
};
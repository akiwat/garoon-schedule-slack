'use strict';

var _ = require('lodash');
var all = {
    user: {
        username: 'garoonuser',
        password: 'garoonpassword'
    },
    targetUsers: [
        { slackuser: 'U0000000000', garoon_id: 0 }
    ],
    cronTime: '00 10,25,40,55 8-22 * * *',
    garoonLoginUrl: 'http://yourhostip/cgi-bin/cbgrn/grn.cgi/v1/auth/login',
    garoonScheduleUrl: 'http://yourhostip/cgi-bin/cbgrn/grn.cgi/v1/schedule/event/list',
    garoonFacilityUrl: 'http://yourhostip/cgi-bin/cbgrn/grn.cgi/v1/schedule/facility/list',
    slackPostMessageUrl: 'https://slack.com/api/chat.postMessage',
    slackBotToken: 'xoxb-...'
}

try {
    var localconf = require('./local.js');
}
catch (e) {
    localconf = {};
}
module.exports = _.merge(all, localconf);

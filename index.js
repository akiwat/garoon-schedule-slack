'use strict';
var config = require('./config.js');
var cron = require('cron').CronJob;
var garoon = require('./garoon.js');

var job = new cron({
    cronTime: config.cronTime,
    onTick: function () {
        garoon(config);
    },
    start: false,
    timeZone: 'Asia/Tokyo'
});
console.log(('Starting the cron job'));
job.start();

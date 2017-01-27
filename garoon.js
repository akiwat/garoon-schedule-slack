'use strict';

var _ = require('lodash');
var util = require('util');
var async = require('async');
var moment = require('moment');
var request = require('request');
request = request.defaults({ jar: true });

module.exports = function (config) {
    async.waterfall([
        //login
        function (next) {
            request.post({
                url: config.garoonLoginUrl,
                json: true,
                body: { username: config.user.username, password: config.user.password }
            }, function (err, res, body) {
                if (err != null) {
                    return next(err);
                } else if (res.statusCode !== 200 && res.statusCode !== 304) {
                    return next(res);
                } else {
                    console.log(body);
                    return next();
                }
            });
        },
        //get facilities
        function (next) {
            request.post({
                url: config.garoonFacilityUrl
            }, function (err, res, body) {
                if (err != null) {
                    return next(err);
                } else if (res.statusCode !== 200 && res.statusCode !== 304) {
                    return next(res);
                } else {
                    // console.log(body);
                    return next(null, JSON.parse(body));
                }
            });
        },
        function (facilities, next) {
            var now = moment();
            var fiveMinutesAfter = now.clone().add(5, 'm');

            async.eachSeries(config.targetUsers,
                function (targetUser, next) {
                    console.log(targetUser.slackuser);
                    request.post({
                        url: config.garoonScheduleUrl,
                        json: true,
                        body: { start: now.utc().format(), end: fiveMinutesAfter.utc().format(), userId: targetUser.garoon_id }
                    }, function (err, res, body) {
                        if (err != null) {
                            return next(err);
                        } else if (res.statusCode !== 200 && res.statusCode !== 304) {
                            return next(res);
                        } else {
                            // console.log(body);
                            async.eachSeries(body.rows, function (row, next) {
                                // skip allday schedule
                                if (row.allDay === true) {
                                    return next();
                                }
                                console.log(row);
                                //設備のidを名前解決する
                                var resolved_facilities = _.map(row.facilities, function (facility_id) {
                                    var entity = _.find(facilities.rows, { id: facility_id });
                                    if (entity != null) {
                                        return entity.name;
                                    } else {
                                        //見つからない場合はidにする
                                        return facility_id;
                                    }
                                })

                                var options = {
                                    uri: config.slackWebhookUrl,
                                    headers: { 'Content-Type': 'application/json' },
                                    json: {
                                        channel: '@' + targetUser.slackuser,
                                        text: util.format('<@%s> さま。%sより「%s」が 始まります。場所・設備は「%s」です', targetUser.slackuser, moment(row.start).format('HH時mm分'), row.title, resolved_facilities.length != 0 ? resolved_facilities : 'なし')
                                    }
                                };
                                request.post(options, function (err, res, body) {
                                    if (err != null) {
                                        console.log(err);
                                    }
                                    return next();
                                });

                            });
                            return next();
                        }
                    });
                }, function (err) {
                    if (err != null) {
                        return next(err);
                    }
                    return next();
                });
        }
    ], function (err) {
        if (err != null) {
            console.log(err);
        }
        return;
    });

};

'use strict';

var _ = require('lodash');
var util = require('util');
var async = require('async');
var moment = require('moment');
var axios = require('axios');
var tough = require('tough-cookie');
var { wrapper } = require('@3846masa/axios-cookiejar-support');

// クッキージャーを設定
const cookieJar = new tough.CookieJar();
const client = wrapper(axios.create({ jar: cookieJar }));

module.exports = function (config) {
    async.waterfall([
        //login
        function (next) {
            client.post(config.garoonLoginUrl,
                { username: config.user.username, password: config.user.password }
            ).then(function (res) {
                if (res.status !== 200 && res.status !== 304) {
                    return next(res);
                } else {
                    console.log(res.data);
                    return next();
                }
            }).catch(function (err) {
                return next(err);
            });
        },
        //get facilities
        function (next) {
            client.post(config.garoonFacilityUrl)
            .then(function (res) {
                if (res.status !== 200 && res.status !== 304) {
                    return next(res);
                } else {
                    // console.log(res.data);
                    return next(null, res.data);
                }
            }).catch(function (err) {
                return next(err);
            });
        },
        function (facilities, next) {
            var now = moment();
            var fiveMinutesAfter = now.clone().add(6, 'm');

            async.eachSeries(config.targetUsers,
                function (targetUser, next) {
                    console.log(targetUser.slackuser);
                    client.post(config.garoonScheduleUrl,
                        { start: now.utc().format(), end: fiveMinutesAfter.utc().format(), userId: targetUser.garoon_id }
                    ).then(function (res) {
                        if (res.status !== 200 && res.status !== 304) {
                            return next(res);
                        } else {
                            // console.log(res.data);
                            async.eachSeries(res.data.rows, function (row, next) {
                                // skip allday schedule
                                if (row.allDay === true) {
                                    return next();
                                }
                                //skip past schedule
                                if (moment(row.start).diff(now) < 0) {
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

                                client.post(config.slackWebhookUrl, {
                                    channel: '@' + targetUser.slackuser,
                                    text: util.format('<@%s> さま。%sより「%s」が 始まります。場所・設備は「%s」です', targetUser.slackuser, moment(row.start).format('HH時mm分'), row.title, resolved_facilities.length != 0 ? resolved_facilities : 'なし')
                                }, {
                                    headers: { 'Content-Type': 'application/json' }
                                }).then(function () {
                                    return next();
                                }).catch(function (err) {
                                    console.log(err);
                                    return next();
                                });

                            }, function (err) {
                                return next(err);
                            });
                        }
                    }).catch(function (err) {
                        return next(err);
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
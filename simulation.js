// simulation.js
'use strict';

var MongoClient = require('mongodb').MongoClient;
var turf = require('@turf/turf');

var url = "mongodb://localhost:27017/";

module.exports = class Simulator {
    static simulate(distance, category) {
        // start multiple simulations
    }

    constructor(session_id, team_id) {
        var _this = this;

        this.team_id = team_id;
        this.session_id = session_id;

        // Calculate initial speed (8 - 10 km/h)
        this.speed = Math.round((8 + 2*Math.random()) * 100) / 100;;

        this.currentDistance = 0;
        this.currentTime = 0;

        this.currentPosition = undefined;

        this._getDB().then(function(dbo) {
            dbo.collection('race_' + _this.session_id).deleteOne({ 
                team_id: _this.team_id
            }).then(function() {
                console.log(_this.session_id, _this.team_id, "READY");

                dbo.collection('race_' + _this.session_id).insertOne({ 
                    team_id: _this.team_id,
                    status: "ready"
                });
            });
        });
    }

    start(track_distance) {
        var _this = this;

        this.track_distance = track_distance;

        if(!track_distance) {
            track_distance = 5000;
        }

        this._getTrack(track_distance).then(function(track) {
            _this.track = track;
            _this.currentPosition = turf.along(_this.track, _this.currentDistance / 1000);
            _this.lastPosition = turf.along(_this.track, 99);

            console.log( turf.length(_this.track) );

            _this._startTime = Math.round(Date.now() / 1000);

            _this._persistState();

            _this.moveTimer = setInterval(_this._move.bind(_this), 1000);

            // Change speed every 5 seconds
            _this.adjustSpeedTimer = setInterval(_this._adjustSpeed.bind(_this), 5000);    
        });
    }

    stop() {
        var _this = this;

        clearInterval(this.adjustSpeedTimer);
        clearInterval(this.moveTimer);

        this._getDB().then(function(dbo) {
            console.log(_this.session_id, _this.team_id, "FINISHED");

            dbo.collection('race_' + _this.session_id).updateOne(
                { 
                    team_id: _this.team_id 
                },{
                    $set: { 
                        status: "finished"
                    }
                }
            );
        });
    }

    _getTrack(track_distance) {
        var _this = this;

        var promise = new Promise(
            function(resolve, reject) {  
                _this._getDB().then(function(dbo) {
                    dbo.collection("simulation").findOne({ length: track_distance }, function(err, result) {
                        if (err) throw err;
                                        
                        let track = turf.lineString(result.track);
                    
                        resolve(track)
                    });
                });
            }
        );

        return promise;
    }

    _adjustSpeed() {
        let delta = (Math.random() - 0.5) / 5;
        let newSpeed = this.speed + delta;

        if(newSpeed >= 7.5 && newSpeed <= 10.5) {
            this.speed = Math.round(newSpeed * 100) / 100;
        }
    }

    _getDB() {
        var promise = new Promise(
            function(resolve, reject) {       
                MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
                    if (err) throw err;

                    var dbo = db.db("dm_kutterrudern");

                    resolve(dbo)
                });
            }
        );

        return promise;
    }

    _move() {
        this._update();
    }

    _persistState() {
        var _this = this;

        this._getDB().then(function(dbo) {
            let avg_speed = (_this.currentDistance / 1000) / (_this.currentTime / 3600);

            dbo.collection('race_' + _this.session_id).updateOne(
                { 
                    team_id: _this.team_id 
                },{
                    $set: { 
                        team_id: _this.team_id,
                        speed: _this.speed,
                        avg_speed: Math.round(avg_speed * 100) / 100,
                        time: _this.currentTime,
                        distance: Math.round(_this.currentDistance),
                        position: _this.currentPosition.geometry.coordinates,
                        status: "active"
                    },
                    $push: { 
                        path: _this.currentPosition.geometry.coordinates 
                    },
                    $max: { 
                        max_speed: _this.speed 
                    }
                },{
                    upsert : true
                }
              );
        });
    }

    _update() {
        let newTime = Math.round(Date.now() / 1000) - this._startTime;
        let deltaTime = newTime - this.currentTime;
        let deltaDistance = (this.speed * (deltaTime / 3600)) * 1000;
        
        this.currentTime = newTime;
        this.currentDistance += deltaDistance;

        let newPosition = turf.along(this.track, this.currentDistance / 1000);

        if( turf.booleanEqual(newPosition, this.lastPosition) ) {
            this._persistState();

            this.stop();
        } else {
            this.currentPosition = newPosition;

            this._persistState();
        }
    }
}


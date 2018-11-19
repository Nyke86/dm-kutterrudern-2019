// simulation.js
'use strict';

var MongoClient = require('mongodb').MongoClient;
var turf = require('@turf/turf');

var url = "mongodb://localhost:27017/";

module.exports = class Simulator {
    constructor(session_id, team_id) {
        this.team_id = team_id;
        this.session_id = session_id;

        // Calculate initial speed (8 - 10 km/h)
        this.speed = 8 + 2*Math.random();

        this.currentDistance = 0;
        this.currentTime = 0;

        this.currentPosition = undefined;
    }

    start(track_distance) {
        var _this = this;

        if(!track_distance) {
            track_distance = 5000;
        }

        this._getTrack(track_distance).then(function(track) {
            _this.track = track;
            _this.currentPosition = turf.along(_this.track, _this.currentDistance);
    
            console.log("NEW1", turf.along(_this.track, 10000));
            console.log("NEW2", turf.along(_this.track, 6000));


            _this._startTime = Math.round(Date.now() / 1000);

            _this.moveTimer = setInterval(_this._move.bind(_this), 1000);

            // Change speed every 5 seconds
            _this.adjustSpeedTimer = setInterval(_this._adjustSpeed.bind(_this), 5000);    
        });
    }

    stop() {
        clearInterval(this.adjustSpeedTimer);
        clearInterval(this.moveTimer);
    }

    _getTrack(track_distance) {
        var promise = new Promise(
            function(resolve, reject) {       
                MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
                    if (err) throw err;

                    var dbo = db.db("dm_kutterrudern");

                    dbo.collection("simulation").findOne({ length: track_distance }, function(err, result) {
                        if (err) throw err;
                                        
                        let track = turf.lineString(result.track);
                    
                        resolve(track)

                        db.close();
                    });
                    
                    db.close();
                });
            }
        );

        return promise;
    }

    _adjustSpeed() {
        let delta = (Math.random() - 0.5) / 5;
        let newSpeed = this.speed + delta;

        if(newSpeed >= 7.5 && newSpeed <= 10.5) {
            this.speed = newSpeed;
        }
    }

    _move() {
        this._update();

        console.log({
            speed: this.speed,
            time: this.currentTime,
            distance: this.currentDistance,
            position: this.currentPosition
        });
    }

    _update() {
        let newTime = Math.round(Date.now() / 1000) - this._startTime;
        let deltaTime = newTime - this.currentTime;
        let deltaDistance = Math.round((this.speed * (deltaTime / 3600)) * 1000);
        
        this.currentTime = newTime;
        this.currentDistance += deltaDistance;

        let newPosition = turf.along(this.track, this.currentDistance);

        if( turf.equal(this.currentPosition, newPosition) ) {
            this.stop();
        } else {
            this.currentPosition = newPosition;
        }
    }
}


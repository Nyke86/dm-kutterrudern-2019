// manager.js
'use strict';

var MongoClient = require('mongodb').MongoClient;
var express = require('express');
var app = express();
var server = app.listen(3000)
var io = require('socket.io').listen(server);

var url = "mongodb://localhost:27017/";

function raceInfo(session_id) {
    return {
        "session_id" : session_id,
        "distance" : 5000,
        "category" : "men"
    };
}

function getLiveData(session_id) {
    return new Promise(function(resolve, reject) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
            if (err) throw err;

            var dbo = db.db("dm_kutterrudern");

            dbo.collection("race_" + session_id)
                .find({ 
                    status: "active"
                }).project({ 
                    team_id: 1, 
                    boat_number: 1,
                    name: 1,
                    position: 1,
                    distance: 1,
                    time: 1,
                    speed: 1,
                    avg_speed: 1,
                    max_speed: 1
                })
                .sort({ 
                    distance: -1 
                })
                .toArray(function(err, result) {
                    if (err) throw err;
                        
                    resolve(result);
                });

            db.close();
        });
    });
}

function getSplitTimes(session_id) {
    return new Promise(function(resolve, reject) {
        MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
            if (err) throw err;
    
            var dbo = db.db("dm_kutterrudern");
    
            dbo.collection("race_" + session_id)
                .find({ 
                })
                .project({ 
                    team_id: 1, 
                    split_times: 1
                })
                .sort({ 
                    distance: 1 
                })
                .toArray(function(err, result) {
                    if (err) throw err;
                        
                    resolve({});
                });
    
            db.close();
        });
    });
}

app.use(express.static('client'));

io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });

    socket.on('cutter.race.init', function(session_id) {
        socket.emit('cutter.race.info', {
            "session_id" : session_id,
            "distance" : 5000,
            "category" : "men"
        });

        getSplitTimes(session_id).then(function(result) {
            socket.emit('cutter.race.feed.split_times', result);

        });

        getLiveData(session_id).then(function(result) {
            socket.emit('cutter.race.feed.live_data', result);
        });
    });

    const pipeline = [{
        $project: { documentKey: false }
    }];

    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;

        var dbo = db.db("dm_kutterrudern");

        const changeStream = dbo.collection("race_1").watch({ fullDocument: 'updateLookup' });
        changeStream.on("change", function(change) {
            socket.emit('cutter.race.feed.split_times', [change.fullDocument]);
            socket.emit('cutter.race.feed.live_data', [change.fullDocument]);
        });
    });
});
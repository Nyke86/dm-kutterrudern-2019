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

function getLiveData(session_id, team_id) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;

        var dbo = db.db("dm_kutterrudern");

        dbo.collection("race_" + session_id).find({ }).toArray(function(err, result) {
            if (err) throw err;
                      
            console.log(result);
        });

        db.close();
    });
}

function getSplitTimes(session_id, team_id) {
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;

        var dbo = db.db("dm_kutterrudern");

        dbo.collection("race_" + session_id).find({ }).toArray(function(err, result) {
            if (err) throw err;
                               
            console.log(result);
        });

        db.close();
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

        socket.emit('cutter.race.feed.split_times', {});
        socket.emit('cutter.race.feed.live_data', {});
    });

    const pipeline = [{
        $project: { documentKey: false }
    }];

    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;

        var dbo = db.db("dm_kutterrudern");

        const changeStream = dbo.collection("race_1").watch(pipeline);

        console.log("change");

        changeStream.on("change", function(change) {
            console.log(change);

            socket.emit('cutter.race.feed.split_times', change.fullDocument);
            socket.emit('cutter.race.feed.live_data', change.fullDocument);
        });
    });
});
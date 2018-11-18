var MongoClient = require('mongodb').MongoClient;
var turf = require('@turf/turf');

var url = "mongodb://localhost:27017/";

MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
  if (err) throw err;

  var dbo = db.db("dm_kutterrudern");

  dbo.collection("simulation_5000").findOne({}, function(err, result) {
    if (err) throw err;

    console.log(result.name);

    let course = turf.lineString(result.course.coordinates[0]);

    console.log(turf.length(course));

    console.log(turf.along(course, 0.1));

    db.close();
  });

  db.close();
});

{ useNewUrlParser: true }
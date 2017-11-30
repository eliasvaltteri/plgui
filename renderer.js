var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/softarc";
var obj;

function searchFunc() {

	var dep = document.getElementById("dept").value;
	var arr = document.getElementById("dest").value;;
	var query = { "name": {$regex : dep+" => "+arr} };

	MongoClient.connect(url, function(err, db) {
		if (err) throw err;
		db.collection("routes").find(query).toArray(function(err, result) {
			if (err) throw err;
			document.getElementById("route").innerHTML = result[0].line+"";
			obj = result[0].line;
			console.log(obj);
			db.close()
		});
	});
}
// initialize the database
var MongoClient = require('mongodb').MongoClient;
var dburl = "mongodb://localhost:27017/softarc";
var db;

// declare the dept stop and the dest stop
var dept = "";
var dest = "";

// initialize arrays for all ids of
// destination stop and destination stop
var deptIds = [];
var destIds = [];

main("search");

// main function
function main(type) {
	// connect to database
	MongoClient.connect(dburl, function (err, database) {
		if (err) throw err;
		db =  database;

		// empty the variables
		var deptIds = []; 	var destIds = [];
		var dept = ""; 		var dest = "";
		print("");

		// initialize values from input
		dept = document.getElementById("dept").value.trim();
		dest = document.getElementById("dest").value.trim();

		//start by loading the ids of both stops
		loadIds(dept, dest, function(result) {
			// if user chooses to add
			if (type == "add") {
				addRoute(dept, dest, function(result) {
					if (result) print(result);
					db.close();
					return;
				});
			}
			// if user chooses to search
			if (type == "search") {
				searchDirect(dept, dest, function(result) {
					if (result.length > 0) {
						print(result.join(", "));
						db.close();
						return;
					}
					searchConn(function(result) {
						print(result);
						db.close();
						return;
					});
				});
			}
		});
	});
}

// fetch every corresponding object from stops collection
function loadIds(dept, dest, callback) {
	db.collection("stops").find({"name": {$in: [ dept, dest ]}}).toArray(function(err, result) {
		if (err) throw err;

		// store all dept and dest stops' ids into their variables
		for (let i = 0; i < result.length; i++) {
			if (result[i].name === dept) deptIds.push(result[i]["@id"]);
			if (result[i].name === dest) destIds.push(result[i]["@id"]);
		}
		// output in case either or neither of the stops exist
		if (result.length === 0) { print("Neither of the stops found!"); }
		else if (deptIds.length === 0) { print("No departure stop found!"); }
		else if (destIds.length === 0) { print("No destination stop found!"); }

		// pass to results to be returned when complete
		var stuff = [ deptIds, destIds ];
		callback(complete(stuff));
	});
}

// in this function we look for either lines that 
// have the same dept and dest stop as user input OR
// lines that contain them as stops somewhere
// along the way
function searchDirect(dept, dest, callback) {
	// set query to look for any id of departure stop
	query = { "stop_id": { $in: deptIds } };
	db.collection("mapping").find(query).toArray(function(err, result) {
		if (err) throw err;
		var routeIds = [];
		result.forEach(function(elem) {
			routeIds.push(elem.route_id);
		});
		// set the query to look for routes that have some stop of 
		// both dept and dest
		query = { "stop_id": { $in: destIds }, "route_id": { $in: routeIds } };
		db.collection("mapping").find(query).toArray(function(err, result) {
			if (err) throw err;
			var allroutes = [];
			result.forEach(function(data) {
				allroutes.push(data.route_id);
			});
			// find the corresponding line name of id eg. 103724 -> "Bus N7"
			query = { "id": { $in: allroutes } };
			db.collection("routes").find(query).toArray(function(err, result) {
				if (err) throw err;
				var alldirect = [];
				result.forEach(function(data) {
					if (!alldirect.includes(data.line)) alldirect.push(data.line);
				});
				callback(complete(alldirect));
			});
		});
	});
}

// function to search for connecting routes
function searchConn(callback) {

	var deptRoutes = [];
	var x = [];
	var z = [];

	// query for 
	query = { $and: [ { "stop_id": { $in: deptIds } }, { "stop_id": { $nin: destIds } } ] };
	db.collection("mapping").find(query).toArray(function(err, result) {
		if (err) throw err;
		x = result;
		result.forEach(function(data) {
			deptRoutes.push(data.route_id);
		});
		// query for
		query = { $and: [ {"route_id": {$nin: deptRoutes } }, { "stop_id": {$in: destIds } } ] };
		db.collection("mapping").find(query).toArray(function(err, result) {
			if (err) throw err;
			x.concat(result);
			for (let j = 0; j < x.length; j++) {
				for (let i = 0; i < x.length; i++) {
					if (x[i].stop_id == x[j].stop_id) {
						z.push(x[i].route_id);
					}
				}
			}
			var newz = [...new Set(z)];
			// query for
			query = { "id": { $in: newz } };
			db.collection("routes").find(query).toArray(function(err, result) {
				if (err) throw err;
				var routesnames = [];
				result.forEach(function(data) {
					routesnames.push(data.line);
				});
				var final = [...new Set(routesnames)];
				callback(complete(final));
			});
		});
	});
}

// function to add a route to the database
function addRoute(dept, dest, callback) {
	// generate a new route_id
	var newRouteId;
	db.collection("mapping").findOne({}, { "sort": [['route_id',-1]] } , function(err, doc) {
		newRouteId = doc.route_id + 1;
		// see if the stops already exist
		searchDirect(dept, dest, function(result) {
			if (result.length > 0) {
				print("The route already exists!");
				return;
			}
			for (let i = 0; i < deptIds.length; i++) {
				db.collection("mapping").insertOne( {
					"route_id" : newRouteId,
					"stop_id" : deptIds[i]
				}, function(err, result) {
					if (err) throw err;
				});
			}
			for (let i = 0; i < destIds.length; i++) {
				db.collection("mapping").insertOne( {
					"route_id" : newRouteId,
					"stop_id" : destIds[i]
				}, function(err, result) {
					if (err) throw err;
				});
			}
			callback(complete("Route between "+dept+" and "+dest+" was created successfully!"));
		});
	}); 
}

// function for callbacks to return stuff
function complete(result) {
	return result;
}

// function to output for the user
function print(content) {
	document.getElementById("output").innerHTML = content+"";
}

// function to calculate distance
// between two lon/lats, returns in km
function distance(lon1,lat1,lon2,lat2) {
	var p = 0.017453292519943295;
	var c = Math.cos;
	var a = 0.5 - c((lat2 - lat1) * p)/2 + 
	c(lat1 * p) * c(lat2 * p) * 
	(1 - c((lon2 - lon1) * p))/2;
	return 12742 * Math.asin(Math.sqrt(a));
}
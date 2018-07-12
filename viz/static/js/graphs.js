map = L.map('map');
haslayers = false;
layers = {"tl_true":false};

var rectangles = {};

var minlat = 45.00625;
var maxlat = 45.14125;
var minlon = 7.5775;
var maxlon = 7.7725;
var deltalat = 0.005;
var deltalon = 0.0025;

var indexes = [];

/*
var interval=24;
var weekday="_W";
var charttype="tl_true";
*/

var currentweekday="_W";
var currentinterval=11;
var currentcharttype="tl_true";

var data;

//var autoplay = 11;

function rectKey(lat,lon)
{
	return parseInt(lat*100000) +","+parseInt(lon*100000);
}

/*
for(var lat = minlat; lat<=maxlat; lat+=deltalat/2)
{
	//console.log(parseInt(lat*100000));
	for(var lon = minlon; lon<=maxlon; lon+=deltalon/2)
	{
		if(lat==minlat){console.log(parseInt(lon*100000))};
		var bounds = [[lat-deltalat*0.45,lon-deltalon*0.45], [lat+deltalat*0.45,lon+deltalon*0.45]];
		var key = rectKey(lat,lon);

		rectangles[key] = {};
		rectangles[key]["bounds"]=bounds;
		rectangles[key]["data"]={};

		//console.log(bounds);

		L.rectangle(bounds, {color: "purple", weight: 0, fillOpacity:0.2}).addTo(map);
	
	}
}
*/

//console.log(rectangles);

refresh();

function refresh(){
	//$("#map-container").fadeTo(0.5);
	if(typeof(data)=="undefined")
	{
		queue()
			.defer(d3.json, "/data")
			.await(makeGraphs);
	}
	else
	{
		reloadGraphs();
	}
}

function makeGraphs(error, recordsJson) {
	data = recordsJson
	reloadGraphs();
}

function reloadGraphs()
{
	
	/*
	map.off();
	map.remove();
	map = L.map('map');
	*/

	//$("#map-container").fadeTo(1);

	console.log(currentweekday);
	console.log(currentinterval);
	console.log(currentcharttype);

	//Clean data
	var records = data;
	var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
	var dateFormat2 = d3.time.format("%H");

	
	
	records.forEach(function(d) {
		d["timestamp"] = dateFormat2.parse(parseInt((d["interval"]-1)/2)+"");
		//console.log(parseInt(d["timestamp"].getMinutes()/15));
		d["timestamp"].setMinutes(d["interval"]%2==0 ? 30 : 0);
		d["timestamp"].setSeconds(0);
		//console.log(d["timestamp"]);
		d["longitude"] = +d["lon"];
		d["latitude"] = +d["lat"];

		//console.log(rectangles);		
		var k = rectKey(d["latitude"],d["longitude"]);
		//console.log(k);
		if(typeof(rectangles[k])=="undefined")
		{
			var bounds = [[d["latitude"]-deltalat*0.23,d["longitude"]-deltalon*0.95], [d["latitude"]+deltalat*0.23,d["longitude"]+deltalon*0.95]];
	
			rectangles[k] = {};
			rectangles[k]["bounds"]=bounds;
			rectangles[k]["data"]={};
			//console.log("created "+k);
			rectangles[k]["rect"] = L.rectangle(rectangles[k].bounds, {color: "purple", weight: 0, fillOpacity:0.5}).addTo(map);
		}
		var dkey = d["weekday"]+","+d["interval"];
		if(typeof(rectangles[k]["data"][dkey])=="undefined")
		{
			//console.log("+ "+dkey);
			//indexes.push(dkey);
			rectangles[k]["data"][dkey] = {};			
		}
		else
		{
			/*
			console.log(dkey+" presente");
			console.log(rectangles[k]["data"])
			console.log(rectangles[k]["data"][dkey]);
			*/
		}		
		rectangles[k]["data"][dkey]["tl_true"] = d["tl_true"];
		rectangles[k]["data"][dkey]["tl_predicted"] = d["tl_predicted"];
		rectangles[k]["data"][dkey]["difference"] = d["difference"];

		//console.log(rectangles[k]["data"][dkey]);
	});
	

	//Create a Crossfilter instance
	var ndx = crossfilter(records);

	//Define Dimensions
	var dateDim = ndx.dimension(function(d) { return d["timestamp"]; });
	//console.log(dateDim.top(Infinity))

	var genderDim = ndx.dimension(function(d) { return d["gender"]; });
	var ageSegmentDim = ndx.dimension(function(d) { return d["age_segment"]; });
	var weekdayDim = ndx.dimension(function(d) { return d["weekday"]; });
	var locationdDim = ndx.dimension(function(d) { return d["location"]; });
	var allDim = ndx.dimension(function(d) {return d;});


	//Group Data
	var numRecordsByDate = dateDim.group();


	var genderGroup = genderDim.group();
	var ageSegmentGroup = ageSegmentDim.group();
	var weekdayGroup = weekdayDim.group();
	var locationGroup = locationdDim.group();
	var all = ndx.groupAll();


	//Define values (to be used in charts)
	var minDate = dateDim.bottom(1)[0]["timestamp"];
	var maxDate = dateDim.top(1)[0]["timestamp"];


    //Charts
    var numberRecordsND = dc.numberDisplay("#number-records-nd");
	var timeChart = dc.barChart("#time-chart");
	var genderChart = dc.rowChart("#gender-row-chart");
	var ageSegmentChart = dc.rowChart("#age-segment-row-chart");
	var weekdayChart = dc.rowChart("#phone-brand-row-chart");
	var locationChart = dc.rowChart("#location-row-chart");



	numberRecordsND
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(all);
	

	timeChart
		.width(800)
		.height(140)
		.margins({top: 10, right: 50, bottom: 20, left: 40})
		.dimension(dateDim)
		.group(numRecordsByDate)
		.transitionDuration(500)
		.x(d3.time.scale().domain([minDate, maxDate]))
		.elasticY(true)
		.yAxis().ticks(4)
		;

	genderChart
        .width(300)
        .height(100)
        .dimension(genderDim)
        .group(genderGroup)
        .ordering(function(d) { return -d.value })
        .colors(['#6baed6'])
        .elasticX(true)
        .xAxis().ticks(4);

	ageSegmentChart
		.width(300)
		.height(150)
        .dimension(ageSegmentDim)
        .group(ageSegmentGroup)
        .colors(['#6baed6'])
        .elasticX(true)
        .labelOffsetY(10)
        .xAxis().ticks(4);

	weekdayChart
		.width(300)
		.height(310)
        .dimension(weekdayDim)
        .group(weekdayGroup)
        .ordering(function(d) { return -d.value })
        .colors(['#6baed6'])
        .elasticX(true)
        .xAxis().ticks(4);

    locationChart
    	.width(200)
		.height(510)
        .dimension(locationdDim)
        .group(locationGroup)
        .ordering(function(d) { return -d.value })
        .colors(['#6baed6'])
        .elasticX(true)
        .labelOffsetY(10)
        .xAxis().ticks(4);



	var drawMap = function(zoom){

		if(typeof(zoom)=="undefined")
		{
			map.setView([45.06, 7.65], 12	);
		}	    
		mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
		L.tileLayer(
			'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; ' + mapLink + ' Contributors',
				maxZoom: 18,
				minZoom: 11,
			}).addTo(map);

		//HeatMap
		var geoData = [];
		var polyLines = [];
		var count = 0;
		

		if(haslayers)
		{
			return;
		}
	
		_.each(allDim.top(Infinity), function (d) {
			if(true ||d["location"])
			{
				count++;
				//var rand = Math.random()*10;
				//for(var i=0; i<100;i++)
				{					
					//geoData.push([d["latitude"], d["longitude"], d["tl_true"]/100.0]);

					/*
					if(!haslayers)
					{

						var hlon = 0.0022;
						var hlat = 0.0011;
						var pointA = new L.LatLng(d["latitude"]-hlat,d["longitude"]-hlon);
						var pointB = new L.LatLng(d["latitude"]+hlat,d["longitude"]-hlon);
						var pointC = new L.LatLng(d["latitude"]+hlat,d["longitude"]+hlon);
						var pointD = new L.LatLng(d["latitude"]-hlat,d["longitude"]+hlon);
						var pointList = [pointA, pointB, pointC, pointD];										

						var bounds = [[d["latitude"]-hlat,d["longitude"]-hlon], [d["latitude"]+hlat,d["longitude"]+hlon]];
						var key = rectKey(d["latitude"],d["longitude"]);
					}
					else
					{
						console.log("layers present");
					}
					*/
				}
			}			
		  });
		  		
		//console.log(geoData);

		if(layers["tl_true"])
		{
			//layers["tl_true"].removeFrom(map);
		}

		//console.log(map.getZoom())
		/*
		var radius = [5,5,5,5,5,5,5,5,5,5,5,5,10,20,40,60];
		layers["tl_true"] = L.heatLayer(geoData,{
			radius: 5, // radius[map.getZoom()],
			blur: 5, //radius[map.getZoom()], 
			maxZoom: 1,
			gradient: {0.25: 'green', 0.50: 'yellow', 0.75: 'red', 0.99:"black"}
		}).addTo(map);
		*/
		var maxvalue = 0;
		var minvalue = 100000;

		var avgsum=0;
		var avgcount=0;
		

		
		for (var k in rectangles) {

			//console.log(rectangles[k])

			// check if the property/key is defined in the object itself, not in parent
			if (rectangles.hasOwnProperty(k)) {           
				//rectangles[k]["data"][currentweekday+","+currentinterval]["tl_true"] = rectangles[k].sum/rectangles[k].count;
				//avgcount++;
				//avgsum+=rectangles[k]["data"][currentweekday+","+currentinterval]["tl_true"];
				//console.log(rectangles[k]["data"][currentweekday+","+currentinterval]["tl_true"]);
				if(typeof(rectangles[k]["data"][currentweekday+","+currentinterval])!="undefined" && typeof(rectangles[k]["data"][currentweekday+","+currentinterval][currentcharttype])!="undefined" && rectangles[k]["data"][currentweekday+","+currentinterval][currentcharttype]>maxvalue)
				{
					//console.log(">>>"+ maxvalue);
					maxvalue = rectangles[k]["data"][currentweekday+","+currentinterval][currentcharttype];
				}
				/*
				if(typeof(rectangles[k]["data"][currentweekday+","+currentinterval])!="undefined" && typeof(rectangles[k]["data"][currentweekday+","+currentinterval][currentcharttype])!="undefined" && rectangles[k]["data"][currentweekday+","+currentinterval][currentcharttype]<minvalue)
				{
					//console.log(">>>"+ maxvalue);
					minvalue = rectangles[k]["data"][currentweekday+","+currentinterval][currentcharttype];
				}
				*/
			}
		}					

		var colors = d3.scale.linear()
			.domain([0,maxvalue/2,maxvalue])
			.range(["#00c000","#ffff00","#ff0000"]);		

		

		for (var k in rectangles) {
			// check if the property/key is defined in the object itself, not in parent
			if (rectangles.hasOwnProperty(k)) {           
				//console.log(key, dictionary[k]);
				//console.log(rectangles[k]["data"]);
				if(typeof(rectangles[k]["data"][currentweekday+","+currentinterval])!="undefined")
				{
					//console.log(k);
					rectangles[k]["rect"].setStyle({"fillColor":colors(rectangles[k]["data"][currentweekday+","+currentinterval][currentcharttype])});
				}
				else
				{
					rectangles[k]["rect"].setStyle({"fillColor":"white"});
				}
			}
		}	
		

		//console.log(layers);

		//haslayers = true;

	};

	/*
	map.on('zoomend', function() {
		drawMap(map.getZoom());
	});
	*/

	//Draw Map
	drawMap();

	//Update the heatmap if any dc chart get filtered
	dcCharts = [timeChart, genderChart, ageSegmentChart, weekdayChart, locationChart];

	_.each(dcCharts, function (dcChart) {
		dcChart.on("filtered", function (chart, filter) {
			map.eachLayer(function (layer) {
				map.removeLayer(layer)
			}); 
			drawMap();
		});
	});

	dc.renderAll();

};


var should = require("should");
var dweetIOClient = require("./../dweet.io.js");

var dweetio = new dweetIOClient();

var testData = {
	hello : "world",
	random : Math.floor((Math.random() * 50000) + 1)
};

var mythingID = require("uuid").v4();
var mythingID2 = require("uuid").v4();
var generatedThing;

function checkValidDweetResponse(err, dweet)
{
	if(err)
	{
		throw err;
	}

	dweet.should.have.properties("thing", "content", "created");
	dweet.content.should.have.properties(testData);
}

function checkValidGetResponse(err, dweets)
{
	if(err)
	{
		throw err;
	}

	dweets.should.be.an.Array;
	dweets.length.should.be.above(0);

	// Only check the first one
	checkValidDweetResponse(err, dweets[0]);
}

function listenTest(theThingID, done)
{

}

describe("dweeting", function()
{
	describe("#dweet()", function()
	{
		it("should return a valid response", function(done)
		{
			dweetio.dweet(testData, function(err, dweet)
			{
				checkValidDweetResponse(err, dweet);
				generatedThing = dweet.thing;
				done();
			});
		});
	});

	describe("#dweet()", function()
	{
		it("should save the previously generated thing when dweeting again", function(done)
		{
			dweetio.dweet(testData, function(err, dweet)
			{
				checkValidDweetResponse(err, dweet);
				dweet.thing.should.equal(generatedThing);
				done();
			});
		});
	});

	describe("#dweet_for()", function()
	{
		it("should return a valid response", function(done)
		{
			dweetio.dweet_for(mythingID, testData, function(err, dweet)
			{
				checkValidDweetResponse(err, dweet);
				dweet.thing.should.equal(mythingID);
				done();
			});
		});
	});
});

describe("reading dweets", function()
{
	describe("#get_latest_dweet_for()", function()
	{
		it("should return a valid response", function(done)
		{
			dweetio.get_latest_dweet_for(mythingID, function(err, dweets)
			{
				checkValidGetResponse(err, dweets);
				done();
			});
		});
	});

	describe("#get_all_dweets_for()", function()
	{
		it("should return a valid response", function(done)
		{
			dweetio.get_all_dweets_for(mythingID, function(err, dweets)
			{
				checkValidGetResponse(err, dweets);
				done();
			});
		});
	});
});

describe("streaming dweets", function()
{
	this.timeout(20000);

	var testCount = 10;

	// Send a test dweet once every second for 10 times
	function sendTestDweet()
	{
		dweetio.dweet_for(mythingID, testData, function(){

			testCount--;

			if(testCount > 0)
			{
				setTimeout(sendTestDweet, 1000);
			}
		});
	}

	sendTestDweet();

	describe("#dweetio.listen_for()", function()
	{
		it("should hear dweets", function(done)
		{
			var listenFor = 3; // Listen for 3 dweets

			dweetio.listen_for(mythingID, function(dweet)
			{
				checkValidDweetResponse(null, dweet);

				listenFor--;

				if(listenFor <= 0)
				{
					done();
				}
			});
		});
	});
});
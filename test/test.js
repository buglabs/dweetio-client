var should = require("should");
var dweetIOClient = require("./../dweet.io.js");

var dweetio = new dweetIOClient();

dweetio.set_server(process.env.DWEET_SERVER || "http://localhost:3001", false);

var testData = {
	hello : "world",
	random: Math.floor((Math.random() * 50000) + 1)
};

var mythingID = require("uuid").v4();
var generatedThing;
var testLock = process.env.DWEET_LOCK;
var testKey = process.env.DWEET_KEY;

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

function shouldBeNoError(err)
{
	if(err)
	{
		throw err;
	}
}

function shouldBeError(err)
{
	if(!err)
	{
		throw "there should be an error, but we didnt' see one";
	}
}

describe("locked", function()
{
	describe("#remove_lock()", function()
	{
		it("should return any response", function(done)
		{
			dweetio.remove_lock(testLock, testKey, function(err)
			{
				done();
			});
		});
	});

	describe("#lock()", function()
	{
		it("should return a valid response", function(done)
		{
			dweetio.lock(mythingID, testLock, testKey, function(err)
			{
				shouldBeNoError(err);
				done();
			});
		});
	});

	describe("#dweet_for() without a key", function()
	{
		it("should return an invalid response", function(done)
		{
			dweetio.dweet_for(mythingID, testData, function(err, dweet)
			{
				shouldBeError(err);
				done();
			});
		});
	});

	describe("#get_latest_dweet_for() without a key", function()
	{
		it("should return an invalid response", function(done)
		{
			dweetio.get_latest_dweet_for(mythingID, function(err, dweets)
			{
				shouldBeError(err);
				done();
			});
		});
	});

	describe("#dweet_for() with an invalid key", function()
	{
		it("should return an invalid response", function(done)
		{
			dweetio.dweet_for(mythingID, testData, "badKey", function(err, dweet)
			{
				shouldBeError(err);
				done();
			});
		});
	});

	describe("#get_latest_dweet_for() without an invalid key", function()
	{
		it("should return an invalid response", function(done)
		{
			dweetio.get_latest_dweet_for(mythingID, "badKey", function(err, dweets)
			{
				shouldBeError(err);
				done();
			});
		});
	});

	describe("#dweet_for() with a key", function()
	{
		it("should return an invalid response", function(done)
		{
			dweetio.dweet_for(mythingID, testData, testKey, function(err, dweet)
			{
				checkValidDweetResponse(err, dweet);
				dweet.thing.should.equal(mythingID);
				done();
			});
		});
	});

	describe("#get_latest_dweet_for() with a key", function()
	{
		it("should return an invalid response", function(done)
		{
			dweetio.get_latest_dweet_for(mythingID, testKey, function(err, dweets)
			{
				checkValidGetResponse(err, dweets);
				done();
			});
		});
	});

	describe("streaming dweets with a key", function()
	{
		this.timeout(20000);

		describe("#dweetio.listen_for()", function()
		{
			it("should hear dweets", function(done)
			{
				var testCount = 10;
				var listenFor = 5; // Listen for 5 dweets

				// Send a test dweet once every second for 10 times
				function sendTestDweet()
				{
					if(listenFor <= 0)
					{
						return;
					}

					dweetio.dweet_for(mythingID, testData, testKey, function()
					{
						testCount--;

						if(testCount > 0 && listenFor > 0)
						{
							setTimeout(sendTestDweet, 1000);
						}
					});
				}

				dweetio.listen_for(mythingID, testKey, function(dweet)
				{
					if(listenFor <= 0)
					{
						return;
					}

					checkValidDweetResponse(null, dweet);

					listenFor--;

					if(listenFor == 0)
					{
						done();
					}
				});

				sendTestDweet();
			});
		});
	});

	describe("#unlock()", function()
	{
		it("should return a valid response", function(done)
		{
			dweetio.unlock(mythingID, testKey, function(err)
			{
				shouldBeNoError(err);
				done();
			});
		});
	});
});

describe("unlocked", function()
{
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

		describe("#dweetio.listen_for()", function()
		{
			it("should hear dweets", function(done)
			{
				var testCount = 10;
				var listenFor = 5; // Listen for 5 dweets

				// Send a test dweet once every second for 10 times
				function sendTestDweet()
				{
					if(listenFor <= 0)
					{
						return;
					}

					dweetio.dweet_for(mythingID, testData, function()
					{
						testCount--;

						if(testCount > 0 && listenFor > 0)
						{
							setTimeout(sendTestDweet, 1000);
						}
					});
				}

				dweetio.listen_for(mythingID, function(dweet)
				{
					if(listenFor <= 0)
					{
						return;
					}

					checkValidDweetResponse(null, dweet);

					listenFor--;

					if(listenFor == 0)
					{
						done();
					}
				});

				sendTestDweet();
			});
		});
	});
});
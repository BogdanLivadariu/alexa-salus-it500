
var request = require('request');
var cheerio = require('cheerio');
var alexa = require('alexa-app');
var fs = require('fs');

var JSON = require('JSON');

// Allow this module to be reloaded by hotswap when changed
module.change_code = 0;

// Salus stuff -- Add your Salus app login details here - don't check the code in anywhere afterwards !!
const username = <PUT YOUR LOGIN EMAIL ADDRESS HERE>
const password = <PUT YOUR PASSWORD HERE>

// The crucial pieces of information
var devId;
var token;

// Enable cookies
var request = request.defaults({jar: true});

function timeString()
{
    var dat = new Date();
	var days = (dat.getYear() * 365) + (dat.getMonth() * 31) + dat.getDate(); 
    return (days * 86400) + ((dat.getUTCHours() * 60) + dat.getUTCMinutes()) * 60 + dat.getUTCSeconds();
}

function logTimeString()
{
    var dat = new Date();
	var y = dat.getFullYear() + "";
	var m = dat.getMonth() + 1;
	if (m < 10) m = "0" + m;
	else m = m + "";
	var d = dat.getDate();
	if (d < 10) d = "0" + d;
	else d = d + "";
	
	var h = dat.getHours();
	if (h < 10) h = "0" + h;
	else h = h + "";
	var mm = dat.getMinutes();
	if (mm < 10) mm = "0" + mm;
	else mm = mm + "";
	var ss = dat.getSeconds();
	if (ss < 10) ss = "0" + ss;
	else ss = ss + "";
	
	
    return (y + "-" + m + "-" + d + " " + h + ":" + mm + ":" + ss);
}

function login(callback)
{
   request.post(
    'https://salus-it500.com/public/login.php',
    { form: { 'IDemail': username, 'password': password, 'login': 'Login' }},
    function (error, response, body) {
        if (!error) {
            // Follow redirect to devices page
            request.get('https://salus-it500.com/public/devices.php',
                        function (error, response, body) {
                           if (!error && response.statusCode == 200) 
                           {
                              // Extract the devId and token
                              var $ = cheerio.load(body);
                              devId = $('input[name="devId"]').val();
                              token = $('#token').val();
                              console.log("Logged on (" + devId + "," + token + ")");
                              callback();
                           }
                        });
        }
        else console.log(error);
    });
}

function whenOnline(callback, offlineCallback)
{
    request.get('https://salus-it500.com/public/ajax_device_online_status.php?devId=' + devId + '&token=' + token + '&_=' + timeString(),
                        function (error, response, body) {
                           if (!error && response.statusCode == 200) 
                           {
                               if (body == '"online"') callback();
                               else offlineCallback();
                           }
                           else offlineCallback();
                        }); 
}

function withDeviceValues(callback)
{
    request.get('https://salus-it500.com/public/ajax_device_values.php?devId=' + devId + '&token=' + token + '&_=' + timeString(),
                        function (error, response, body) {
                           if (!error && response.statusCode == 200) 
                           {
                               callback(JSON.parse(body));
                           }
                        }); 
}

function setTemperature(temp, callback)
{
	var t = parseFloat(temp).toFixed(1); 
console.log("Setting temp: " + t);	
    request.post(
    'https://salus-it500.com/includes/set.php',
    { form: { 'token': token, 'tempUnit': 0, 'devId': devId, 'current_tempZ1_set': 1, 'current_tempZ1': t }},
    function (error, response, body) {
        if (!error) callback();
    });
}

function speakTemperature(temp)
{
	var t = parseFloat(temp);
	if (parseFloat(t.toFixed(0)) != t) return t.toFixed(1);
	else return t.toFixed(0);
}

// Define an alexa-app
var app = new alexa.app('boiler');

app.pre = function(request, response, type) {
  //if (request.applicationId != "amzn1.echo-sdk-ams.app.000000-d0ed-0000-ad00-000000d00ebe") {
    // fail ungracefully 
  //  response.fail("Invalid applicationId");
  //}
  
  // Login
  
};

app.launch(function(req,res) {
        console.log('launching...');
        login( function() { 
           whenOnline( function() { res.say("Boiler is online"); res.send(); },
                       function() { res.say("Sorry, the boiler is offline at the moment."); res.send(); }) });
console.log("before return");
        return false;
});
app.intent('TempIntent', {
		"utterances":["what the temperature is", "the temperature", "how hot it is"]
	},function(req,res) {
		login( function() { 
			whenOnline( function() {
                 withDeviceValues( function(v) {
					 if (v.CH1currentSetPoint == 32.0) 
					 {	
					 	res.say("Sorry, I couldn't contact the boiler."); 
					 }
					 else 
					 { 
		                res.say('The current temperature is ' + speakTemperature(v.CH1currentRoomTemp) + ' degrees centigrade.');
					    res.say('The target is ' + speakTemperature(v.CH1currentSetPoint) + ' degrees.');
					    if (v.CH1heatOnOffStatus == 1) res.say('The heating is on.');
					}
                    console.log(logTimeString() + ", " + v.CH1currentRoomTemp + ", " + v.CH1currentSetPoint + ", " + v.CH1heatOnOffStatus);
                    res.send(); 
                 }); }, function() { res.say("Sorry, the boiler is offline at the moment."); res.send(); }) });
				 
                 return false;
	}
);

app.intent('TurnUpIntent', {
		"utterances":["to increase", "to turn up", "set warmer", "set higher"]
	},function(req,res) {
		login( function() { 
			whenOnline( function() {
                 withDeviceValues( function(v) {
					
					// Heating is already on, don't make any changes 
					if (v.CH1heatOnOffStatus == 1) 
					{	
						res.say('The heating is already on.');
						res.send(); 
					}
					else if (v.CH1currentSetPoint == 32.0) 
					{	
						res.say("Sorry, I couldn't contact the boiler.");
						res.send(); 
					}
					else 
					{
						var t = parseFloat(v.CH1currentSetPoint) + 0.5; 
						setTemperature(t, function() 
						{
						    withDeviceValues( function(v) 
							{ 
					           res.say('The target temperature is now ' + speakTemperature(v.CH1currentSetPoint) + ' degrees.');
					           if (v.CH1heatOnOffStatus == 1) res.say('The heating is now on.');
                               console.log(logTimeString() + ", " + v.CH1currentRoomTemp + ", " + v.CH1currentSetPoint + ", " + v.CH1heatOnOffStatus);
                               res.send();
							});
						});
					} 
                 }); }, function() { res.say("Sorry, the boiler is offline at the moment."); res.send(); }) });				 
                 return false;
	}
);

app.intent('TurnDownIntent', {
		"utterances":["to decrease", "to turn down", "set cooler", "set lower"]
	},function(req,res) {
		login( function() { 
			whenOnline( function() {
                 withDeviceValues( function(v) {
					
					if (v.CH1currentSetPoint == 32.0) 
					{	
						res.say("Sorry, I couldn't contact the boiler.");
						res.send(); 
					}
					else 
					{
						var t = parseFloat(v.CH1currentSetPoint) - 1.0; 
						setTemperature(t, function() 
						{
						    withDeviceValues( function(v) 
							{ 
					           res.say('The target temperature is now ' + speakTemperature(v.CH1currentSetPoint) + ' degrees.');
					           if (v.CH1heatOnOffStatus == 1) res.say('The heating is still on though.');
                               console.log(logTimeString() + ", " + v.CH1currentRoomTemp + ", " + v.CH1currentSetPoint + ", " + v.CH1heatOnOffStatus);
                               res.send();
							});
						});
					} 
                 }); }, function() { res.say("Sorry, the boiler is offline at the moment."); res.send(); }) });				 
                 return false;
	}
);

module.exports = app;

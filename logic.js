/*
Copyright (c) 2010, Patrick Wied. All rights reserved.
Code licensed under the BSD License:
http://patrick-wied.at/static/license.txt
*/
var heatmapApp = (function(){
	// var definition
	// canvas: the canvas element
	var canvas,
	// ctx: the canvas 2d context
		ctx,
		// width: the heatmap width for border calculations
		width,
		// height: the heatmap height for border calculations
		height,
		// the radia for the gradients
		radius1 = 20,
		radius2 = 40,
		// invoke: the app doesn't react on the mouse events unless the invoke var is set to true
		invoke = false,
		// we need a queue for executing functions
		queue = [],
		// a parameter which stops the queue
		end = false,
		// multi-user support with Ajax Push Engine
        client = new APE.Client(),
        // we need to store data before we send it
        // otherwise we would have too much outgoing requests
        tosend = [],
        // is the mouse over the element?
        overElement = false,
        // storing the last coordinates for heatmap effect when the mouse is stopped
        lastCoords = null,
        // an interval which pushes the last coordinates when the mouse stopped
        timer = null,
        mouseMove = false,
        pipepubid = "",
        connected = false,
        blocker = false,
	// function for coloring the heatmap
	colorize = function(x,y,x2){
		// initial check if x and y is outside the app
		// -> resetting values
		if(x+x2>width)
			x=width-x2;
		if(x<0)
			x=0;
		if(y<0)
			y=0;
		if(y+x2>height)
			y=height-x2;
		// get the image data for the mouse movement area
		var image = ctx.getImageData(x,y,x2,x2),
		// some performance tweaks
			imageData = image.data,
			length = imageData.length;
		// loop thru the area
		for(var i=3; i < length; i+=4){
			
			var r = 0,
				g = 0,
				b = 0,
				tmp = 0,
				// [0] -> r, [1] -> g, [2] -> b, [3] -> alpha
				alpha = imageData[i];
			
			// coloring depending on the current alpha value
			if(alpha<=255 && alpha >= 235){
				tmp=255-alpha;
				r=255-tmp;
				g=tmp*12;
			}else if(alpha<=234 && alpha >= 200){
				tmp=234-alpha;
				r=255-(tmp*8);
				g=255;
			}else if(alpha<= 199 && alpha >= 150){
				tmp=199-alpha;
				g=255;
				b=tmp*5;
			}else if(alpha<= 149 && alpha >= 100){
				tmp=149-alpha;
				g=255-(tmp*5);
				b=255;
			}else
				b=255;
			// we ve started with i=3
			// set the new r, g and b values
			imageData[i-3]=r;
			imageData[i-2]=g;
			imageData[i-1]=b;
		}
		// the rgb data manipulation didn't affect the ImageData object(defined on the top)
		// after the manipulation process we have to set the manipulated data to the ImageData object
		image.data = imageData;
		ctx.putImageData(image,x,y);	
	},
	// this handler is listening to the mouse movement of the user
	mouseMoveHandler = function(ev){
		// if invoke is false quit the processing -> return
		if(!invoke)
			return;
		
		mouseMove = true;
		// if an interval was set, clear it
		if(timer){
			clearInterval(timer);
			timer = null;
		}
		// if the invoke variable is set to true -> do the alphamap manipulation
		// at first we have to get the x and y values of the user's mouse position
		var x, y;
		if (ev.layerX) { // Firefox
			x = ev.layerX;
			y = ev.layerY;
		} else if (ev.offsetX) { // Opera
			x = ev.offsetX;
			y = ev.offsetY;
		}
		if(typeof(x)=='undefined')
			return;
		
		invoke=!invoke;
		
		// push the coordinates to the queue
		pushCoords(x, y);
		
		mouseMove=false;
	},
	pushCoords = function(x, y){
		queue.push(queueFunction(drawAlpha, this, [x,y]));

		tosend.push({"x":x,"y":y});
		if(tosend.length>=5){
			if(connected){
				client.core.request.send('mm', {"pipe": pipepubid, "coords" : tosend});
			}
			tosend = [];
		}
		lastCoords = [x,y];
	},
	drawAlpha = function(x, y){
		// storing the variables because they will be often used
		var r1 = radius1,
		r2 = radius2,
		// create a radial gradient with the defined parameters. we want to draw an alphamap
		rgr = ctx.createRadialGradient(x,y,r1,x,y,r2),
		xb = x-r2, yb = y-r2, mul = 2*r2;
		// the center of the radial gradient has .1 alpha value
		rgr.addColorStop(0, 'rgba(0,0,0,0.15)');  
		// and it fades out to 0
		rgr.addColorStop(1, 'rgba(0,0,0,0)');
		// drawing the gradient
		ctx.fillStyle = rgr;  
		ctx.fillRect(xb,yb,mul,mul);
		// finally colorize the area
		colorize(xb,yb,mul);
	},
	// we don't want to capture all events because this would result in low performance
	// -> a function for activating the heatmap logic which will be called in a specified interval
	activate = function(){
		invoke = !invoke;
	},
	queueFunction = function(fn, context, params){
		 return function() {
		        fn.apply(context, params);
		 };
	},
	initializeApe = function(){
		// load the APE client and join testChannel
        client.load();
        
        // when client is loaded, connect to APE Server with a random name
        client.addEvent('load', function() {
        	//console.log("loaded");
            client.core.start({'name': new Date().getTime().toString()});
        });
        
        client.addEvent('ready',function(){
           
            // 
             // add the mousemove handler
 			canvas["onmousemove"] =  mouseMoveHandler;
 			// iPhone / iPad support
 			canvas["ontouchmove"] = function(ev){
 				var touch = ev.touches[0],
 				// simulating a mousemove event			
 				simulatedEvent = document.createEvent("MouseEvent");
 				simulatedEvent.initMouseEvent("mousemove", true, true, window, 1,
                               touch.screenX, touch.screenY,
                               touch.clientX, touch.clientY, false,
                               false, false, false, 0, null);
 				// dispatching the simulated event			  
 				touch.target.dispatchEvent(simulatedEvent);
 				// we don't want to have the default iphone scrolling behaviour ontouchmove
 				ev.preventDefault();
 			};
 			setTimeout(function(){
 				//console.log(client.core.user);
 				client.core.request.send('managejoin',{"userpubid": client.core.user.pubid});
 			},300);
 			
 			// handle loader and show the experiment when the client is ready
 			document.getElementById("loader").style.display = "none";
 			document.getElementById("experiment").style.display = "block";
 			
        });

        
        client.addEvent('multiPipeCreate', function(pipe, options){
        	pipepubid = pipe.getPubid();
        });
        
        client.addEvent('userJoin', function(user, pipe){
        	connected = true;
        	var visitor = document.createElement("li");
        	visitor.setAttribute("id", user.pubid);
        	visitor.innerHTML = "<img src='flags/"+user.properties.country_code.toLowerCase()+".png' width='32' height='32' /><span>"+ user.properties.country+"</span>";
        	document.getElementById("userlist").appendChild(visitor);
        });
        
        client.addEvent('userLeft',function(user, pipe){
        	document.getElementById("userlist").removeChild(document.getElementById(user.pubid));
        });
        
        client.onRaw('term', function(params){
        	client.core.quit();
        	connected = false;
        	var msg = document.createElement("li");
        	msg.innerHTML = "<span>Sorry there is no slot available</span>";
        	document.getElementById("userlist").appendChild(msg);
        });
        
        // if we receive some remoteMouseMove raws we'll add the x/y to the function queue
        client.onRaw('rmm', function(params) {
        	
        		var arr = params.data.coords,
        		len = arr.length;
        		// push external drawAlpha functions
        		for(var i = 0; i < len; i++){
        			queue.push(queueFunction(drawAlpha, this, [arr[i].x, arr[i].y]));
        		}

        });
	},
	runQueue = function(){
		while (queue.length > 0) {
			 (queue.shift())();   
		}
		if(!mouseMove && lastCoords && !timer){

			timer = setInterval(function(){
				pushCoords(lastCoords[0], lastCoords[1]);
			},3000);	
		}
		if(!end){
			setTimeout(runQueue, 0);
		}
	};
	
	return {
		// initialization
		initialize: function(c){
			canvas = document.getElementById(c);
			ctx = canvas.getContext("2d");
			width = 650;
			height = 600;
			canvas["onmouseover"] = function(){ overElement = true; };
			canvas["onmouseout"] = function(){ overElement = false; if(timer) clearInterval(timer); };
			
			// click events
			document.getElementById("coolerButton").onclick = (function(context){
				return function(){
					if(!blocker)
						context.coolHeatmap();
				};
			})(this);
			document.getElementById("clearButton").onclick = (function(context){
				return function(){
					context.clearHeatmap();
				};
			})(this);
			// call the activate function in an interval of 50ms
			(function(fn){
				setInterval(fn, 50);
			})(activate);
			

			initializeApe();

			// finally start the queue
			runQueue();
		},
		terminateQueue: function(){
			end = true;
		},
		clearHeatmap: function(){
			ctx.clearRect(0,0,width,height);
			queue = [];
		},
		coolHeatmap: function(){
			blocker = true;
			var myWorker = new Worker('worker.js'),
			image = ctx.getImageData(0,0, width, height);
			myWorker.postMessage(image.data);
			
			myWorker.onmessage = function(event){
				image.data = event.data;
				ctx.putImageData(image,0,0);
				blocker = false;
			}
		}
	};
})();



window["onload"]=function(){
	//call the initialization
	heatmapApp.initialize("c");
}
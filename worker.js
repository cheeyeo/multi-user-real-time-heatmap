onmessage = function(event){
	startWorker(event.data);
}
function startWorker(data){
// some performance tweaks
		imageData = data;
		length = imageData.length;
		// loop thru the area
		for(var i=3; i < length; i+=4){
			
			var r = 0,
				g = 0,
				b = 0,
				tmp = 0,
				// [0] -> r, [1] -> g, [2] -> b, [3] -> alpha
				alpha = imageData[i]-25;
				if(alpha<0)alpha = 0;
				
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
			imageData[i]= alpha;
		}
		// the rgb data manipulation didn't affect the ImageData object(defined on the top)
		// after the manipulation process we have to set the manipulated data to the ImageData object
		postMessage(imageData);
}
var MAX_CHANS = 50;
var MAX_USERS_PER_CHAN = 5;
var chan_management = [];

Ape.registerCmd("managejoin", false, function(params, info){

        var request = new Http("http://www.patrick-wied.at/services/geoip/?ip="+info.ip);
        request.set("action","GET");

        request.getContent(function(result){
                result = JSON.parse(result);
                var user = Ape.getUserByPubid(params.userpubid);
                user.setProperty("ip", info.ip);
                user.setProperty("country_code", result.country_code);
                user.setProperty("country", result.country_name);

                var check = false;

                for(var i = 0; i < MAX_CHANS; i++){

                        var chan_name = "chan_"+i;
                        var chan = Ape.getChannelByName(chan_name);

                        if(!$defined(chan)){
                                Ape.mkChan(chan_name);
                                chan = Ape.getChannelByName(chan_name);
                        }

                        var count=0;

                        chan.userslist.each(function(){
                                count++;
                        });

                        if(count < MAX_USERS_PER_CHAN){
                                user.join(chan_name);
                                check = true;
                                break;
                        }

                }
                if(!check){
                        user.pipe.sendRaw('term',{'con':'term'});
                }
                return 1;


        });

});


Ape.registerCmd("mm", false, function(params, info){

        // get the channel
        var chan = Ape.getChannelByPubid(params.pipe);
        if(chan && $defined(info.user)){
			// send the raw message to the pipe
			// remote mouse move
			chan.pipe.sendRaw("rmm", {"coords": params.coords}, {"from": info.user.pipe});
		}else{
                return 0;
        }
        return 1;

});
             

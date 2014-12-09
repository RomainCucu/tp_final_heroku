var util = require("util"); 
var url = require("url"); 
var fs = require("fs");
var db = require("./db.js");

/**
* This method is used to process the request * @param req (Object) the request object
* @param resp (Object) the response object
*/

exports.router = function (req, resp) {
	var inc_request = new srouter(req, resp);
	inc_request.run();
	inc_request = null;
};

srouter = function (req, resp) {
	 if (req && resp) {
			this.req = req;
			this.resp = resp;
			this.pathname = "";
			this.filetype = "";
			this.path = "";
			this.image_file = "jpg png jpeg bmp gif"; 
	} else {
			util.log("ERROR - A srouter object need a request and a response object");
			return;
			}
};

srouter.prototype = {
run:
	function () { 
		this.rest_method();
	},

rest_method:
	function () {
		if (this.req.method == "GET") { 
			this.get_method();
		} else if (this.req.method == "POST") {
			this.post_method();
		} else {
			this.resp.writeHead(501,{"Content -Type": "application/json"});
			this.resp.write(JSON.stringify({message: "Not Implemented"}));
			this.resp.end();
			return;
		}
},



get_method:
	function () {
		var u = url.parse(this.req.url, true, true);
		var regexp = new RegExp("[/]+", "g");
		this.pathname = u.pathname.split(regexp);
		this.pathname = this.pathname.splice(1, this.pathname.length - 1); this.filetype = this.pathname[this.pathname.length - 1].split(".");
		this.filetype = this.filetype[this.filetype.length - 1];
		this.path = "." + u.path;		
		this.read_file();
		},

post_method:
	function (){
		var _this = this;
        var buff = "";
        this.req.on("data", function (c) {
            buff += c;
        });
        this.req.on("end", function () {
           if(buff) _this.go_post(buff); //vérification de la donnée entrante
           else{
           	util.log('hack attempt BRO');
           }
        });
    },
    
go_post:
	function (b) {
		b = JSON.parse(b);
		this.b = b;
		if (b.id_){
			if(!isValidId(b.id_)){
				this.resp.writeHead(200,{"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "*","Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE"});
				this.resp.end(JSON.stringify({message: "hack_attempt"}));
				return;
			}
		}
		if (b.ac == "login") {
			traitementData(b.username);
			traitementData(b.password);			
			if (isAlphaNumeric(b.password) && isAlphaNumeric(b.username) && isLengthValid(b.password) && isLengthValid(b.username)){								
				db.login(b.username.toLowerCase(), b.password, this.resp);
			}else{
				this.resp.writeHead(200,{"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "*","Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE"});
				this.resp.end(JSON.stringify({message: "login_connexion_refused"}));
			}			
		}		
		else if (b.ac == "register"){
			traitementData(b.username);
			traitementData(b.password);	

			if (isAlphaNumeric(b.password) && isAlphaNumeric(b.username) && isLengthValid(b.password) && isLengthValid(b.username)){				
				db.register(b.username, b.password, this.resp);
			}else {
				this.resp.writeHead(200,{"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "*","Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE"});
				this.resp.end(JSON.stringify({message: "register_problem_info_entered"}));
			}			
		}else if (b.ac == "logout"){
				traitementData(b.id_);			
				db.logout(b.id_, this.resp);	
				return;			
			
			}else if(b.ac == "delete"){	
				traitementData(b.password);
				traitementData(b.id_);
				if(isLengthValid(b.password) && isAlphaNumeric(b.password)){
					db.delete_(b.id_, b.password, this.resp);					
				} else{
					this.resp.writeHead(200,{"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "*","Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE"});
					this.resp.end(JSON.stringify({message: "error_delete_account"}));	
				} 
			}else if(b.ac == "add_friend"){				
				traitementData(b.friend_to_add);	
				traitementData(b.id_);			
				if(isLengthValid(b.friend_to_add) && isAlphaNumeric(b.friend_to_add)){//si la taille du string est supérieur à 0 on recherche l'ami sinon ca vaut pas le coup
					db.add_friend(b.friend_to_add,b.id_, this.resp);
				}else{
					this.resp.writeHead(200,{"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "*","Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE"});
					this.resp.end(JSON.stringify({message: "add_friend_ko_length"}));
				}				
			}else if(b.ac == "delete_friend"){
				traitementData(b.friend_to_delete);	
				traitementData(b.id_);
				if(isLengthValid(b.friend_to_delete) && isAlphaNumeric(b.friend_to_delete)){
					db.delete_friend(b.friend_to_delete,b.id_, this.resp);
				}else{
					this.resp.writeHead(200,{"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "*","Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE"});
					this.resp.end(JSON.stringify({message: "error_deleting_friend"}));
				}
			}else if(b.ac == "get_friends"){
				traitementData(b.id_);				
				db.get_friends(b.id_, this.resp);				
			}else if(b.ac=="get_info"){	
				traitementData(b.id_);
				db.get_info(b.id_, this.resp);
			}else if(b.ac=="set_info"){			
				if(isValidStatut(b.status_user)){
					traitementData(b.id_);
					db.set_info(b.status_user, b.id_, this.resp);
				}else{
					this.resp.writeHead(200,{"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "*","Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE"});
					this.resp.end(JSON.stringify({message: "too_short_or_too_long"}));
				}
			}
		else {
			
		}		
	},

		
read_file:
function () {
	//console.log(util.inspect(this.pathname));
	/*if (!this.pathname[0] || this.pathname[0] == "router.js" || this.pathname[0] == "server.js" || this.pathname[0] == "db.js") {
		util.log("ALERT - Hack attempt, resquest on : " + util.inspect(this.pathname));
		this.pathname = "./index.html";
		this.path = "./index.html";
		this.filetype = "html";
	}*/
	this.resp.end("<h1>bonjour</h1>")
	//this.load_file();	
},
	
load_file:
	function () {
		var _this = this;
		fs.exists(this.path, function (ex) {
			if (ex) {
				fs.readFile(_this.path, function (e, d) {
					if (e) {
						util.log("ERROR - Problem reading file : " + e);
					} else {
						_this.file = d;
						//util.puts("GET on path : " + util.inspect(_this.path));
						_this.file_processing();
			} });
			} else {
				util.log("INFO - File requested not found : " + _this.path);
				_this.resp.writeHead(404,{"Content -Type":"text/html"});
				_this.resp.end(); 
			}
		});
	},
	
file_processing:
	function () {
		if (this.filetype == "htm") {
			this.resp.writeHead(200,{"Content -Type": "text/html"});
		} else if (this.image_file.indexOf(this.filetype) >= 0) {
			this.resp.writeHead(200,{"Content-Type" : "image/" + this.filetype });
		} else {
			this.resp.writeHead(200,{"Content-Type" : "text/" + this.filetype });
		}
		this.file_send();
	},
	
file_send:
function () {
	this.resp.write(this.file);
	this.resp.end();
	}
};



isAlphaNumeric = function(str){
/**
*Fonction qui retourne vraie si la chaine entrée est alphanumérique, et renvoie faux sinon
*/
	var reg = new RegExp(/^\w+$/);
	return reg.test(str);
};

traitementData = function(str){
/**
*retourne le paramètre en format string et sans espace
*/
	str = str.toString();
	str = str.replace(/ /g,"");
	return str;
};

isLengthValid = function(str){
/**
*fonction qui retourne vrai si le string en paramètre est comprise entre 3 et 15 caractères
*/
	minLength = 3;
	maxLength = 15;
	if(str.length>=minLength && str.length<=maxLength){
		return true;
	}else{
		return false;
	}
};

isValidStatut = function(str){
/**
*Fontion qui:
*- force le paramètre en string;
*- vérifie si la longueur totale est comprise entre 2 et 150 caractères
*/
	str+="";
	if(str.length>1 && str.length<151){
		return true;
	}else{
		return false;
	}

};

isValidId = function(str){
	/**
	*Fonction qui vérifie que l'id passé est composé de 12 caractère, sinon ca fait cracher le serveur	
	*/
	str+="";
	if (str.length==12){
		return true;
	}else{
		return false;
	}
};


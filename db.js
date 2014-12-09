/**
*db.js
*Nous travaillons sous mongoDB.
*Dans notre database, il y a une collection de documents composés ainsi:
*- ObjectID(id): id du document généré automatiquement par Mongo. On se sert de cet ID pour modifié la base de donné. Ce champs est unique
*- username: username de l'utilisateur. Champs unique, ne peut être en double. Toujours en minuscule pour éviter le doublon "romain" et "RoMain" par exemple
*- pseudo: username de l'utilisateur mais sans forcage au minuscule. (peut servir pour l'affichage par exmple) 
*- friendList: de type Array. Contient le tableau d'amis de l'utilisateur
*- statut: de type String. Contient le dernier statut publié de l'utilisateur
*- connected: de type int. Vaut 0 si non connecté, 1 si connecté.
*
*Il se peut que certaine fonction appelle des conditions qui peuvent paraitre non nécessaire, comme par exemple vérifier l'existence d'un champs.
*Mais au cas où, pour éviter de faire crasher le serveur si le champs s'avérait à ne pas être présent, on rajoute la condition
*/


var ObjectId = require('mongodb').ObjectID;

var MongoClient = require('mongodb').MongoClient
    , format = require('util').format;


/**
*FONCTION REGISTER
*La fonction register prend en paramètres un username, un password, et une réponse à transmettre au client.
*Dans la collection "users", on insère un document composé des champs suivants :
*	- username: username entré forcé en minuscule, ainsi quand le user veut se connecter, il peut entrer avec ou sans majuscule.
*		De plus, cela permet de voir si deux username ne sont pas les mêmes ("RoMaIn" et "romain" serait insérer également, ce que l'on ne veut pas)
*	- pseudo: username entré qui peut être en majuscule ou minuscule. Il sert  a conservé la casse de l'username pour un éventuel affichage
*	- password: password entré
*	- friendList:[] -> tableau d'amis vide puisqu'il n'en a pas au début
*	- connected:0 -> il n'est pas connecté tant qu'il ne fait pas login
*	- statut:"" -> pas de statut au début
*La fonction retourne juste le message "register_ok" si le document s'est bien insérer.
*Si le document ne s'est pas insérer, cela signifie qu'il y a un doublon de l'username. En effet, un index est présent sur le champ
*username, afin qu'il n'y ait pas plusieurs utilisateurs avec le même nom. On renvoit donc "register_doublon".
*/
exports.register = function (username,pwd,res){

MongoClient.connect('mongodb://romain:alex@dogen.mongohq.com:10034/projet_maxime', function(err, db) {
	if(err) {//en cas d'erreur de connection
						console.log("erreur de connexion au niveau de register: "+err);
						res.writeHead(503, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});
						res.end(JSON.stringify({message: "connexion_error"}));
						return;
			}
	else{
		res.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});
		db.collection('users').insert({username: username.toLowerCase(), password: pwd, pseudo:username, connected:0, friendList:[], statut:""},function(err, doc){
			if(err){				
				res.end(JSON.stringify({message:"register_doublon"}));
				db.close();
			}else{				
				res.end(JSON.stringify({message:"register_ok"}));
				db.close();
			}
		});
	}
});
};

/**
*FONCTION LOGIN
*La fonction login prend en paramètre l'username, le password et la réponse.
*Si un document dans la collection "users" match avec l'username ET le password, alors:
*  - il met à jour le champs "connected" à 1 du document correspondant;
*  - on transmet l'objet avec l'id du document et le message "login_ok".
*Sinon on renvoie "login_ko" pour dire que les informations entrées ne correspondent à aucun document.
*/
exports.login=function(username, pwd, res){
MongoClient.connect('mongodb://romain:alex@dogen.mongohq.com:10034/projet_maxime', function(err, db) {
	if(err) {
						console.log("erreur de connexion dans la fonction login: "+err);
						res.writeHead(503, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});
						res.end(JSON.stringify({message: "connexion_error"}));
						return;
	}else{
		res.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});		
		db.collection('users').update({username: username, password:pwd},{ $set: {"connected":1}}, { upsert: false }, function(err, docs){
			if (err) {//en cas d'erreur de la fonction find
				console.log("erreur lors dans la fonction login, collection.find: "+err);
				res.end(JSON.stringify({message: "login_ko"}));
				db.close();
			}
			else if(docs==1){
				db.collection('users').find({username:username,password:pwd}).toArray(function(err,results){				
					infos={};//objet transmis au client
					infos.message="login_ok";
					infos.id=""+results[0];
					res.end(JSON.stringify(infos));
					db.close();
				});				
			}else{
				res.end(JSON.stringify({message:"ko_login_informations"}));
				db.close();
			}
		});
	}
});	
};




/**
*FONCTION LOGOUT
*La fonction prend en comptre un id (envoyé par le client) et une réponse à envoyé au client.
*On met à jour, dans la collection "users", le document qui match avec l'id correspondant en attribuant 0 au champs connected. On renvoie "logout_ok"
*Si aucun document ne correspond à l'id, cela renvoie un message d'erreur "logout_ko_false_id"
*/
exports.logout = function(id, res){

MongoClient.connect('mongodb://romain:alex@dogen.mongohq.com:10034/projet_maxime', function(err, db) {
	if(err) {
			console.log("erreur de connexion fonction logout: "+err);
			res.writeHead(503, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});
			res.end(JSON.stringify({message: "connexion_error"}));
			return;
	}else{
		res.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});
		db.collection('users').update({_id: ObjectId(id)},{ $set: {"connected":0}}, function(err, docs){
					if(err) {
						res.end(JSON.stringify({message: "logout_ko"}));
						db.close();
					}else if(docs==1){						
						res.end(JSON.stringify({message:"logout_ok"}));
						db.close();
					}else{
						res.end(JSON.stringify({message:"logout_ko_false_id"}));
						db.close();
					}
				});
	}
});
};


/**
*FONCTION DELETE
*La fonction prend en paramètre l'id du client, le password de confirmation avant de delete envoyé par le client, et la réponse à transmettre au client.
*Dans la collection "users", on recherche un document qui matche avec l'id ET le password envoyé.
*Si un document est trouvé <=> doc = 1 : cela signifie que la suppression a eu lieu. On renvoie "delete_ok"
*Sinon, cela signifie que le client a envoyé un mauvais id ou un mauvais password associé à l'id. On renvoie "delete_ko_wrong_pwd"
*/
exports.delete_ = function (id, password, res){

MongoClient.connect('mongodb://romain:alex@dogen.mongohq.com:10034/projet_maxime', function(err, db) {
	if(err) {
				console.log("erreur connexion fonction set_info: "+err);
				res.writeHead(503, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});
				res.end(JSON.stringify({message: "connexion_error"}));
				return;
			}
	else{
		res.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});		
		db.collection('users').remove({_id: ObjectId(id), password:password},function(err, doc){
			if(err){
				console.log("erreur fonction delete fonction remove: "+err);
				res.end(JSON.stringify({message:"error_delete_account"})); 
				db.close();
			}else{
				if(doc==0){ // user not found( mauvais mdp)
					res.end(JSON.stringify({message:"delete_ko_wrong_pwd"})); 
					db.close();
				} else if(doc==1){ // suppression réussie
					res.end(JSON.stringify({message:"delete_ok"}));
					db.close();
				}
			}
		});
	}
});
};



/** 
*FONCTION GET_INFO
*La fonction prend en paramètre l'id du client, et la réponse à transmettre au client.
*Dans la collection users, on recherche un document qui match avec l'id.
*Si un document est trouvé et si la friendList a une taille > 0:
* - On récupère la friendList de l'username
* - On récupère tous les documents des amis (grâce à find $in)
* - On stock le statut et l'username de chaque document dans un tableau
* - On renvoie "get_info" ainsi que le tableau contenant les statuts et username correspondant
*Sinon on renvoie "get_info_ko_no_friends" si le tableau d'amis est vide
*Sinon on renvoie "get_info_ko" si aucun document ne match avec l'id
*/
exports.get_info=function(id, res){	
	MongoClient.connect('mongodb://romain:alex@dogen.mongohq.com:10034/projet_maxime', function(err, db) {
	if(err) {	
				console.log("erreur fonction get_info connection: "+err);
				res.writeHead(503, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});
				res.end(JSON.stringify({message: "connexion_error"}));
				return;
			}
	else{	
		res.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});		
		db.collection('users').find({_id: ObjectId(id)}).toArray(function(err, results1){
			if(err){
				console.log("erreur fonction get_info fonction find 1: "+err);
				res.end(JSON.stringify({message:"erreur_de_la_db_"}));
				db.close();
			} else if (results1[0]){ // si cette personne existe
				console.log(results1[0]);	
				if(results1[0].friendList.length>=1){ // si il a au moins un ami
					var tab_friends=[];
					db.collection('users').find({username:{$in: results1[0].friendList}}).toArray(function(err, results){
						if(err){
							console.log("erreur fonction get_info fonction find 2: "+err);
							res.end(JSON.stringify({message:"erreur_de_la_db_"}));
							db.close();
						}else{
							var tab = [];
							results.forEach(function(entry){
								tab.push([entry.username, entry.statut]);
							});
							res.end(JSON.stringify({message:"get_info", donnees:tab}));
							db.close();
						}
					});
				}
				else {
					res.end(JSON.stringify({message:"get_info_ko_no_friends"}));
					db.close();
				}	
			}else{
				res.end(JSON.stringify({message:"get_info_ko"}));
				db.close(); // on referme la db
			}
		});
	}
});
};


/**
*FONCTION SET_INFO
*La fonction prend en paramètre le status que l'user veut publier, l'id du client, et la réponse à transmettre au client.
*Dans la collection users, on recherche un document qui match avec l'id.
*Si un document est trouvé :
*	- Le champs status est mis a jour ou ajouté avec le status que l'user a rentré. On renvoie ensuite un message au client : "set_info_ok".
*Sinon on renvoie "set_info_ko"
*/
exports.set_info=function(status_user, id, res){	

MongoClient.connect('mongodb://romain:alex@dogen.mongohq.com:10034/projet_maxime', function(err, db) {
	if(err) {
				console.log("erreur connexion fonction set_info: "+err);
				res.writeHead(503, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});
				res.end(JSON.stringify({message: "connexion_error"}));
				return;
			}
	else{	
			res.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});				
			db.collection('users').update({_id: ObjectId(id)}, { $set: {"statut":status_user}}, { upsert: false }, function(err, doc){
							if(err){
								console.log("erreur fonction set_info fonction find: "+err);
								res.end(JSON.stringify({message:"erreur_de_la_db_"}));
								db.close();
							}else if(doc==1){
								res.end(JSON.stringify({message:"set_info_ok"}));
								db.close();
							}else{
								res.end(JSON.stringify({message:"set_info_ko"}));
							}
						});			
	}
});
};


/**
*FONCTION ADD_FRIEND
*Fonction qui prend en paramètre l'username à ajouter, l'id du client, et la réponse à envoyer au client.
*Tout d'abord, on cherche si un document existe avec l'id en question. Si il n'existe pas on renvoie "add_frieds_ko_id_not_found".
*Si l'utilisateur existe bien:
*	le username de l'ami à ajouter est-t-il le même que celui qui ajoute ?
*	- oui : on renvoie "add_friend_ko_adding_yourself" car il ne peut pas s'ajouter lui même
*	- non : l'utilisateur qui ajoute a-t-il déjà des amis?
*		- non : on ajoute l'ami dans la friend list de l'utilisateur et on renvoie "add_friend_ok"
*		- oui : l'ami ajouté est-il déjà présent dans la liste d'ami ?
*			- non : on ajoute l'ami dans la friend list de l'utilisateur et on renvoie "add_friend_ok"
*			- oui : on renvoie "add_friend_ko_already_friend"
*/
exports.add_friend = function(friend,id,res){

MongoClient.connect('mongodb://romain:alex@dogen.mongohq.com:10034/projet_maxime', function(err, db) {
	if(err) {
		console.log("erreur connexion fonction add_friend: "+err);
		res.writeHead(503, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});
		res.end(JSON.stringify({message: "connexion_error"}));
		return;
	}else{
		res.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});		
		db.collection('users').find({_id: ObjectId(id)}).toArray(function(err, results){
					if(err) {
							console.log("erreur fonction add_friend, fonction find: "+err);
							res.end(JSON.stringify({message:"erreur_de_la_db_"}));
							db.close();
					}else if(results[0]){//si on trouve un document associé à l'id
						if(friend != results[0].pseudo){//si la personne qui demande l'ajout n'est pas la personne qui ajoute
							var tab =[];//varaiable contenant le tableau à transmettre
							if (!results[0].friendList){//si l'user n'a pas damis								
								tab.push(friend);
							}else{//si luser a déjà une friend list
								tab = results[0].friendList;//le tableau = le tableau de friend list trouvé dans la DB
								if (tab.indexOf(friend)> -1){//si l'ami est deja dans la friend list
									res.end(JSON.stringify({message:"add_friend_ko_already_friend"}));
									db.close(); 
								}else{
									tab.push(friend);//on rajoute l'ami dans le tableau							
								}								
							}
							//l'user que l'on veut ajouter n'est ni SOI-M^ME ni déjà présent dans la friend list
							//on met à jour le document avec le nouveau tableau d'amis			
							db.collection('users').update({_id: ObjectId(id)},{ $set: {friendList:tab}}, { upsert: false }, function(err, docs){
								if(err){
									console.log("erreur fonction add_friend, fonction update: "+err);
									res.end(JSON.stringify({message:"erreur_de_la_db_"}));
									db.close(); 
								}else{
									res.end(JSON.stringify({message:"add_friend_ok"}));
									db.close(); 
								}
							});
						}else{
							res.end(JSON.stringify({message:"add_friend_ko_adding_yourself"}));
							db.close(); 
						}
					}else{
						res.end(JSON.stringify({message:"id_not_found"}));
						db.close(); 
					}
				});
	}
});
};


/**
*FONCTION GET_FRIEND
*La fonction prend en paramètres l'id du client, et la réponse à envoyer au client.
*On recherche dans la collection "users" le document correspondant à l'id du client.
*Si il y a un match: le champs friendList existe-t-il?
*	- oui : on renvoie le tableau d'amis au client et le message "get_friends_ok"
*	- non : on indique que l'utilisateur n'a pas d'amis et le message "get_friends_ko_none_friend"
*
*Attention, côté client peut recevoir un tableau d'amis vide, donc une condition doit être faite côté client
*/
exports.get_friends = function(id,res){

MongoClient.connect('mongodb://romain:alex@dogen.mongohq.com:10034/projet_maxime', function(err, db) {
	if(err) {
			console.log("erreur de connexion fonction get friends: "+err);
			res.writeHead(503, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});		
			res.end(JSON.stringify({message: "connexion_error"}));
			return;
	}else{
		res.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});						
		db.collection('users').find({_id: ObjectId(id)}).toArray(function(err, results){//on veut acceder à la friend list du document avec le cookie correspondant
					if(err) {
						console.log("erreur fonction add_friends, fonction find: "+err);
						res.end(JSON.stringify({message:"erreur_de_la_db_"}));
						db.close();
					}else if(results[0]&&results[0].friendList){						
						res.end(JSON.stringify({message:"get_friends_ok",friendList:results[0].friendList}));
						db.close();
					}else if(results[0] && !results[0].friendList){//si on trouve bien la friend liste associé au cookie ET si la liste n'existe pas (<=> il a 0 ami)
						res.end(JSON.stringify({message:"get_friends_ko_none_friend"}));
						db.close();
					}else{
						res.end(JSON.stringify({message:"id_not_found"}));
						db.close();
					}
		});
	}
});
};


/**
*FONCTION DELETE_FRIEND
*La fonction prend en paramètre le username de l'ami à supprimer, l'id du client, et la réponse à envoyer.
*Dans la collection "users", on cherche d'abord si l'id match avec un document. Sinon, on renvoie "id_not_found".
*L'utilisateur a-t-il une friendList ?
*	- non : on renvoie "delete_friend_none_friend"
*	- oui : l'ami a supprimer est-il présent dans la friendList?
*		- non : on renvoie "delete_friend_ko_no_such_friend"
*		- oui : on met à jour le document avec le tableau sans l'ami et on renvoie "delete_friend_ok"
*
*/
exports.delete_friend = function(friend,id, res){

MongoClient.connect('mongodb://romain:alex@dogen.mongohq.com:10034/projet_maxime', function(err, db) {
	if(err) {//si erreur de connexion
			console.log("erreur de connexion fonction delete_friend: "+err);
			res.writeHead(503, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});		
			res.end(JSON.stringify({message: "connexion_error"}));
			return;
	}else{
		res.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Headers" : "Origin", "Access-Control-Allow-Origin" : "true"});				
		db.collection('users').find({_id: ObjectId(id)}).toArray(function(err, results){
					if(err) {//erreur fonction find
							console.log("erreur fonction delete_friend, fonction find: "+err);
							res.end(JSON.stringify({message:"erreur_de_la_db_"}));
							db.close();
					}else if(results[0]){//si on trouve un document associé au cookie
						if(results[0].friendList){//si le document a une friend liste
							var array = results[0].friendList;//on recupere le tableau friend list
							var index = array.indexOf(friend);// on cherche l'index de l'ami à supprimer
							if (index > -1) {//si l'ami à supprimer est présent dans la friend list
							    array.splice(index, 1);//on retire l'ami du tableau								
							    db.collection('users').update({_id:ObjectId(id)},{ $set: {friendList:array}}, { upsert: false }, function(err, docs){
								if(err) {
									console.log("erreur dans la fonction delete_friend, fonction update: "+err);
									res.end(JSON.stringify({message:"erreur_de_la_db_"}));
									db.close();
								}else{
									res.end(JSON.stringify({message:"delete_friend_ok"}));
									db.close();
								}
								});
							}else{//si l'ami à supprimer n'est pas dans la friend list : certainement tentative de hack								
								res.end(JSON.stringify({message:"delete_friend_ko_no_such_friend"}));
								db.close();
							}
						}else{
							res.end(JSON.stringify({message:"delete_friend_none_friend"}));
							db.close();
						}
					}else{
						res.end(JSON.stringify({message:"id_not_found"})); // conversion de l'objet JSON en string
						db.close();
					}
	});
	}
});
};
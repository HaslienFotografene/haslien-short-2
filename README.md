# Haslien-short-2
An private URL shortener.

# Endpoints

## Create a new short URL
**Required parameters**  
**`body.url`** `string` The URL after slash to use. E.g. `hello` = `hasl.in/hello`.  
**`body.dest`** `string` The full destination URL.  
**`body.desc`** `string` A description of what this link is for/where it is used. Internal note, not shown to outsiders.  

**Security**  
These pages create a JWT that contains the path and type. When user POST, JWT is validated against a per-restart-unique key, and if succeed, proceed to authenticate the provided form input in order to proceed.  
Example JWT:  
```json
{
	"path": "google",
	"type": "login",
	"iat": 1589754040,
	"exp": 1589754940
}
```
**[body.passphrase]** `string` Add a basic passphrase. `body.user` takes precedence if also present.  
**[body.user]** `object` -> `user.username` `user.password` Add a username x password combination requirement. Takes precedence over `body.passphrase`  

**Additional**  
**[body.frame=false]** `boolean` the destination is to be hosted as an iframe. **⚠ NB:** if using 'iframe', keep in mind certain sites can disallow framing of their page.  

**Request sample:**
```
POST {
	Content-Type: application/json
	Authorization: Bearer <API_TOKEN>
}
/.new/
Body: {
	"url": "passworded",
	"dest": "https://google.com",
	"desc": "This is a description",
	"passphrase": "secret",
	"user": {
		"username":"testing",
		"password":"Password123"
	},
	"frame": true
}
```

**Response:**  
If user password is passed, that password is omitted in response.
`users.flags` is a flag specific to this user. Can be things like 'blocked' and so on.
```
{Content-Type: application/json}
Status: 201
Body: {
    "err_client": false,
    "err_internal": false,
    "message": "Success.",
    "data": {
        "_id": "5e8e96af45764d966e0eefd7",
        "url": "passworded",
        "dest": "https://google.com",
        "desc": "This is a description",
        "created": "2020-04-09T03:29:51.550Z",
        "modified": "2020-04-09T03:29:51.550Z",
        "uses": 0,
        "passphrase": "secret",
        "users": [
            {
                "username": "testing",
                "flags": 0
            }
        ],
        "flags": 6
    }
}
```

# Logs
Uses of links are logged and a counter on a short-url increased.
Logs can be requested using: 
```http request
GET /.list/logs?[limit=100]&[offset=0]
Content-Type: application/json
Authorization: Bearer {token}
```

# Roadmap
* iframe embedder on 'frame' flag (*done?*)
* Make a random URL generation
* Create generated unique passphrase for a specific URL
* ~~Create nice UI for login/passphrase~~
* ~~Verify statistics logging working~~
* Add statistics to authorized endpoints:  
	* successfull logins
	* invalid logins
	* uses in general
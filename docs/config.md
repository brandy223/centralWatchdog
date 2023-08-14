
# Configuration

The configuration of the project is done in two steps.
The first one is to configure the project itself, and the second one is to configure the database.
We will see here how to configure the project.
To configure the database, please read the [database documentation](database.md).

<br>

## Project configuration

To configure the project, you have first to create a configuration file named 
"config.json" in the root of the project.
<br>Here is an example of a configuration file:

### config.json
```json
{
  "config": {
    "mainServer": {
      "port": 3005,
      "check_period": 10000
    },
    "nodeServers": {
      "check_period": 10000,
      "max_time_between_connections": 30000
    },
    "apiCash": {
      "message_default_duration": 86400,
      "cache_duration": 86400
    },
    "mail": {
      "cooldown": 20000,
      "host": "",
      "port": 25,
      "author": "",
      "secure": false,
      "ignoreTLS": true
    },
    "message":{
      "cooldown": 30000
    },
    "jobs": {
      "check_period": 60000,
      "cache_duration": 60
    },
    "servers": {
      "check_period": 60000,
      "cache_duration": 60
    },
    "services": {
      "check_period": 60000,
      "cache_duration": 60
    },
    "servicesData": {
      "check_period": 20000,
      "cache_duration": 60
    },
    "pfSense": {
      "check_period": 20000,
      "cache_duration": 60
    },
    "ping": {
      "timeout": 10,
      "extra": ["-i", "0.5", "-c", "1"]
    },
    "apis": {
      "holidays_url": "",
      "sms_url": "",
      "pfsense_url": ""
    },
    "cache": {
      "default_ttl": 3600,
      "check_period": 30,
      "deleteOnExpire": true
    },
    "misc": {
      "min_hour": 6,
      "max_hour": 20,
      "priorities_list": [1, 2, 3, 4]
    }
  }
}
```

The port is the port on which the main watchdog will listen for requests.
`cache_duration`is the duration of the cache value in seconds (This is related to the
frequency which values are updated).
`check_period` is the period of time in milliseconds between each check of watched objects (servers, services, etc).
<br>There are indeed few configuration blocks for some of the dependencies of the project (as [nodemailer](https://www.npmjs.com/package/nodemailer),
[node-cache](https://www.npmjs.com/package/node-cache) and [ping](https://www.npmjs.com/package/ping).
<br>For more information about the configuration of these dependencies, please refer to their documentation.

Finally, `misc` contains 2 information: 
<br>`min_hour` and `max_hour`. These are the hours between which the watchdog can send a message or an email.
<br>`priorities_list` is the list of priorities that scenarios (or actors / list of actors) could have. The higher the priority is, the less important the scenario is.

<hr />

Then, you have to create now an environment file named ".env" in the root of the project.
<br>Here is an example of the environment file:

### .env
```ini
DATABASE_URL=""

# SSH
SSH_USER=""

# APICASH
APICASH_DB_HOST=""
APICASH_DB_USER=""
APICASH_DB_PASSWORD=""
APICASH_DB_NAME=""

# PFSENSE
PFSENSE_USER=""
PFSENSE_PASSWORD=""
```

The `DATABASE_URL` is the URL of the database. It is the URL used by [Prisma](https://www.prisma.io/) to connect to it.
<br>`SSH_USER` is the default user used to connect to the servers if none is specified in database when adding a server.
<br>`APICASH` category is used to configure the connection to the apiCash messages database.
<br>`PFSENSE` category is used to configure the connection to the pfSense firewall.

Finally, you'll have to configure the database. To do so, please read the [database documentation](database.md).
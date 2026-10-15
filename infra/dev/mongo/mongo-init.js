// Creates the least-privileged app user, same as in production (infra/production/mongodb/mongodb-init.yaml).
db.getSiblingDB('songRequests').createUser({
	user: 'jubeljukebox',
	pwd: process.env.MONGO_APP_PASSWORD,
	roles: [{ role: 'readWrite', db: 'songRequests' }]
});

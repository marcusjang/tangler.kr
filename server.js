const app = require('./app');
const debug = require('debug')('server');
const http = require('http');

const port = process.env.PORT || 3000;

let server = http.createServer(app.callback());

server.listen(port);

server.on('listening', () => {
	let addr = server.address();
	let bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr.port;
	debug('Listening on ' + bind);
});

server.on('error', err => {
	switch(err.code) {
		case 'EACCESS':
			debug('ERROR: Requires elevated privileges');
			process.exit(1);
			break;
		case 'EADDRINUSE':
			debug('ERROR: Port ' + port + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
	}
});

process.once('SIGUSR2', () => {
	debug('Process exited at ' + new Date().toLocaleString());
  process.kill(process.pid, 'SIGUSR2');
});

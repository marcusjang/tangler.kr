'use strict';
const Koa = require('koa');
const debug = require('debug')('app');
const mount = require('koa-mount');
const config = require('./config.json');

const app = new Koa();

app.use(require('koa-views')(__dirname + '/views', { extension: 'pug' }));
app.use(require('koa-response-time')());
app.use(require('koa-helmet')());
app.use(require('koa-conditional-get')());
app.use(require('koa-etag')());
app.use(require('koa-morgan')('dev'));
app.use(require('koa-bodyparser')());
app.use(require('koa-compress')({
  flush: require('zlib').Z_SYNC_FLUSH
}));

// Serve up static files up on /public
app.use(mount('/public', require('koa-static')('public')));

app.use(require('koa-favicon')(require.resolve('./public/favicon.ico')));

// Error handler
app.use(async (ctx, next) => {
	try {
		await next();
		let status = ctx.status || 404;
		if (status === 404) ctx.throw(404);
	} catch (err) {
		ctx.state.message = err.message;
		ctx.state.error = app.env === 'development' ? err : {};

		ctx.status = err.status || 500;
		debug('ERROR ' + ctx.status + ': ' + 'erro.message');
		await ctx.render('error');
	}
});

// Get site configs
app.use((ctx, next) => {
	ctx.state.site = config.site;

	let footerYear = ctx.state.site.footerYear;
	let currentYear = (new Date()).getFullYear();
	ctx.state.site.footerYear = footerYear + (footerYear !== currentYear ? ' - ' + currentYear : 0)
	return next();
});

// Internalisation support
const y18n = require('y18n')({ locale: 'ko' });
app.use((ctx, next) => {
  ctx.state.__ = y18n.__;
  return next();
});

// Mongoose setup
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
if (app.env === 'development') {
	mongoose.set('debug', true);
}
mongoose.connect(config.mongodb);

// Set up sessions
app.keys = config.keys;
app.use(require('koa-session')({ key: 'tgr:sess' }, app));

// Flash message middleware
app.use((ctx, next) => {
	// Get session flashes into state flash
	// Then flush session flash
	ctx.state.flash = ctx.session.flash || new Array();
	delete ctx.session.flash;

	// A container to get state flash in its finalised state
	ctx.state.getMessages = () => {
		// and return JSON stringified stringy thingy
		return JSON.stringify(ctx.state.flash || new Array());
	};

	return next();
});

// CSRF support
const csrf = require('koa-csrf');
app.use(new csrf());

// Passport setup
const passport = require('koa-passport');
app.use(passport.initialize());
app.use(passport.session());

const Account = require('./models/account');
const LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// Routes
app.use(mount('/', require('./routes/index')));
app.use(mount('/auth', require('./routes/auth')));
app.use(mount('/admin', require('./routes/admin')));

module.exports = app;

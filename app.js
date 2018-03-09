'use strict';
const Koa = require('koa');
const debug = require('debug')('app');
const mount = require('koa-mount');
const mongoose = require('mongoose');
const csrf = require('koa-csrf');
const passport = require('koa-passport');
const y18n = require('y18n')({ locale: 'ko' });
const config = require('./config.json');

const app = new Koa();

app.use(require('koa-views')(__dirname + '/views', { extension: 'pug' }));
app.use(require('koa-response-time')());
app.use(require('koa-helmet')());
app.use(require('koa-conditional-get')());
app.use(require('koa-etag')());
app.use(require('koa-morgan')('dev'));

app.use(mount('/public', require('koa-static')('public')));

app.use(require('koa-favicon')(require.resolve('./public/favicon.ico')));
app.use(require('koa-bodyparser')());

app.use(async (ctx, next) => {
	try {
		await next();
		let status = ctx.status || 404;
		if (status === 404) ctx.throw(404);
	} catch (err) {
		ctx.state.message = err.message;
		ctx.state.error = app.env === 'development' ? err : {};

		ctx.status = err.status || 500;
		await ctx.render('error');
	}
});

app.use((ctx, next) => {
  ctx.state.site = config;
  ctx.state.__ = y18n.__;
  return next();
});

app.use((ctx, next) => {
	ctx.state.Flash = class {

	};
	ctx.state.flash = ctx.session.flash;
	delete ctx.session.flash;
	return next();
});

app.use(require('koa-compress')({
  flush: require('zlib').Z_SYNC_FLUSH
}));

app.keys = config.keys;
app.use(require('koa-session')({
  maxAge: 24 * 60 * 60 * 1000 // One Day
}, app));

app.use(new csrf());

app.use(passport.initialize());
app.use(passport.session());

const Account = require('./models/account');
const LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

mongoose.Promise = global.Promise;
mongoose.connect(config.mongodb);

app.use(mount('/', require('./routes/index')));
app.use(mount('/auth', require('./routes/auth')));


module.exports = app;

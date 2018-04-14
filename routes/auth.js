'use strict';
const Router = require('koa-router');
const passport = require('koa-passport');
const Account = require('../models/account');
const auth = require('../middlewares/auth');

const router = new Router();
const routes = new Object();

// Form class to render views easily with action, csrf and user
class Form {
	constructor(mode, ctx) {
		this.register = (mode === 'register') ? true : false;
		this.action = ctx.originalUrl;
		this.csrf = ctx.csrf;
		this.user = ctx.request.body || { username: '', name: '' };
	}
}

// Authenticate subroutine using passport.authenticate()
const authenticate = async (ctx, next, message) => {
	await passport.authenticate('local', async (err, user, info) => {

		// Throw authentication errors
		if (err) throw err;
		// and invalid user errors
		if (!user) throw new Error(info.message);

		// Wait for login
		await ctx.login(user);

		// Build a welcome flash message
		ctx.session.flash = [{
			type: 'info',
			text: ctx.state.__(message, user.name)
		}];

		// Redirect
		let redirect = ctx.session.redirect || '/u/' + user.id;
		if (ctx.session.redirect) delete ctx.session.redirect;
		ctx.redirect(redirect);

	})(ctx, next);
}

/**
*			/auth/login
**/
routes.login = new Router();
routes.login.path = '/';
routes.login
	.get('/', async ctx => {
		// Render the login form
		ctx.state.form = new Form('login', ctx);
		await ctx.render('auth');
	})

	.post('/', async (ctx, next) => {
		try {
			// Authenticate then redirect
			await authenticate(ctx, next, 'Successfully logged in as %s');

		} catch (err) {

			// Set the flash to the ctx.state directly since we won't redirect
			ctx.state.flash = [{
				type: 'error',
				text: ctx.state.__(err.message)
			}];

			// Rendering magic
			ctx.state.form = new Form('login', ctx);
			await ctx.render('auth');			
		}
	});

/**
*			/auth/logout
**/
routes.logout = new Router();
routes.logout.path = '/logout';
routes.logout
	// Do a user check first
	.use('/', auth.user('/'))

	.get('/', async ctx => {
		// Render the logout form
		ctx.state.form = new Form('logout', ctx);
		await ctx.render('auth.logout');
	})

	.post('/', ctx => {
		// Build the success flash message
		ctx.session.flash = [{
			type: 'info',
			text: ctx.state.__('Successfully logged out')
		}];

		// Then logout and redirect
		ctx.logout();
		ctx.redirect('/');
	});

/**
*			/auth/register
**/
routes.register = new Router();
routes.register.path = '/register';
routes.register
	.get('/', async ctx => {
		// Render the register form
		ctx.state.form = new Form('register', ctx);
		await ctx.render('auth');
	})

	.post('/', async (ctx, next) => {
		// Shorthand for ctx.request.body
		let body = ctx.request.body;

		try {
			// Catch if the password confirmation doesn't matche
			if (body.password !== body.confirmPassword) {
				throw new Error("Passwords don't match");
			}

			// Let's wait for registration through mongoose
			await Account.register(
				new Account({
					username: body.username,
					name: body.name
				}),
				body.password
			);

			// and authenticate then redirect
			await authenticate(ctx, next, 'Successfully registered as %s');

		} catch (err) {
			// Let's construct a flash array first
			let flash = [];

			// Error handling for through flashing messages
			if (err.name == 'ValidationError') {
				// Push for each validation errors
				// Needed since mongoose validation error objects look weird
				for (const key in err.errors) {
					flash.push({
						type: 'error',
						text: ctx.state.__(err.errors[key].message)
					});
				}
			} else {
				// If it's not a mongoose validation error, just push once
				flash.push({
					type: 'error',
					text: ctx.state.__(err.message)
				});
			}

			// Set the flash to the ctx.state directly since we won't redirect
			ctx.state.flash = flash;

			// Rendering magic
			ctx.state.form = new Form('register', ctx);
			await ctx.render('auth');
		}
	});

// Mount the routes to the main router
for (const key in routes) {
	const route = routes[key];
	router.use(
		route.path,
		route.routes(),
		route.allowedMethods()
	);
}

module.exports = router.routes();

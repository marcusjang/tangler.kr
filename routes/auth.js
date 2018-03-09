'use strict';
const Router = require('koa-router');
const passport = require('koa-passport');
const Account = require('../models/account');
const auth = require('../middlewares/auth')

const router = new Router();

const route = {
	register: '/register',
	login: '/',
	logout: '/logout'
}

// Form class to render views easily with action, csrf and user
class Form {
	constructor(mode, ctx) {
		this.register = (mode === 'register') ? true : false;
		this.action = ctx.originalUrl,
		this.csrf = ctx.csrf;
		this.user = ctx.request.body;
	}
}

/**
*			/auth/register
**/
router
	.get(route.register, async ctx => {
		ctx.state.form = new Form('register', ctx);
		await ctx.render('auth');
	})

	.post(route.register, async (ctx, next) => {
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

			// and authentication through passport
			await passport.authenticate('local')(ctx, next);

			let redirect = ctx.session.redirect || '/'; // Should be something like /user/:id later
			if (ctx.session.redirect) delete ctx.session.redirect;
			ctx.redirect(redirect);

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
						text: err.errors[key].message
					});
				}
			} else {
				// If it's not a mongoose validation error, just push once
				flash.push({
					type: 'error',
					text: err.message
				});
			}

			// Set the flash to the ctx.state directly since we won't redirect
			ctx.state.flash = flash;

			// Rendering magic
			ctx.state.form = new Form('register', ctx);
			await ctx.render('auth');
		}
	});

/**
*			/auth/login
**/
router
	.get(route.login, async ctx => {
		let form = new Form('login', ctx);

		await ctx.render('auth', {
			form: form
		});
	})

	.post(route.login, passport.authenticate('local'), ctx => {
		let redirect = ctx.session.redirect || '/';
		if (ctx.session.redirect) delete ctx.session.redirect;
		ctx.redirect(redirect);
	});

/**
*			/auth/logout
**/
router
	// Do a user check first
	.use(route.logout, auth.user('/'))

	.get(route.logout, async ctx => {
		let form = new Form('login', ctx);

		await ctx.render('logout', {
			form: form
		});
	})

	.post(route.logout, async ctx => {
		ctx.logout();
		ctx.body = 'logout';
	});

module.exports = router.routes();

'use strict';
const Router = require('koa-router');
const passport = require('koa-passport');
const fs = require('fs');
const { promisify } = require('util');
const auth = require('../middlewares/auth');

const router = new Router();
const routes = new Object();

const getModels = async (modelDir) => {
	const readdir = promisify(fs.readdir);

	let files = await readdir(modelDir);
	let models = [];
	for (let i = 0; i < files.length; i++) {

		// Gets rid of ".js" extension, hopefully
		let file = files[i].slice(0, -3);
		// Skip if filename starts with underscore
		if (file.charAt(0) === '_') continue;

		models.push(file);
	}
	return models;
};

// Form class to render views easily with action, csrf and user
class Form {
	constructor(ctx, model) {
		Object.assign(this, model.adminData);
		this.action = ctx.originalUrl;
		this.csrf = ctx.csrf;
	}
}

/**
*			/admin
**/
routes.admin = new Router();
routes.admin.path = '/';
routes.admin
	.use('/', auth.user('/admin'))
	.get('/', async ctx => {
		try {
			let models = await getModels('models');

			for (let i = 0; i < models.length; i++) {
				let model = models[i];

				models[i] = require('../models/' + model).adminData;
				models[i].slug = model;
			}

			ctx.state.models = models;
			await ctx.render('admin');

		} catch (err) {
			ctx.throw(err);
		}
	});

/**
*			/admin/:model(/:page)
**/
routes.model = new Router();
routes.model.path = '/:model/:page(\\d+)?';
routes.model
	.use('/', (ctx, next) => {
		let redirect = '/admin/' + ctx.params.model;
		return auth.user(redirect)(ctx, next);
	})
	.use('/', (ctx, next) => {
		return auth.privilege(ctx.params.model)(ctx, next);
	})

	.get('/', async (ctx, next) => {
		if (ctx.params.model === 'privilege') {
			try {
				const Privilege = require('../models/privilege');
				const models = await getModels('models');
				const privileges = await Privilege.find();

				for (let i = 0; i < privileges.length; i++) {
					privileges[i] = privileges[i].slug;
				}

				// Things to add
				let additions = [];
				for (let i = 0; i < models.length; i++) {
					if (privileges.indexOf(models[i]) !== -1) continue;
					additions.push({ slug: models[i] });
				}

				// Then add the things to add
				if (additions.length > 0) {
					await Privilege.insertMany(additions);
				}

				// Things to delete
				let deletions = [];
				for (let i = 0; i < privileges.length; i++) {
					if (models.indexOf(privileges[i]) !== -1) continue;
					deletions.push(privileges[i]);
				}

				// Then delete the things to delete
				if (deletions.length > 0) {
					await Privilege.remove({ slug: { $in: deletions } });
				}

				await next();

			} catch (err) {
				ctx.throw(err);
			}
		} else {
			return next();
		}
	})

	.get('/', async ctx => {
		console.log(ctx.params.page); // Let's add pagination next
		const model = require('../models/' + ctx.params.model);

		ctx.state.model = model.adminData;
		ctx.state.docs = await model.find({});
		ctx.state.urlScheme = '/admin/' + ctx.params.model + '/item/';

		await ctx.render('admin');
	});

/**
*			/admin/:model/item/:item
**/
routes.item = new Router();
routes.item.path = '/:item/item/:item';
routes.item
	// User authentication
	.use('/', (ctx, next) => {
		let redirect = '/admin/' + ctx.params.model +
			'/item/' + ctx.params.item;
		return auth.user(redirect)(ctx, next);
	})

	// Admin authentication
	.use('/', (ctx, next) => {
		return auth.privilege(ctx.params.model)(ctx, next);
	})

	.get('/', async ctx => {
		const model = require('../models/' + ctx.params.model);
		const form = new Form(ctx, model);
		const doc = await model.findOne({ [form.key]: ctx.params.item });

		for (const field of form.fields) {
			// type detection
			const instance = model.schema.path(field.slug).instance;
			field.type = (instance === 'Number') ? 'number' : 'text';
			field.value = doc[field.slug];
		}

		ctx.state.form = form;

		await ctx.render('admin.form');
	})

	.post('/', async ctx => {
		const model = require('../models/' + ctx.params.model);
		const slug = model.adminData.fields[0].slug;
		const key = model.adminData.key;
		
		let request = ctx.request.body;

		// Delete csrf token from the request body
		delete request._csrf;
		// Delete the slug field which we use as the key too
		delete request[key];

		try {
			let doc = await model.findOneAndUpdate(
				{ [key]: ctx.params.item },
				{ $set: request },
				{ runValidators: true, new: true }
			);

			let name = ctx.state.__(model.adminData.name);

			ctx.session.flash = [{
				type: 'info',
				text: ctx.state.__('Successfully updated "%s" entry "%s"', name, doc[slug])
			}];

			ctx.redirect('/admin/' + ctx.params.model);
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

			ctx.session.flash = flash;

			ctx.redirect(ctx.originalUrl);
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

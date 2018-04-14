'use strict';

const getPrivilege = async (ctx, model) => {
		const Privilege = require('../models/privilege');
		const level = ctx.state.user.level
			.toString(2).padStart(8, '0') // to binary and then pad zeros
			.split('').reverse().join(''); // and then reverse
		const requirement = (await Privilege.findOne({ slug: model }) || { level: level.length-1 }).level;

		return (requirement == 0 || level[requirement] == 1 || level[level.length-1] == 1);
}

module.exports = {
	user: (redirectTo) => {
		return (ctx, next) => {
			if(ctx.isAuthenticated()) {
				return next();
			} else {
			  ctx.session.redirect = redirectTo;
				ctx.redirect('/auth');
			}
		}
	},
	privilege: (model) => {
		return async (ctx, next) => {
			if (await getPrivilege(ctx, model)) {
				return next();
			} else {
				throw new Error('not enough privilege');
				return next();
			}
		}
	},
	isPrivileged: (model) => {
		return async (ctx, next) => {
			return await getPrivilege(ctx, model);
		}
	}
}

'use strict';

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
	}
}

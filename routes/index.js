'use strict';
const Router = require('koa-trie-router');

const router = new Router();

router.get('/', async ctx => {
	await ctx.render('index', {
	});
});

module.exports = router.middleware();

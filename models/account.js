'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const counter = require('./counter');

let Account = new Schema({
	username: { type: String, required: true, unique: true, validate: {
		validator: (v) => {
			let length = /^[a-zA-Z0-9._@-]{4,32}$/.test(v);
			let chars = !(/[._@-]{2,}/.test(v));
			console.log (length, chars);
			return (length && chars);
		},
		message: '{PATH} can only consist of 4 to 32 characters of alphabets, numbers, and non-consecutive at signs, underscores, dashes, or dots'
	} },
	password: { type: String, select: false },
	level: { type: Number, default: 1 },
	id: { type: Number, unique: true, index: true },
	name: { type: String, required: true, minlength: [ 2, 'At least 2 characters are required for {PATH}' ]}
})

Account.plugin(passportLocalMongoose);

Account.pre('save', async function(next) {
	let doc = this;
	try {
		let count = await counter.findByIdAndUpdate(
			{ _id: 'Account' },
			{ $inc: { seq: 1 }},
			{ upsert: true, new: true }
		);
		doc.id = count.seq;
		next();
	} catch (err) {
		throw err;
	}
});

module.exports = mongoose.model('Account', Account);

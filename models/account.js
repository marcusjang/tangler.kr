'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const counter = require('./counter');

let Account = new Schema({
	username: { type: String, required: true, unique: true, index: true, lowercase: true },
	password: { type: String, select: false },
	level: { type: Number, default: 1 },
	id: { type: Number, unique: true, index: true },
	name: { type: String, required: true, minlength: [ 2, 'At least 2 characters are required for {PATH}' ]}
})

Account.plugin(passportLocalMongoose);

Account.pre('save', async next => {
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

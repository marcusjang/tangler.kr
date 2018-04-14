'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const counter = require('./_counter');

let Account = new Schema({
	id: { type: Number, unique: true },
	username: { type: String, required: true, unique: true, validate: {
		validator: (v) => {
			let length = /^[a-zA-Z0-9._@-]{4,32}$/.test(v);
			let chars = !(/[._@-]{2,}/.test(v));
			return (length && chars);
		},
		message: '{PATH} can only consist of 4 to 32 characters of alphabets, numbers, and non-consecutive at signs, underscores, dashes, or dots'
	} },
	password: { type: String, select: false },
	level: { type: Number, default: 1, validate: {
		validator: (v) => { return (v <= 255 && v >= 0); },
		message: '{PATH} should be a integer between 0 and 255.'
	} },
	name: { type: String, required: true, minlength: [ 2, 'At least 2 characters are required for {PATH}' ]}
});

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

module.exports = (() => {
	let model = mongoose.model('Account', Account);
	model.adminData = {
		title: 'Account Settings',
		name: 'account',
		key: 'id',
		fields: [
			{ slug: 'username', title: 'Username' },
			{ slug: 'name', title: 'Name' },
			{ slug: 'level', title: 'Admin level',
				// This is client-side Javascript!
				script: function() {
					var input = document.getElementsByName('level')[0];
					input.setAttribute('min', 0);
					input.setAttribute('max', 255);
					input.type = 'hidden';

					var container = document.createElement('span');
					container.id = 'admin-privilege'

					for (var i = 0; i < 8; i++) {
						var button = document.createElement('i');
						button.classList.add('btn', 'circular');
						button.setAttribute('v-bind:class', '{ accent: accent[' + i + '] }');
						button.setAttribute('v-on:click', 'toggleLevel');
						button.innerText = i + 1;
						container.appendChild(button);
					}

					var wrapper = document.currentScript.parentNode;
					wrapper.appendChild(container);
					
					document.currentScript.remove();
				}
			}
		],
		// This is client-side Javascript!
		beforeCreate: function() {
			this.$options.methods = {
				toggleLevel: function(e) {
					var el = e.target;
					var val = Math.pow(2, (e.target.innerText - 1));
					var index = Array.prototype.indexOf.call(el.parentNode.children, el);
					if (el.classList.contains('accent')) val = val * -1;
					this.level = this.level + val;
				}
			}

			this.$options.computed = {
				accent: function() {
					var level = (this.level*1)
						.toString(2).padStart(8, '0')
						.split('').reverse().join('');
					var accent = [];
					for (var i = 0; i < level.length; i++) {
						accent[i] = (level[i]*1) ? true : false;
					}
					return accent;
				}
			}
		}
	}
	return model;
})();

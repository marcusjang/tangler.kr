'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let privilege = new Schema({
	slug: { type: String, required: true, index: true },
	level: { type: Number, default: 1, validate: {
		validator: (v) => { return (v <= 7 && v >= 0); },
		message: '{PATH} should be a integer between 0 and 7.'
	} }
});

module.exports = (() => {
	let model = mongoose.model('Privilege', privilege);
	model.adminData = {
		title: 'Admin Privilege Settings',
		name: 'Privilege',
		key: 'slug',
		fields: [
			{ slug: 'slug', title: 'Privilege' },
			{ slug: 'level', title: 'Admin level',
				// This is client-side Javascript!
				script: function() {
					var input = document.getElementsByName('level')[0];
					input.setAttribute('min', 0);
					input.setAttribute('max', 7);

					document.currentScript.remove();
				}
			}
		]
	}
	return model;
})();

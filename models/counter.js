'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let Counter = new Schema({
	_id: { type: String, required: true },
	seq: { type: Number, default: 1 }
})

module.exports = mongoose.model('counter', Counter);

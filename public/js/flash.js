'use strict';
Vue.component('flash', {
	props: ['type', 'text', 'index'],
	template: '\
		<div v-bind:class="type" class="flash" v-on:click="$emit(\'remove\')">\
			<p>\
				<i class="la la-2x"></i>\
				<span>{{ text }}</span>\
			</p>\
		</div>\
	'
});

var flash = new Vue({
	data: {
		messages: new Array(),
		counter: 0
	},
	methods: {
		addMessage: function(type, text) {
			this.messages.push({
				id: this.counter++,
				type: type,
				text: text
			});
		}
	},
	updated: function() {
		this.$nextTick(function() {
			var target = this.$root.$children[0].$children[0];
			if (target) {
				window.setTimeout(function() {
					target.$emit('remove');
				}, 4000);
			}
		});
	}
});

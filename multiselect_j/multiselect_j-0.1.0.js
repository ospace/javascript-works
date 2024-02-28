/**
 * Simple multiselect
 * Multiselect을 지정하려면 select 태그이고 multiple 속성이 지정되어야 함.
 * @Version: 0.2.0
 * @Author: ospace114@empal.com
 * @Website: ospace.tistory.com
 * @Source:
 */
//Ref: https://github.com/nobleclem/jQuery-MultiSelect/blob/master/jquery.multiselect.js

(function ($) {
	const NAME = 'multiselect_j';
	var defaults = {
		height: '7rem',
		width: '100%',
	};

	/*	var msj_options_base_css = {
		'box-sizing': 'border-box'
	};
  */
	var opt_label_for = 1;

	function Multiselect(elem, opts) {
		var self = this;
		this.elem = $(elem).hide();
		this.opts = $.extend(defaults, opts);

		if (!('SELECT' === this.elem[0].nodeName && this.elem.attr('multiple'))) {
			throw 'multiselct must be a <select> with multiple attribute';
		}

		this.msj_btn = $('<button/>').text('Not Selected').css({ 'max-height': this.opts.height, width: this.opts.width });
		this.msj_opt = $('<div/>', { class: 'msj-options' }).css({
			'max-height': this.opts.height,
			width: this.opts.width,
		});
		this.msj_opt_base = $('<div/>', { class: 'msj-options-base' })
			//.css(msj_options_base_css)
			.append(this.msj_btn)
			.append(this.msj_opt);
		this.msj_opt.append(
			$('<div/>', { class: 'msj-search' }).append(
				$('<input/>', { type: 'text', placeholder: 'Search Keyword' }).on('change', function (e, v) {
					var val = $(this).val();
					self.msj_opt.find('div.msj-option').each(function () {
						~$(this).text().indexOf(val) ? $(this).show() : $(this).hide();
					});
				}),
			),
		);
		this.elem.after(this.msj_opt_base);
		this.init();
		this.msj_btn.on('click', function () {
			self.msj_opt.is(':visible') ? self.msj_opt.hide() : self.msj_opt.show();
		});
		this.elem.on('change', ev => {
			this.elem.val().forEach(it => {
				let found = this.msj_opt_base.find(`input:checkbox[value=${it}]`);
				if (found.length && !found.prop('checked')) found.prop('checked', true).trigger('change');
			});
		});
	}

	function multiselect_add(self, text, value) {
		let opt_label = `msj-opt-${opt_label_for}`;
		self.msj_opt.append(
			$('<div/>', { class: 'msj-option' }).append(
				$('<label/>', { for: opt_label })
					.append(
						$('<input/>', { id: opt_label, type: 'checkbox', value }).on('change', function () {
							self.elem
								.find(`option[value='${this.value}']`)
								.prop('selected', $(this).prop('checked'))
								.trigger('change');
							var checkedVal = self.msj_opt
								.find('input:checked')
								.map(function () {
									return $(this).parent().text();
								})
								.toArray();
							self.msj_btn.text(checkedVal.length > 0 ? checkedVal.join(',') : 'Not Selected');
						}),
					)
					.append(text),
			),
		);
		++opt_label_for;
	}

	function select_add(self, text, value) {
		self.elem.append($('<option/>', { value }).text(text));
	}

	Multiselect.prototype = {
		init: function () {
			var self = this;
			self.elem.children().each(function () {
				if ('OPTION' == this.nodeName) {
					multiselect_add(self, this.text, this.value);
				}
			});
		},
		add: function (text, value) {
			select_add(this, text, value);
			multiselect_add(this, text, value);
		},
	};

	$.fn[NAME] = function (opts) {
		var args = arguments;
		if (undefined == opts || 'object' === typeof opts) {
			return this.each(function () {
				if ($.data(this, NAME)) return;
				$.data(this, NAME, new Multiselect(this, opts));
			});
		} else if ('string' === typeof opts && 'init' != opts) {
			this.each(function () {
				var inst = $.data(this, NAME);
				if ('function' === typeof inst[opts]) {
					inst[opts].apply(inst, Array.prototype.slice.call(args, 1));
				} else if ('unload' === opts) {
					$.data(this, NAME, null);
				}
			});
		}
	};
})(jQuery);

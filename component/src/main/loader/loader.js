/**
 * @author AidenXiong
 * @version 1.0
 * @date 2014-09-16
 * @description 图片懒加载
 * @extends mo.Base
 * @name mo.Loader
 * @requires lib/zepto.js
 * @param {HTMLElement} container=window 懒加载的容器 默认
 * @param {object} [opts] 配置参数
 * @param {number} [opts.threshold=0] 距离viewport的值
 * @param {dataAttr} [opts.dataAttr=original] 所有资源加载完成后的回调
 * @example
		new mo.Loader(getSource(),{
			onLoading : function(count,total){
				console.log('onloading:single loaded:',arguments)
			},
			onComplete : function(time){
				console.log('oncomplete:all source loaded:',arguments)
			}
		})
 * @see lazyLoad/lazyLoad.html 资源预加载
 * @class
*/
define(function(require, exports, module){
	require('../motion/motion.js');
	require('../base/base.js');
	Motion.add('mo.Loader:mo.Base', function() {
		/**
		 * public 作用域
		 * @alias mo.Loader#
		 * @ignore
		 */
		var _public = this;

		var _private = {
			/**
			 * 空函数  什么也不干
			 * @return {[type]} [description]
			 */
			'empty' : function(){},
			/**
			 * 图片加载
			 * @param  {string}   src 需要加载的图片路径
			 * @param  {Function} fn  加载完图片的回调
			 * @return {undefined}       
			 */
			'imgLoader' : function(src, fn){
				var img = new Image();
				img.onload = img.onerror = function(){ //加载错误也认为是加载完成
					fn(src, img);
					img.onload = null;
				}
				img.src = src;
			},
			/**
			 * 脚本加载
			 * @param  {string}   src 需要加载的脚本路径
			 * @param  {Function} fn  加载完图片的回调
			 * @return {string} charset 脚本编码       
			 */
			'jsLoader' : function(){
				var firstScript = document.getElementsByTagName('script')[0];
				var scriptHead = firstScript.parentNode;
				var re = /ded|co/;
				var onload = 'onload';
				var onreadystatechange = 'onreadystatechange'; 
				var readyState = 'readyState';
				return function(src, fn, charset){
					charset = charset || 'gb2312';
					var script = document.createElement('script');
					script.charset = charset;
					script[onload] = script[onreadystatechange] = function(){
						if(!this[readyState] || re.test(this[readyState])){
							script[onload] = script[onreadystatechange] = null;
							fn && fn(src, script);
							script = null;
						}
					};
					script.async = true;
					script.src = src;
					scriptHead.insertBefore(script, firstScript);
				}
			}(),
			/**
			 * css样式文件加载
			 * @param  {string}   href 样式文件路径
			 * @param  {Function} fn   加载完成后的回调
			 * @return {undefined}     
			 */
			'cssLoader' : function(href,fn){
				var head = document.head || document.getElementsByTagName('head')[0];
				node = document.createElement('link');
				node.rel = 'stylesheet';
				node.href = href;
				head.appendChild(node);
				fn && fn(href, node);
			},
			/**
			 * [description]
			 * @param  {string}   src 音频文件路径
			 * @param  {Function} fn  加载完成的回调
			 * @return {undefined}    
			 */
			'audioLoader' : function(src, fn){
				var aud = new Audio();
				$(aud).bind('canplaythrough', function() { // totally loaded
					fn(src, aud);
				});
				aud.src = src;
				aud.load();
			},
			/**
			 * 根据url获取扩展名
			 * @param  {string} url url路径
			 * @return {string}     扩展名
			 */
			getExt : function(url){
				return url.match(/\.([^\.]*)$/)[0].substr(1).match(/^[a-zA-Z0-9]+/)[0];
			},
			/**
			 * 根据url获取资源类型
			 * @param  {string} url 文件路径
			 * @return {string}     文件类型
			 */
			getType : function(url){
				var ext = _private.getExt(url);
				var types = {
					'img' : ['png','jpg','gif'],
					'css' : ['css'],
					'js' : ['js'],
					'audio' : ['mp3','ogg','wav']
				}
				for(var k in types){
					if(types[k].indexOf(ext) > -1){
						return k
					}
				}
				return false;
			}
		};

		/**
		 * public static作用域
		 * @alias mo.Loader.
		 * @ignore
		 */
		var _static = this.constructor;



		_public.constructor = function(res, config) {
			if (!res) {
				return;
			}
			this.init(res, config);
		}

		// 插件默认配置
		_static.config = {
			'onLoading' : _private.empty,
			'onComplete' : _private.empty,
			'dataAttr' : 'preload'
		};

		/***
		 * 初始化
		 * @description 参数处理
		 */
		_public.init = function(res, config) {
			var _self = this;
			if(typeof config == 'function'){
				var tempFunc = config;
				config = {
					'onComplete' : tempFunc
				}
			}
			_self.config = Zepto.extend(true, {}, _static.config, config); // 参数接收
			var config = _self.config;
			res = [].concat(res);

			var resourceCache = {}

			//获取页面上配置了预加载的节点
			var resDom = Array.prototype.slice.call(document.querySelectorAll('[data-'+config.dataAttr+']'));
			Zepto(resDom).each(function(index, el){
				var _el = Zepto(el);
				var attr = _el.attr('data-'+config.dataAttr);
				if(resourceCache[attr]){
					resourceCache[attr].push(el);
				}else{
					resourceCache[attr] = [el];
					res.indexOf(attr) < 0 && res.push(attr)
				}
			})

			config.event && _self.on(config.event);
			var len = res.length, loaded = 0;
			var sTime = new Date().getTime();
			var replaceSrc = function(src){
				if(resourceCache[src]){ //是从节点上提取到的预加载数据
					Zepto.each(resourceCache[src], function(index, dom){
						dom.removeAttribute('data-'+config.dataAttr);
						var tagName = dom.tagName.toLowerCase();
						switch(tagName){
							case 'link': //css文件节点
								dom.href = src;
								break;
							case 'img':
							case 'script':
							case 'video':
								dom.src = src;
								break;
							default:
								dom.style.backgroundImage = 'url('+src+')';
						}
					})
				}
			}
			var load = function(src, node){
				config.onLoading(++loaded, len, src, node);
				/**
				 * @event mo.Loader#loading
				 * @property {object} event 单个资源加载完成
				 */
				_self.trigger('loading',[loaded, len, src, node]);
				replaceSrc(src);
				if(loaded == len){ //加载完成
					var times = new Date().getTime() - sTime;
					config.onComplete(times);
					/**
					 * @event mo.Loader#complete
					 * @property {object} event 所有资源加载完成
					 */
					_self.trigger('complete', [times]);
				}
			}
			Zepto.each(res, function(index, item){
				_private.getType(item);
				var type = _private.getType(item);
				var callFunc = _private[type+'Loader'];
				if(callFunc === undefined){ //不支持的类型默认认为是加载了
					load(item);
				}else{
					callFunc(item, load);
				}
			});
		}
	});
});
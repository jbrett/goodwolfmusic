// remap jQuery to $
(function($) {

    (function($) {
        $.fn.ttwPreload = function() {
            var imageList = [], callback, total, loaded = 0, images = [];

            if ($.isArray(arguments[0])) {
                imageList = arguments[0];
                callback = arguments[1];
            }
            else {
                this.each(function() {
                    imageList.push($(this).attr('src'));
                });

                callback = arguments[0];
            }

            if (typeof imageList != 'undefined') {
                if ($.isArray(imageList)) {
                    total = imageList.length; // used later
                    for (var i = 0; i < total; i++) {
                        images[imageList[i]] = new Image();
                        images[imageList[i]].onload = function() {
                            loaded++;
                            if (loaded == total) {
                                if ($.isFunction(callback)) {
                                    callback.call(this);
                                }
                            }
                        };
                        images[imageList[i]].src = imageList[i];
                    }
                }
            }
        }
    })(jQuery)

    //            self.layout.thumbList.init('#media-box-thumb-list');
//            //self.layout.list.init('#media-box-list');
//            self.layout.albumCover.init('#media-box-cover');
//            //self.layout.description.init('#media-box-description');
//            self.layout.backgroundImage.init('#main');
//            self.layout.thumbWall.init('#media-box-description');
})(jQuery);


//http://dl.dropbox.com/u/534786/jquery.text-overflow.js
//http://devongovett.wordpress.com/2009/04/06/text-overflow-ellipsis-for-firefox-via-jquery/
(function($) {
    $.fn.ellipsis = function(enableUpdating) {
        var s = document.documentElement.style;
        if (!('textOverflow' in s || 'OTextOverflow' in s)) {
            return this.each(function() {
                var el = $(this);
                if (el.css("overflow") == "hidden") {
                    var originalText = el.html();
                    var w = el.width();

                    var t = $(this.cloneNode(true)).hide().css({
                        'position': 'absolute',
                        'width': 'auto',
                        'overflow': 'visible',
                        'max-width': 'inherit'
                    });
                    el.after(t);

                    var text = originalText;
                    while (text.length > 0 && t.width() > el.width()) {
                        text = text.substr(0, text.length - 1);
                        t.html(text + "...");
                    }
                    el.html(t.html());

                    t.remove();

                    if (enableUpdating == true) {
                        var oldW = el.width();
                        setInterval(function() {
                            if (el.width() != oldW) {
                                oldW = el.width();
                                el.html(originalText);
                                el.ellipsis();
                            }
                        }, 200);
                    }
                }
            });
        } else return this;
    };
})(jQuery);


/*
 * Special event for image load events
 * Needed because some browsers does not trigger the event on cached images.

 * MIT License
 * Paul Irish     | @paul_irish | www.paulirish.com
 * Andree Hansson | @peolanha   | www.andreehansson.se
 * 2010.
 *
 * Usage:
 * $(images).bind('load', function (e) {
 *   // Do stuff on load
 * });
 *
 * Note that you can bind the 'error' event on data uri images, this will trigger when
 * data uri images isn't supported.
 *
 * Tested in:
 * FF 3+
 * IE 6-8
 * Chromium 5-6
 * Opera 9-10
 */
(function ($) {
    $.event.special.load = {
        add: function (hollaback) {
            if (this.nodeType === 1 && this.tagName.toLowerCase() === 'img' && this.src !== '') {
                // Image is already complete, fire the hollaback (fixes browser issues were cached
                // images isn't triggering the load event)
                if (this.complete || this.readyState === 4) {
                    hollaback.handler.apply(this);
                }

                // Check if data URI images is supported, fire 'error' event if not
                else if (this.readyState === 'uninitialized' && this.src.indexOf('data:') === 0) {
                    $(this).trigger('error');
                }

                else {
                    $(this).bind('load', hollaback.handler);
                }
            }
        }
    };
}(jQuery));


/*!
 * Tiny Scrollbar 1.43
 * http://www.baijs.nl/tinyscrollbar/
 *
 * Copyright 2010, Maarten Baijs
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/gpl-2.0.php
 *
 * Date: 02 / 24 / 2011
 * Depends on library: jQuery
 */
(function($) {
    $.fn.tinyscrollbar = function(options) {
        var defaults = {
            axis: 'y', // vertical or horizontal scrollbar? ( x || y ).
            wheel: 40,  //how many pixels must the mouswheel scroll at a time.
            scroll: true, //enable or disable the mousewheel scrollbar
            size: 'auto', //set the size of the scrollbar to auto or a fixed number.
            sizethumb: 'auto' //set the size of the thumb to auto or a fixed number.
        };
        var options = $.extend(defaults, options);
        var oWrapper = $(this);
        var oViewport = { obj: $('.viewport', this) };
        var oContent = { obj: $('.scroll-content', this) };
        var oScrollbar = { obj: $('.scrollbar', this) };
        var oTrack = { obj: $('.track', oScrollbar.obj) };
        var oThumb = { obj: $('.thumb', oScrollbar.obj) };
        var sAxis = options.axis == 'x', sDirection = sAxis ? 'left' : 'top', sSize = sAxis ? 'Width' : 'Height';
        var iScroll, iPosition = { start: 0, now: 0 }, iMouse = {};

        if (this.length > 1) {
            this.each(function() {
                $(this).tinyscrollbar(options)
            });
            return this;
        }
        this.initialize = function() {
            this.update();
            setEvents();
        };
        this.update = function() {
            iScroll = 0;
            oViewport.obj.height(oViewport.obj.parent().height()); // Added by SE 5/13/11 to fix viewport height issues in ie7
            oViewport[options.axis] = oViewport.obj[0]['offset' + sSize];
            oContent[options.axis] = oContent.obj[0]['scroll' + sSize];
            oContent.ratio = oViewport[options.axis] / oContent[options.axis];
            oScrollbar.obj.toggleClass('disable', oContent.ratio >= 1);
            oTrack[options.axis] = options.size == 'auto' ? oViewport[options.axis] : options.size;
            oThumb[options.axis] = Math.min(oTrack[options.axis], Math.max(0, ( options.sizethumb == 'auto' ? (oTrack[options.axis] * oContent.ratio) : options.sizethumb )));
            oScrollbar.ratio = options.sizethumb == 'auto' ? (oContent[options.axis] / oTrack[options.axis]) : (oContent[options.axis] - oViewport[options.axis]) / (oTrack[options.axis] - oThumb[options.axis]);
            setSize();
        };

       this.scrollTo = function(scroll){
            var oThumbDir = parseInt(oThumb.obj.css(sDirection));
            oThumbDir = isNaN(oThumbDir)?0:oThumbDir; //Added to fix scrollbar functionality in chrome, SE 4/10/11
            iPosition.start = oThumbDir == 'auto' ? 0 : oThumbDir;
            if (!(oContent.ratio >= 1)) {
               var scrollbarWidth = oTrack[options.axis];
                var thumbWidth = oThumb[options.axis];
                var one = (scrollbarWidth - thumbWidth);
                var mouseCurrent = (sAxis ? scroll.x : scroll.y);
                var two = Math.max(0, (iPosition.start + (mouseCurrent )));
                iPosition.now = Math.min(one, two);
                iScroll = iPosition.now * oScrollbar.ratio;
                oContent.obj.css(sDirection, -iScroll);
                oThumb.obj.css(sDirection, iPosition.now);
                ;
            }
            return false;
        };


        
        function setSize() {
            if (!sAxis)oContent.obj.removeAttr('style');
            oThumb.obj.removeAttr('style');
            iMouse['start'] = oThumb.obj.offset()[sDirection];
            var sCssSize = sSize.toLowerCase();
            oScrollbar.obj.css(sCssSize, oTrack[options.axis]);
            oTrack.obj.css(sCssSize, oTrack[options.axis]);
            oThumb.obj.css(sCssSize, oThumb[options.axis]);
        }

        ;
        function setEvents() {
            oThumb.obj.bind('mousedown', start);
            oTrack.obj.bind('mouseup', drag);
            if (options.scroll && this.addEventListener) {
                oWrapper[0].addEventListener('DOMMouseScroll', wheel, false);
                oWrapper[0].addEventListener('mousewheel', wheel, false);
            }
            else if (options.scroll) {
                oWrapper[0].onmousewheel = wheel;
            }
        }

        ;
        function start(oEvent) {
            iMouse.start = sAxis ? oEvent.pageX : oEvent.pageY;
            var oThumbDir = parseInt(oThumb.obj.css(sDirection));
            oThumbDir = isNaN(oThumbDir)?0:oThumbDir; //Added to fix scrollbar functionality in chrome, SE 4/10/11
            iPosition.start = oThumbDir == 'auto' ? 0 : oThumbDir;
            $(document).bind('mousemove', drag);
            $(document).bind('mouseup', end);
            oThumb.obj.bind('mouseup', end);
            return false;
        }

        ;
        function wheel(oEvent) {
            if (!(oContent.ratio >= 1)) {

                oEvent = $.event.fix(oEvent || window.event);
                var iDelta = oEvent.wheelDelta ? oEvent.wheelDelta / 120 : -oEvent.detail / 3;
                iScroll -= iDelta * options.wheel;
                iScroll = Math.min((oContent[options.axis] - oViewport[options.axis]), Math.max(0, iScroll));
                oThumb.obj.css(sDirection, iScroll / oScrollbar.ratio);
                oContent.obj.css(sDirection, -iScroll);
                oEvent.preventDefault();
            }
            ;
        }

        ;
        function end(oEvent) {
            $(document).unbind('mousemove', drag);
            $(document).unbind('mouseup', end);
            oThumb.obj.unbind('mouseup', end);
            return false;
        }

        ;
        function drag(oEvent) {
            if (!(oContent.ratio >= 1)) {
                iPosition.now = Math.min((oTrack[options.axis] - oThumb[options.axis]), Math.max(0, (iPosition.start + ((sAxis ? oEvent.pageX : oEvent.pageY) - iMouse.start))));
                iScroll = iPosition.now * oScrollbar.ratio;
                oContent.obj.css(sDirection, -iScroll);
                oThumb.obj.css(sDirection, iPosition.now);
                ;
            }
            return false;
        }

        ;
        return this.initialize();
    };
})(jQuery);




// usage: log('inside coolFunc',this,arguments);
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function() {
    log.history = log.history || [];   // store logs to an array for reference
    log.history.push(arguments);
    if (this.console) {
        console.log(Array.prototype.slice.call(arguments));
    }
};


// catch all document.write() calls
(function(doc) {
    var write = doc.write;
    doc.write = function(q) {
        log('document.write(): ', arguments);
        if (/docwriteregexwhitelist/.test(q)) write.apply(doc, arguments);
    };
})(document);



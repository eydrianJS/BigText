;(function(window, $)
{
    // Purposeful Global
    var BigText = {
        STARTING_PX_FONT_SIZE: 11,
        DEFAULT_MAX_FONT_SIZE_PX: 528,
        GLOBAL_STYLE_ID: 'bigtext-style',
        STYLE_ID: 'bigtext-id',
        LINE_CLASS_PREFIX: 'bigtext-line',
        LINE_FOCUS_CLASS: 'bigtext-focus',
        EXEMPT_CLASS: 'bigtext-exempt',
        DEFAULT_CHILD_SELECTOR: '> div',
        childSelectors: {
            div: '> div',
            ol: '> li',
            ul: '> li'
        },
        DATA_KEY: 'bigtextOptions',
        counter: 0,
        init: function($head)
        {
            if(!$('#'+BigText.GLOBAL_STYLE_ID).length) {
                $head.append(BigText.generateStyleTag(BigText.GLOBAL_STYLE_ID, ['.bigtext, .bigtext .' + BigText.EXEMPT_CLASS + ' { font-size: ' + BigText.STARTING_PX_FONT_SIZE + 'px; }']));
            }
        },
        getStyleId: function(elementId)
        {
            return BigText.STYLE_ID + '-' + elementId;
        },
        generateStyleTag: function(id, css)
        {
            return $('<style>' + css.join('\n') + '</style>').attr('id', id);
        },
        generateFontSizeCss: function(elementId, linesFontSizes, lineWordSpacings)
        {
            var css = [],
                styleId = BigText.getStyleId(elementId);

            for(var j=0, k=linesFontSizes.length; j<k; j++) {
                css.push('#' + elementId + ' .' + BigText.LINE_CLASS_PREFIX + j + ' {' + 
                    (linesFontSizes[j] ? ' font-size: ' + linesFontSizes[j] + 'px;' : '') + 
                    (lineWordSpacings[j] ? ' word-spacing: ' + lineWordSpacings[j] + 'px;' : '') +
                    '}');
            }

            $('#' + styleId).remove();
            return BigText.generateStyleTag(styleId, css);
        },
        testLineDimensions: function($line, maxwidth, property, size, interval, units)
        {
            var width;
            $line.css(property, size + units);

            width = $line.width();
    
            if(width >= maxwidth) {
                $line.css(property, '');

                if(width == maxwidth) {
                    return {
                        match: 'exact',
                        size: parseFloat((parseFloat(size) - .1).toFixed(2))
                    };
                }

                return {
                    match: 'estimate',
                    size: parseFloat((parseFloat(size) - interval).toFixed(2))
                };
            }
    
            return false;
        }
    };

    $.fn.bigtext = function(options)
    {
        var $headCache = $('head');
        BigText.init($headCache);
    
        options = $.extend({
                    maxfontsize: BigText.DEFAULT_MAX_FONT_SIZE_PX,
                    childSelector: '',
                    resize: true
                }, options || {});
    
        return this.each(function()
        {
            var $t = $(this).addClass('bigtext'),
                id = $t.attr('id'),
                childSelector = options.childSelector ||
                            BigText.childSelectors[this.tagName.toLowerCase()] ||
                            BigText.DEFAULT_CHILD_SELECTOR,
                maxwidth = $t.width(),
                $c = $t.clone(true)
                            .addClass('bigtext-cloned')
                            .css({
                                'min-width': parseInt(maxwidth, 10),
                                width: 'auto',
                                position: 'absolute',
                                left: -9999,
                                top: -9999
                            }).appendTo(document.body),
                eventNamespace,
                eventName;

            if(!id) {
                id = 'bigtext-id' + (BigText.counter++);
                eventNamespace = id;
                $t.attr('id', id);
            } else {
                eventNamespace = 'bigtext-' + id;
            }

            if(options.resize) {
                function resizeFunction()
                {
                    $('#'+id).bigtext(options);
                }

                eventName = 'resize.' + eventNamespace;

                if($.throttle) {
                    // https://github.com/cowboy/jquery-throttle-debounce
                    $(window).unbind(eventName).bind(eventName, $.throttle(100, resizeFunction));
                } else {
                    if($.fn.smartresize) {
                        // https://github.com/lrbabe/jquery-smartresize/
                        eventName = 'smartresize.' + eventNamespace;
                    }
                    $(window).unbind(eventName).bind(eventName, resizeFunction);
                }
            }

            var styleId = BigText.getStyleId(id);
            $('#' + styleId).remove();

            // font-size isn't the only thing we can modify, we can also mess with:
            // word-spacing and letter-spacing.
            // Note: webkit does not respect subpixel letter-spacing or word-spacing,
            // nor does it respect hundredths of a font-size em.
            var fontSizes = [],
                wordSpacings = [];

            $c.find(childSelector).css({
                float: 'left',
                clear: 'left'
            }).each(function(lineNumber) {
                var $line = $(this),
                    intervals = [128,64,16,4,1,.4,.1],
                    fontMatch = BigText.STARTING_PX_FONT_SIZE,
                    lineMax;

                if($line.hasClass(BigText.EXEMPT_CLASS)) {
                    fontSizes.push(null);
                    return;
                }

                outer: for(var m=0, n=intervals.length; m<n; m++) {
                    inner: for(var j=1, k=10; j<=k; j++) {
                        if(fontMatch + j*intervals[m] > options.maxfontsize) {
                            fontMatch = options.maxfontsize;
                            break outer;
                        }

                        lineMax = BigText.testLineDimensions($line, maxwidth, 'font-size', fontMatch + j*intervals[m], intervals[m], 'px');

                        if(lineMax !== false) {
                            fontMatch = lineMax.size;

                            if(lineMax.match == 'exact') {
                                break outer;
                            }
                            break inner;
                        }
                    }
                }

                if(fontMatch > options.maxfontsize) {
                    fontSizes.push(options.maxfontsize);
                } else {
                    fontSizes.push(fontMatch);
                }
            }).each(function(lineNumber) {
                var $line = $(this),
                    wordSpacing = 0,
                    interval = 1,
                    maxWordSpacing;

                if($line.hasClass(BigText.EXEMPT_CLASS)) {
                    wordSpacings.push(null);
                    return;
                }

                // must re-use font-size, even though it was removed above.
                $line.css('font-size', fontSizes[lineNumber] + 'px');

                for(var m=1, n=5; m<n; m+=interval) {
                    maxWordSpacing = BigText.testLineDimensions($line, maxwidth, 'word-spacing', m, interval, 'px');
                    if(maxWordSpacing !== false) {
                        wordSpacing = maxWordSpacing.size;
                        break;
                    }
                }

                $line.css('font-size', '');
                wordSpacings.push(wordSpacing);
            }).removeAttr('style');

            $headCache.append(BigText.generateFontSizeCss(id, fontSizes, wordSpacings));
    
            $c.remove();
    
            $t.find(childSelector).each(function(lineNumber)
            {
                $(this).each(function()
                    {
                        // remove existing line classes.
                        this.className = this.className.replace(new RegExp('\\s*' + BigText.LINE_CLASS_PREFIX + '\\d+'), '');
                    })
                    .addClass(BigText.LINE_CLASS_PREFIX + lineNumber)
                    [maxwidth / fontSizes[lineNumber] < 80 ? 'addClass' : 'removeClass'](BigText.LINE_FOCUS_CLASS);
            });
        });
    };

    window.BigText = BigText;
})(this, jQuery);

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var status = Symbol('status');
var LOADED = 'LOADED';
var UNLOADED = 'UNLOADED';

var initEvent = function (key) { return ("union__custom_init_event_for_" + key); };
var loadEvent = function (key) { return ("union__custom_load_event_for_" + key); };
var unloadEvent = function (key) { return ("union__custom_unload_event_for_" + key); };
var destroyEvent = function (key) { return ("union__custom_destroy_event_for_" + key); };

function init(key) {
    document.dispatchEvent(new CustomEvent(initEvent(key)));
}

function load(key, context) {
    document.dispatchEvent(new CustomEvent(loadEvent(key), { detail: { context: context } }));
}

function unload(key, context) {
    document.dispatchEvent(new CustomEvent(unloadEvent(key), { detail: { context: context } }));
}

function destroy(key) {
    document.dispatchEvent(new CustomEvent(destroyEvent(key)));
}

function register(key, ref) {
    var onInit = ref.onInit; if ( onInit === void 0 ) onInit = (function () {});
    var onLoad = ref.onLoad; if ( onLoad === void 0 ) onLoad = (function () {});
    var onUnload = ref.onUnload; if ( onUnload === void 0 ) onUnload = (function () {});
    var onDestroy = ref.onDestroy; if ( onDestroy === void 0 ) onDestroy = (function () {});

    function initWrapper() {
        onInit();
        onLoad(document);
    }

    function loadWrapper(e) {
        onLoad(e.detail.context || document);
    }

    function unloadWrapper(e) {
        onUnload(e.detail.context || document);
    }

    function destroyWrapper() {
        onUnload(document);
        onDestroy();
    }

    document.addEventListener(initEvent(key), initWrapper);
    document.addEventListener(loadEvent(key), loadWrapper);
    document.addEventListener(loadEvent('ajaxPartial'), loadWrapper);
    document.addEventListener(unloadEvent(key), unloadWrapper);
    document.addEventListener(destroyEvent(key), destroyWrapper);

    initWrapper();
}

function srcMap(sources, prop) {
    if ( prop === void 0 ) prop = 'src';

    return sources.reduce(function (hashMap, script) {
        hashMap[script[prop]] = script;
        return hashMap;
    }, {});
}

function animationHelperClasses(node, className, duration, options) {
    if ( options === void 0 ) options = {};

    node.classList.add(className);

    requestAnimationFrame(function () {
        // force a repaint
        node.scrollTop;
        node.classList.add((className + "-active"));
    });

    setTimeout(function () {
        if (options.removeNodeOnComplete && node.parentNode) {
            node.parentNode.removeChild(node);
        } else {
            node.classList.remove('is-enter');
            node.classList.remove('is-enter-active');
        }
        if (typeof options.onComplete === 'function') {
            options.onComplete();
        }
    }, duration);
}

function delegate(selector, callback) {
    return function (e) {
        var evt = {};

        var loop = function ( prop ) {
            if (typeof e[prop] === 'function') {
                evt[prop] = function () {
                    var args = [], len = arguments.length;
                    while ( len-- ) args[ len ] = arguments[ len ];

                    e[prop].apply(e, args);
                };
            } else {
                evt[prop] = e[prop];
            }
        };

        for (var prop in e) loop( prop );

        var target = e.target;

        while (target && target !== e.currentTarget) {
            if (target.matches(selector)) {
                evt.currentTarget = target;
                callback.call(target, evt);
            }
            target = target.parentNode;
        }
    };
}

function getInstance(Controller) {
    var key = Symbol(Controller.name || 'instance');
    return function (node) {
        var args = [], len = arguments.length - 1;
        while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

        if (!(node[key] instanceof Controller)) {
            node[key] = new (Function.prototype.bind.apply( Controller, [ null ].concat( [node], args) ));
        }
        return node[key];
    };
}

function parseFormData(form) {
    return Array.from(form.querySelectorAll('[name]'))
        .filter(function (input) {
            if (input.tagName.toLowerCase() !== 'input') {
                return true;
            }

            if (input.type !== 'checkbox' && input.type !== 'radio') {
                return true;
            }

            return input.checked;
        })
        .map(function (input) {
            var value;

            switch (input.tagName.toLowerCase()) {
                case 'select':
                    value = Array.from(input.options)
                        .filter(function (opt) { return opt.selected; })
                        .map(function (opt) { return opt.value; })
                        .join(',');
                    break;
                default:
                    value = input.value;
                    break;
            }

            return ((input.name) + "=" + value);
        })
        .join('&');
}

var scriptPromises = {
    all: [],
    keys: {},

    get: function get(key) {
        return this.all[this.keys[key]];
    },

    set: function set(key, promise) {
        this.keys[key] = this.all.push(promise) - 1;
    },
};

function scriptCanRegister(script) {
    return script.src.indexOf(window.location.origin) === 0 && script.getAttribute('data-script-key');
}

function removeOld(oldScripts, newScripts) {
    var newScriptSources = srcMap(newScripts);
    var keysTriggered = {};

    oldScripts.forEach(function (script) {
        // it should stay loaded
        if (newScriptSources[script.src]) { return; }

        // it wasn't on the last page, so it has already been unloaded
        if (script[status] === UNLOADED) { return; }

        // it doesn't have an unload method
        if (!scriptCanRegister(script)) { return; }

        var key = script.getAttribute('data-script-key');

        script[status] = UNLOADED;

        // the key has already been triggered by another script
        if (keysTriggered[key]) { return; }
        keysTriggered[key] = true;
        destroy(key);
    });
}

function addNew(oldScripts, newScripts, body, newContext, oldContext) {
    var oldScriptMap = srcMap(oldScripts);
    var scriptsOnPage = oldScripts.slice();
    var keysTriggered = {};

    newScripts.forEach(function (script) {
        var key = script.getAttribute('data-script-key');
        var oldScript = oldScriptMap[script.src];

        function nullEvents() {
            this.onload = this.onreadystatechange = this.onerror = null;
        }

        if (!oldScript) {
            if ('noModule' in script && script.noModule) { return; }
            if (!('noModule' in script) && script.type === 'module') { return; }

            var patchScript = document.createElement('script');
            patchScript.src = script.src;
            patchScript.type = script.type;
            patchScript.noModule = script.noModule;
            patchScript.crossOrigin = script.crossOrigin;
            patchScript.setAttribute('data-script-key', key);

            scriptPromises.set(key, new Promise(function (resolve, reject) {
                patchScript.onload = patchScript.onreadystatechange = resolve;
                patchScript.onerror = reject;
            }).then(nullEvents.bind(patchScript)).catch(nullEvents.bind(patchScript)));

            var deps = script.getAttribute('data-script-dependencies');

            if (deps) {
                patchScript.setAttribute('data-script-dependencies', deps);

                Promise
                    .all(JSON.parse(deps).map(function (depKey) { return scriptPromises.get(depKey); }))
                    .then(function () {
                        body.appendChild(patchScript);
                    });
            } else {
                body.appendChild(patchScript);
            }

            patchScript[status] = LOADED;
            scriptsOnPage.push(patchScript);
        } else {
            if (!scriptPromises.get(key)) {
                scriptPromises.set(key, true);
            }

            if (scriptCanRegister(script) && !keysTriggered[key]) {
                keysTriggered[key] = true;

                if (oldScript[status] === LOADED) {
                    unload(key, oldContext);
                    load(key, newContext);
                } else {
                    init(key);
                }
            }

            oldScript[status] = LOADED;
        }
    });

    newContext.querySelectorAll('script').forEach(function (refNode) {
        if (refNode.type.indexOf('text') > -1) { return; }

        var patchScript = document.createElement('script');

        Array.from(refNode.attributes).forEach(function (attr) {
            patchScript[attr.name] = attr.value;
        });

        patchScript.innerHTML = refNode.innerHTML;
        refNode.parentNode.replaceChild(patchScript, refNode);
    });

    var scriptsLoaded = [];

    Object.keys(scriptPromises).forEach(function (promise) {
        scriptsLoaded.push(promise);
    });

    return { scriptsOnPage: scriptsOnPage, scriptPromises: scriptPromises.all };
}

function applyScripts(oldScripts, newScripts, body, newContext, oldContext) {
    removeOld(oldScripts, newScripts);
    return addNew(oldScripts, newScripts, body, newContext, oldContext);
}

function removeOld$1(oldStyles, newStyles) {
    var newStylesMap = srcMap(newStyles, 'href');

    oldStyles.forEach(function (style) {
        if (newStylesMap[style.href] || !style.parentNode) { return; }

        style.parentNode.removeChild(style);
    });
}

function addNew$1(oldStyles, newStyles, body) {
    var oldScriptMap = srcMap(oldStyles, 'href');
    var firstStyle = body.querySelector('link[ref="stylesheet"],link[href$=".css"]');
    var stylesOnPage = [];

    if (!firstStyle) { return stylesOnPage; }

    newStyles.reduce(function (lastStyle, style) {
        if (oldScriptMap[style.href]) {
            stylesOnPage.push(oldScriptMap[style.href]);
            return oldScriptMap[style.href];
        }

        if (lastStyle.nextElementSibling) {
            lastStyle.parentNode.insertBefore(style, lastStyle.nextElementSibling);
        } else {
            lastStyle.parentNode.appendChild(style);
        }

        stylesOnPage.push(style);
        return style;
    }, firstStyle);

    return stylesOnPage;
}

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", {
  value: true
});
// adapted from https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
var detectPassiveEvents = {
  update: function update() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      var passive = false;
      var options = Object.defineProperty({}, 'passive', {
        get: function get() {
          passive = true;
        }
      });
      // note: have to set and remove a no-op listener instead of null
      // (which was used previously), becasue Edge v15 throws an error
      // when providing a null callback.
      // https://github.com/rafrex/detect-passive-events/pull/3
      var noop = function noop() {};
      window.addEventListener('testPassiveEventSupport', noop, options);
      window.removeEventListener('testPassiveEventSupport', noop, options);
      detectPassiveEvents.hasSupport = passive;
    }
  }
};

detectPassiveEvents.update();
exports.default = detectPassiveEvents;
});

var passiveEvents = unwrapExports(lib);

function passive() {
    return passiveEvents.hasSupport ? { passive: true } : false;
}

var containers = [];
var shouldRecalculate = true;
var recalcTimer;

function onWindowResize() {
    containers.forEach(function (container) { return container.onResize(); });
}

function onWindowScroll() {
    containers = containers.filter(function (container) { return container.onScroll(); });

    if (!containers.length) {
        return;
    }

    if (shouldRecalculate) {
        recalculateBounds();
        shouldRecalculate = false;
    }

    clearTimeout(recalcTimer);
    recalcTimer = setTimeout(function () { shouldRecalculate = true; }, 100);
}

function recalculateBounds() {
    containers.forEach(function (container) { return container.recalculateBounds(); });
}

var InViewContainer = function InViewContainer(node, options) {
    this.node = node;
    this.node.classList.add('is-enter');
    this.options = options;
    this.onResize();
};

InViewContainer.prototype.onResize = function onResize () {
    this.recalculateBounds();
    this.onScroll();
};

InViewContainer.prototype.onScroll = function onScroll () {
    var shouldDetatch = (
        this.clientTop < (window.innerHeight * 0.75) + window.pageYOffset
        ||
        this.clientBottom <= window.innerHeight + window.pageYOffset + 50
    );

    if (shouldDetatch) {
        animationHelperClasses(this.node, 'is-enter', this.options.transitionDuration);
    }

    return !shouldDetatch;
};

InViewContainer.prototype.recalculateBounds = function recalculateBounds () {
    this.clientTop = this.node.getBoundingClientRect().top + window.pageYOffset;
    this.clientBottom = this.clientTop + this.node.clientHeight;
};

InViewContainer.getInstance = getInstance(InViewContainer);

function inView (newContainers, options) {
    containers = Array.from(newContainers).map(function (container) { return InViewContainer.getInstance(container, options); }
    );

    onWindowScroll();
}

function onInit() {
    window.addEventListener('resize', onWindowResize, passive());
    window.addEventListener('scroll', onWindowScroll, passive());
    window.addEventListener('load', recalculateBounds, passive());
}

function onDestroy() {
    window.removeEventListener('resize', onWindowResize, passive());
    window.removeEventListener('scroll', onWindowScroll, passive());
    window.removeEventListener('load', recalculateBounds, passive());
}

var COMPLETE = 'complete';
var CANCELED = 'canceled';

function raf(task){
    if('requestAnimationFrame' in window){
        return window.requestAnimationFrame(task);
    }

    setTimeout(task, 16);
}

function setElementScroll(element, x, y){
    if(element.self === element){
        element.scrollTo(x, y);
    }else{
        element.scrollLeft = x;
        element.scrollTop = y;
    }
}

function getTargetScrollLocation(target, parent, align){
    var targetPosition = target.getBoundingClientRect(),
        parentPosition,
        x,
        y,
        differenceX,
        differenceY,
        targetWidth,
        targetHeight,
        leftAlign = align && align.left != null ? align.left : 0.5,
        topAlign = align && align.top != null ? align.top : 0.5,
        leftOffset = align && align.leftOffset != null ? align.leftOffset : 0,
        topOffset = align && align.topOffset != null ? align.topOffset : 0,
        leftScalar = leftAlign,
        topScalar = topAlign;

    if(parent.self === parent){
        targetWidth = Math.min(targetPosition.width, parent.innerWidth);
        targetHeight = Math.min(targetPosition.height, parent.innerHeight);
        x = targetPosition.left + parent.pageXOffset - parent.innerWidth * leftScalar + targetWidth * leftScalar;
        y = targetPosition.top + parent.pageYOffset - parent.innerHeight * topScalar + targetHeight * topScalar;
        x -= leftOffset;
        y -= topOffset;
        differenceX = x - parent.pageXOffset;
        differenceY = y - parent.pageYOffset;
    }else{
        targetWidth = targetPosition.width;
        targetHeight = targetPosition.height;
        parentPosition = parent.getBoundingClientRect();
        var offsetLeft = targetPosition.left - (parentPosition.left - parent.scrollLeft);
        var offsetTop = targetPosition.top - (parentPosition.top - parent.scrollTop);
        x = offsetLeft + (targetWidth * leftScalar) - parent.clientWidth * leftScalar;
        y = offsetTop + (targetHeight * topScalar) - parent.clientHeight * topScalar;
        x = Math.max(Math.min(x, parent.scrollWidth - parent.clientWidth), 0);
        y = Math.max(Math.min(y, parent.scrollHeight - parent.clientHeight), 0);
        x -= leftOffset;
        y -= topOffset;
        differenceX = x - parent.scrollLeft;
        differenceY = y - parent.scrollTop;
    }

    return {
        x: x,
        y: y,
        differenceX: differenceX,
        differenceY: differenceY
    };
}

function animate(parent){
    raf(function(){
        var scrollSettings = parent._scrollSettings;
        if(!scrollSettings){
            return;
        }

        var location = getTargetScrollLocation(scrollSettings.target, parent, scrollSettings.align),
            time = Date.now() - scrollSettings.startTime,
            timeValue = Math.min(1 / scrollSettings.time * time, 1);

        if(
            time > scrollSettings.time + 20
        ){
            setElementScroll(parent, location.x, location.y);
            parent._scrollSettings = null;
            return scrollSettings.end(COMPLETE);
        }

        var easeValue = 1 - scrollSettings.ease(timeValue);

        setElementScroll(parent,
            location.x - location.differenceX * easeValue,
            location.y - location.differenceY * easeValue
        );

        animate(parent);
    });
}
function transitionScrollTo(target, parent, settings, callback){
    var idle = !parent._scrollSettings,
        lastSettings = parent._scrollSettings,
        now = Date.now(),
        endHandler;

    if(lastSettings){
        lastSettings.end(CANCELED);
    }

    function end(endType){
        parent._scrollSettings = null;
        if(parent.parentElement && parent.parentElement._scrollSettings){
            parent.parentElement._scrollSettings.end(endType);
        }
        callback(endType);
        parent.removeEventListener('touchstart', endHandler);
    }

    parent._scrollSettings = {
        startTime: lastSettings ? lastSettings.startTime : Date.now(),
        target: target,
        time: settings.time + (lastSettings ? now - lastSettings.startTime : 0),
        ease: settings.ease,
        align: settings.align,
        end: end
    };

    endHandler = end.bind(null, CANCELED);
    parent.addEventListener('touchstart', endHandler);

    if(idle){
        animate(parent);
    }
}

function defaultIsScrollable(element){
    return (
        'pageXOffset' in element ||
        (
            element.scrollHeight !== element.clientHeight ||
            element.scrollWidth !== element.clientWidth
        ) &&
        getComputedStyle(element).overflow !== 'hidden'
    );
}

function defaultValidTarget(){
    return true;
}

var scrollIntoView = function(target, settings, callback){
    if(!target){
        return;
    }

    if(typeof settings === 'function'){
        callback = settings;
        settings = null;
    }

    if(!settings){
        settings = {};
    }

    settings.time = isNaN(settings.time) ? 1000 : settings.time;
    settings.ease = settings.ease || function(v){return 1 - Math.pow(1 - v, v / 2);};

    var parent = target.parentElement,
        parents = 0;

    function done(endType){
        parents--;
        if(!parents){
            callback && callback(endType);
        }
    }

    var validTarget = settings.validTarget || defaultValidTarget;
    var isScrollable = settings.isScrollable;

    while(parent){
        if(validTarget(parent, parents) && (isScrollable ? isScrollable(parent, defaultIsScrollable) : defaultIsScrollable(parent))){
            parents++;
            transitionScrollTo(target, parent, settings, done);
        }

        parent = parent.parentElement;

        if(!parent){
            return;
        }

        if(parent.tagName === 'BODY'){
            parent = parent.ownerDocument;
            parent = parent.defaultView || parent.ownerWindow;
        }
    }
};

var contentPlaceholder = document.createElement('span');
contentPlaceholder.style.display = 'none';
var currentPage = window.location.href;

var config = {
    newPageOffset: 48,
    transitionDuration: 1200,
    mainContentSelector: '.Page-content > main',
    headerSelector: 'header.Header',
};

function getOffset() {
    switch (typeof config.newPageOffset) {
        case 'function':
            return config.newPageOffset() || 0;
        case 'object':
            return config.newPageOffset.clientHeight || 0;
        case 'number':
            return config.newPageOffset;
        case 'string':
            return Number(config.newPageOffset) || 0;
        default:
            return 0;
    }
}

function setOption(key, value) {
    if (typeof key === 'object') {
        Object.assign(config, key);
    } else {
        config[key] = value;
    }
}

function getScripts(context) {
    return Array.from(context.getElementsByTagName('script')).filter(function (script) { return script.src; });
}

function getStyles(context) {
    return Array.from(context.querySelectorAll('link[rel="stylesheet"],link[href$=".css"]'));
}

var oldScripts = getScripts(document);
oldScripts.forEach(function (script) { return script[status] = LOADED; });
var oldStyles = getStyles(document.head);

function getBodyClass(body) {
    var startIndex = body.indexOf('<body');
    var endIndex = body.indexOf('>', startIndex);
    var classMatches = body.substring(startIndex, endIndex).match(/class="([^"]+)"/);
    if (classMatches) {
        return classMatches[1];
    }
    return '';
}

function goToPage(href, errorPage) {
    if ( href === void 0 ) href = window.location.href;
    if ( errorPage === void 0 ) errorPage = false;

    currentPage = href;

    var oldContent = document.querySelectorAll(((config.mainContentSelector) + ":not(.is-exit)"));
    var footer = document.querySelector('.Footer');
    if (footer) {
        var ref = footer.getBoundingClientRect();
        var height = ref.height;
        var top = ref.top;
        footer.style.top = top + "px";
        oldContent.forEach(function (previousPage) { return previousPage.style.paddingBottom = (height + 1) + "px"; }
        );
    }

    document.documentElement.classList.add('is-pageTransition');
    window.dispatchEvent(new CustomEvent('pageTransitionInitiated'));

    var pageResponseListener = document.createElement('div');
    var newPageResponse = new Promise(function (resolve) {
        function onPageResponse(e) {
            resolve(e.detail);
            pageResponseListener.removeEventListener('newPageResponse', onPageResponse);
        }
        pageResponseListener.addEventListener('newPageResponse', onPageResponse);
    });

    var pageYOffset = window.pageYOffset;
    var scrollToY = Math.min(pageYOffset, getOffset());

    var pageContainer = contentPlaceholder.parentNode;
    pageContainer.style.minHeight = (pageContainer.clientHeight) + "px";
    oldContent.forEach(function (previousPage) { return previousPage.style.transform = "translateY(" + (scrollToY - pageYOffset) + "px)"; }
    );
    window.dispatchEvent(new CustomEvent('suspendUserScrolling'));
    window.scrollTo(0, scrollToY);
    requestAnimationFrame(function () {
        window.dispatchEvent(new CustomEvent('resumeUserScrolling'));
    });

    oldContent.forEach(function (previousPage) { return animationHelperClasses(previousPage, 'is-exit', config.transitionDuration, {
            removeNodeOnComplete: true,
            onComplete: function onComplete() {
                newPageResponse.then(function (ref) {
                    var styles = ref.styles;

                    removeOld$1(oldStyles, styles);
                    oldStyles = styles;
                });
            },
        }); }
    );

    fetch(href, {
        credentials: 'same-origin',
    })
        .then(function (res) {
            if (res.status >= 400) {
                throw res;
            }
            return res;
        })
        .then(function (res) { return res.text(); })
        .then(function (newPageContent) {
            if (currentPage !== href) { return; }

            if (window.gtag) {
                gtag('config', window.googleAnalyticsId, { 'page_path': window.location.pathname });
                // gtag('event', 'page_view', { 'send_to': window.googleAnalyticsId });
            }

            var newDoc = document.createElement('div');
            newDoc.innerHTML = newPageContent;
            document.body.className = getBodyClass(newPageContent);
            document.title = newDoc.querySelector('title').innerText;
            var newContent = newDoc.querySelector(config.mainContentSelector);

            pageResponseListener.dispatchEvent(new CustomEvent('newPageResponse', {
                detail: {
                    styles: addNew$1(oldStyles, getStyles(newDoc), document.head),
                }
            }));

            newContent.classList.add('is-enter');
            pageContainer.insertBefore(newContent, pageContainer.children[0] || null);

            var scriptResponse = applyScripts(oldScripts, getScripts(newDoc), document.body, newContent, oldContent[0]);
            oldScripts = scriptResponse.scriptsOnPage;
            inView(newContent.children, config);

            return Promise
                .all(scriptResponse.scriptPromises)
                .then(function () { return newContent; });
        })
        .then(function (newContent) {
            var hash = window.location.hash;

            if (hash) {
                var target = document.querySelector(hash) || document.querySelector(("[name=" + (hash.slice(1)) + "]"));
                if (target) {
                    scrollIntoView(target, {
                        align: {
                            top: 0,
                            topOffset: document.querySelector(config.headerSelector).clientHeight
                        },
                        time: 1000,
                    });
                }
            }

            animationHelperClasses(newContent, 'is-enter', config.transitionDuration, {
                onComplete: function onComplete() {
                    if (currentPage !== href) { return; }
                    pageContainer.style.minHeight = '';
                    document.documentElement.classList.remove('is-pageTransition');
                }
            });
        })
        .catch(function (res) {
            if (currentPage !== href) { return; }
            document.documentElement.classList.remove('is-pageTransition');

            console.log(res);
            if (!errorPage) {
                goToPage(("/" + (res.status || 500)), true);
            } else if (oldContent.length) {
                oldContent.forEach(function (previousPage, notFirst) {
                    if (notFirst && previousPage.parentNode) {
                        previousPage.parentNode.removeChild(previousPage);
                    } else {
                        previousPage.className = 'Page Page--error';
                        previousPage.innerHTML = 'There was an error. Please try again later.';
                    }
                });
            } else {
                var mockPage = document.createElement('main');
                mockPage.className = 'Page Page--error';
                mockPage.innerHTML = 'There was an error. Please try again later.';
                contentPlaceholder.parentNode.insertBefore(mockPage, contentPlaceholder);
            }
        });
}

var onAnchorClick = delegate('a', function (e) {
    // user is opening in new tab or javascript is already doing something with this event
    if (e.defaultPrevented || e.metaKey || e.ctrlKey) { return; }

    var anchorNode = e.currentTarget;

    // handle svg's
    if (typeof anchorNode.href !== 'string') {
        anchorNode = {
            target: anchorNode.target.baseVal,
            href: anchorNode.href.baseVal,
        };
    }

    if (!['', '_self'].includes(anchorNode.target)) { return; }
    if (anchorNode.href.indexOf(window.location.origin) !== 0) { return; }

    var linkParts = anchorNode.href.split('#');
    // check if path is the same as current url, if so, we're jump on current page
    if (linkParts.length > 1 && linkParts[0] === window.location.href.split('#')[0]) { return; }

    e.preventDefault();

    window.history.pushState(null, '', anchorNode.href);
    goToPage(anchorNode.href);
});

var onFormSubmit = delegate('form[data-ajax-loader]', function (e) {
    // user is opening in new tab or javascript is already doing something with this event
    if (e.defaultPrevented || e.metaKey || e.ctrlKey) { return; }

    var formNode = e.currentTarget;
    var action = formNode.action || window.location.pathname;

    if (!['', '_self'].includes(formNode.target)) { return; }
    if (action.indexOf(window.location.origin) !== 0) { return; }

    e.preventDefault();

    var href = action + "?" + (parseFormData(formNode));

    window.history.pushState(null, '', href);
    goToPage(href);
});

function onWindowPopState() {
    if (currentPage.split('#')[0] === window.location.href.split('#')[0]) { return; }
    goToPage();
}

function ajaxLoader(options) {
    if (typeof options === 'object') {
        setOption(options);
    }

    var currentContent = document.querySelector(config.mainContentSelector);
    currentContent.parentNode.insertBefore(contentPlaceholder, currentContent);

    document.addEventListener('click', onAnchorClick);
    document.addEventListener('submit', onFormSubmit);
    window.addEventListener('popstate', onWindowPopState);

    onInit();
    inView(document.querySelector(config.mainContentSelector).children, config);

    return {
        destroy: function destroy$$1() {
            document.removeEventListener('click', onAnchorClick);
            document.removeEventListener('submit', onFormSubmit);
            window.removeEventListener('popstate', onWindowPopState);
            onDestroy();
        }
    }
}

function loadActiveScripts(context) {
    oldScripts.forEach(function (script) {
        if (script[status] === LOADED) {
            load(script.dataset.scriptKey, context);
        }
    });
}

exports.setOption = setOption;
exports.ajaxLoader = ajaxLoader;
exports.loadActiveScripts = loadActiveScripts;
exports.default = register;

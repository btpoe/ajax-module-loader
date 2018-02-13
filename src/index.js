import { status, LOADED } from './constants';
import applyScripts from './scripts';
import { addNew as addNewStyles, removeOld as removeOldStyles } from './styles';
import { animationHelperClasses, parseFormData } from './utils';
import inView, { onInit as onInViewInit, onDestroy as onInViewDestroy } from './inView';
import { load } from './registerScript';
export { default } from './registerScript';
import { delegate } from './utils';
import scroller from 'scroll-into-view';

const contentPlaceholder = document.createElement('span');
contentPlaceholder.style.display = 'none';
let currentPage = window.location.href;

const config = {
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

export function setOption(key, value) {
    if (typeof key === 'object') {
        Object.assign(config, key);
    } else {
        config[key] = value;
    }
}

function getScripts(context) {
    return Array.from(context.getElementsByTagName('script')).filter(script => script.src);
}

function getStyles(context) {
    return Array.from(context.querySelectorAll('link[rel="stylesheet"],link[href$=".css"]'));
}

let oldScripts = getScripts(document);
oldScripts.forEach(script => script[status] = LOADED);
let oldStyles = getStyles(document.head);

function getBodyClass(body) {
    const startIndex = body.indexOf('<body');
    const endIndex = body.indexOf('>', startIndex);
    const classMatches = body.substring(startIndex, endIndex).match(/class="([^"]+)"/);
    if (classMatches) {
        return classMatches[1];
    }
    return '';
}

function goToPage(href = window.location.href, errorPage = false) {
    currentPage = href;

    const oldContent = document.querySelectorAll(`${config.mainContentSelector}:not(.is-exit)`);
    const footer = document.querySelector('.Footer');
    if (footer) {
        const { height, top } = footer.getBoundingClientRect();
        footer.style.top = `${top}px`;
        oldContent[0].style.paddingBottom = `${height + 1}px`;
    }

    document.documentElement.classList.add('is-pageTransition');
    window.dispatchEvent(new CustomEvent('pageTransitionInitiated'));

    const pageResponseListener = document.createElement('div');
    const newPageResponse = new Promise((resolve) => {
        function onPageResponse(e) {
            resolve(e.detail);
            pageResponseListener.removeEventListener('newPageResponse', onPageResponse);
        }
        pageResponseListener.addEventListener('newPageResponse', onPageResponse);
    });

    const pageYOffset = window.pageYOffset;
    const scrollToY = Math.min(pageYOffset, getOffset());

    const pageContainer = contentPlaceholder.parentNode;
    pageContainer.style.minHeight = `${pageContainer.clientHeight}px`;
    oldContent.forEach(previousPage =>
        previousPage.style.transform = `translateY(${scrollToY - pageYOffset}px)`
    );
    window.dispatchEvent(new CustomEvent('suspendUserScrolling'));
    window.scrollTo(0, scrollToY);
    requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('resumeUserScrolling'));
    });

    oldContent.forEach(previousPage =>
        animationHelperClasses(previousPage, 'is-exit', config.transitionDuration, {
            removeNodeOnComplete: true,
            onComplete() {
                newPageResponse.then(({ styles }) => {
                    removeOldStyles(oldStyles, styles);
                    oldStyles = styles;
                });
            },
        })
    );

    fetch(href, {
        credentials: 'same-origin',
    })
        .then(res => {
            if (res.status >= 400) {
                throw res;
            }
            return res;
        })
        .then(res => res.text())
        .then((newPageContent) => {
            if (currentPage !== href) return;

            if (window.gtag) {
                gtag('config', window.googleAnalyticsId, { 'page_path': window.location.pathname });
                // gtag('event', 'page_view', { 'send_to': window.googleAnalyticsId });
            }

            const newDoc = document.createElement('div');
            newDoc.innerHTML = newPageContent;
            document.body.className = getBodyClass(newPageContent);
            document.title = newDoc.querySelector('title').innerText;
            const newContent = newDoc.querySelector(config.mainContentSelector);

            pageResponseListener.dispatchEvent(new CustomEvent('newPageResponse', {
                detail: {
                    styles: addNewStyles(oldStyles, getStyles(newDoc), document.head),
                }
            }));

            newContent.classList.add('is-enter');
            pageContainer.insertBefore(newContent, pageContainer.children[0] || null);

            const scriptResponse = applyScripts(oldScripts, getScripts(newDoc), document.body, newContent, oldContent[0]);
            oldScripts = scriptResponse.scriptsOnPage;
            inView(newContent.children, config);

            return Promise
                .all(scriptResponse.scriptPromises)
                .then(() => newContent);
        })
        .then((newContent) => {
            const hash = window.location.hash;

            if (hash) {
                const target = document.querySelector(hash) || document.querySelector(`[name=${hash.slice(1)}]`);
                if (target) {
                    scroller(target, {
                        align: {
                            top: 0,
                            topOffset: document.querySelector(config.headerSelector).clientHeight
                        },
                        time: 1000,
                    });
                }
            }

            animationHelperClasses(newContent, 'is-enter', config.transitionDuration, {
                onComplete() {
                    if (currentPage !== href) return;
                    pageContainer.style.minHeight = '';
                    document.documentElement.classList.remove('is-pageTransition');
                }
            });
        })
        .catch((res) => {
            if (currentPage !== href) return;
            document.documentElement.classList.remove('is-pageTransition');

            console.log(res);
            if (!errorPage) {
                goToPage(`/${res.status || 500}`, true);
            } else if (oldContent.length) {
                oldContent.forEach((previousPage, notFirst) => {
                    if (notFirst && previousPage.parentNode) {
                        previousPage.parentNode.removeChild(previousPage);
                    } else {
                        previousPage.className = 'Page Page--error';
                        previousPage.innerHTML = 'There was an error. Please try again later.';
                    }
                });
            } else {
                const mockPage = document.createElement('main');
                mockPage.className = 'Page Page--error';
                mockPage.innerHTML = 'There was an error. Please try again later.';
                contentPlaceholder.parentNode.insertBefore(mockPage, contentPlaceholder);
            }
        });
}

const onAnchorClick = delegate('a', (e) => {
    // user is opening in new tab or javascript is already doing something with this event
    if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;

    let anchorNode = e.currentTarget;

    // handle svg's
    if (typeof anchorNode.href !== 'string') {
        anchorNode = {
            target: anchorNode.target.baseVal,
            href: anchorNode.href.baseVal,
        };
    }

    if (!['', '_self'].includes(anchorNode.target)) return;
    if (anchorNode.href.indexOf(window.location.origin) !== 0) return;

    const linkParts = anchorNode.href.split('#');
    // check if path is the same as current url, if so, we're jump on current page
    if (linkParts.length > 1 && linkParts[0] === window.location.href.split('#')[0]) return;

    e.preventDefault();

    window.history.pushState(null, '', anchorNode.href);
    goToPage(anchorNode.href);
});

const onFormSubmit = delegate('form[data-ajax-loader]', (e) => {
    // user is opening in new tab or javascript is already doing something with this event
    if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;

    const formNode = e.currentTarget;
    const action = formNode.action || window.location.pathname;

    if (!['', '_self'].includes(formNode.target)) return;
    if (action.indexOf(window.location.origin) !== 0) return;

    e.preventDefault();

    const href = `${action}?${parseFormData(formNode)}`;

    window.history.pushState(null, '', href);
    goToPage(href);
});

function onWindowPopState() {
    if (currentPage.split('#')[0] === window.location.href.split('#')[0]) return;
    goToPage();
}

export function ajaxLoader(options) {
    if (typeof options === 'object') {
        setOption(options);
    }

    const currentContent = document.querySelector(config.mainContentSelector);
    currentContent.parentNode.insertBefore(contentPlaceholder, currentContent);

    document.addEventListener('click', onAnchorClick);
    document.addEventListener('submit', onFormSubmit);
    window.addEventListener('popstate', onWindowPopState);

    onInViewInit();
    inView(document.querySelector(config.mainContentSelector).children, config);

    return {
        destroy() {
            document.removeEventListener('click', onAnchorClick);
            document.removeEventListener('submit', onFormSubmit);
            window.removeEventListener('popstate', onWindowPopState);
            onInViewDestroy();
        }
    }
}

export function loadActiveScripts(context) {
    oldScripts.forEach(script => {
        if (script[status] === LOADED) {
            load(script.dataset.scriptKey, context);
        }
    });
}

// credit: http://stackoverflow.com/a/26798337/4067275
import { on, off } from 'lego-events';

const page = [document.documentElement, document.body];
const scrollingEvents = [
    'scroll',
    'mousedown',
    'wheel',
    'DOMMouseScroll',
    'mousewheel',
    'keyup',
    'touchmove',
];

function scrollTo(context, scrollTargetY) {
    if (context === window) {
        context.scrollTo(0, scrollTargetY);
    } else {
        context.scrollTop = scrollTargetY;
    }
}

// main function
export default function (context, scrollTargetY, speed, easing = 'easeOutSine') {
    // context: container to scroll
    // scrollTargetY: the target scrollY property of the window
    // speed: time in pixels per second
    // easing: easing equation to use

    if (typeof context === 'number') {
        easing = speed || easing;
        speed = scrollTargetY;
        scrollTargetY = context;
        context = window;
    }
    if (typeof speed === 'string') {
        easing = speed;
        speed = 1000;
    }
    if (typeof speed === 'undefined') {
        speed = 1000;
    }

    let userScrolled = false;

    function stopScrolling() {
        userScrolled = true;
    }

    const scrollY = window.pageYOffset;
    let currentTime = 0;

    // min time .1, max time .8 seconds
    const time = Math.max(0.1, Math.min(Math.abs(scrollY - scrollTargetY) / speed, 0.8));

    // easing equations from https://github.com/danro/easing-js/blob/master/easing.js
    const easingEquations = {
        easeOutSine(pos) {
            return Math.sin(pos * (Math.PI / 2));
        },
        easeInOutSine(pos) {
            return (-0.5 * (Math.cos(Math.PI * pos) - 1));
        },
        easeInOutQuint(pos) {
            const halfPos = pos / 0.5;
            if (halfPos < 1) {
                return 0.5 * (halfPos ** 5);
            }
            return 0.5 * (((halfPos - 2) ** 5) + 2);
        },
    };

    on(page, scrollingEvents, stopScrolling);

    // add animation loop
    function tick() {
        currentTime += 1 / 60;

        const p = currentTime / time;
        const t = easingEquations[easing](p);

        if (p < 1) {
            scrollTo(context, scrollY + ((scrollTargetY - scrollY) * t));
            if (!userScrolled) {
                window.requestAnimationFrame(tick);
            }
        } else {
            scrollTo(context, scrollTargetY);
            off(page, scrollingEvents, stopScrolling);
        }
    }
    tick();
}

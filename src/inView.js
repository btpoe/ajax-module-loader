import passiveEvents from 'detect-passive-events';
import { animationHelperClasses, getInstance } from './utils';

function passive() {
    return passiveEvents.hasSupport ? { passive: true } : false;
}

let containers = [];
let shouldRecalculate = true;
let recalcTimer;

export function onWindowResize() {
    containers.forEach(container => container.onResize());
}

export function onWindowScroll() {
    containers = containers.filter(container => container.onScroll());

    if (!containers.length) {
        return;
    }

    if (shouldRecalculate) {
        recalculateBounds();
        shouldRecalculate = false;
    }

    clearTimeout(recalcTimer);
    recalcTimer = setTimeout(() => { shouldRecalculate = true; }, 100);
}

function recalculateBounds() {
    containers.forEach(container => container.recalculateBounds());
}

class InViewContainer {
    constructor(node, options) {
        this.node = node;
        this.node.classList.add('is-enter');
        this.options = options;
        this.onResize();
    }

    onResize() {
        this.recalculateBounds();
        this.onScroll();
    }

    onScroll() {
        const shouldDetatch = (
            this.clientTop < (window.innerHeight * 0.75) + window.pageYOffset
            ||
            this.clientBottom <= window.innerHeight + window.pageYOffset + 50
        );

        if (shouldDetatch) {
            animationHelperClasses(this.node, 'is-enter', this.options.transitionDuration);
        }

        return !shouldDetatch;
    }

    recalculateBounds() {
        this.clientTop = this.node.getBoundingClientRect().top + window.pageYOffset;
        this.clientBottom = this.clientTop + this.node.clientHeight;
    }
}

InViewContainer.getInstance = getInstance(InViewContainer);

export default function (newContainers, options) {
    containers = Array.from(newContainers).map(container =>
        InViewContainer.getInstance(container, options)
    );

    onWindowScroll();
}

export function onInit() {
    window.addEventListener('resive', onWindowResize, passive());
    window.addEventListener('scroll', onWindowScroll, passive());
    window.addEventListener('load', recalculateBounds, passive());
}

export function onDestroy() {
    window.removeEventListener('resive', onWindowResize, passive());
    window.removeEventListener('scroll', onWindowScroll, passive());
    window.removeEventListener('load', recalculateBounds, passive());
}

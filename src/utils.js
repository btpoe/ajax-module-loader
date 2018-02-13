export function srcMap(sources, prop = 'src') {
    return sources.reduce((hashMap, script) => {
        hashMap[script[prop]] = script;
        return hashMap;
    }, {});
}

export function animationHelperClasses(node, className, duration, options = {}) {
    node.classList.add(className);

    requestAnimationFrame(() => {
        // force a repaint
        node.scrollTop;
        node.classList.add(`${className}-active`);
    });

    setTimeout(() => {
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

export function delegate(selector, callback) {
    return (e) => {
        const evt = {};

        for (let prop in e) {
            if (typeof e[prop] === 'function') {
                evt[prop] = (...args) => {
                    e[prop](...args);
                };
            } else {
                evt[prop] = e[prop];
            }
        }

        let target = e.target;

        while (target && target !== e.currentTarget) {
            if (target.matches(selector)) {
                evt.currentTarget = target;
                callback.call(target, evt);
            }
            target = target.parentNode;
        }
    };
}

export function getInstance(Controller) {
    const key = Symbol(Controller.name || 'instance');
    return (node, ...args) => {
        if (!(node[key] instanceof Controller)) {
            node[key] = new Controller(node, ...args);
        }
        return node[key];
    };
}

export function parseFormData(form) {
    return Array.from(form.querySelectorAll('[name]'))
        .filter((input) => {
            if (input.tagName.toLowerCase() !== 'input') {
                return true;
            }

            if (input.type !== 'checkbox' && input.type !== 'radio') {
                return true;
            }

            return input.checked;
        })
        .map((input) => {
            let value;

            switch (input.tagName.toLowerCase()) {
                case 'select':
                    value = Array.from(input.options)
                        .filter(opt => opt.selected)
                        .map(opt => opt.value)
                        .join(',');
                    break;
                default:
                    value = input.value;
                    break;
            }

            return `${input.name}=${value}`;
        })
        .join('&');
}

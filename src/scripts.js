import { init, load, unload, destroy } from './registerScript';
import { srcMap } from './utils';
import { status, LOADED, UNLOADED } from './constants';

const scriptPromises = {
    all: [],
    keys: {},

    get(key) {
        return this.all[this.keys[key]];
    },

    set(key, promise) {
        this.keys[key] = this.all.push(promise) - 1;
    },
};

function scriptCanRegister(script) {
    return script.src.indexOf(window.location.origin) === 0 && script.getAttribute('data-script-key');
}

function removeOld(oldScripts, newScripts) {
    const newScriptSources = srcMap(newScripts);
    const keysTriggered = {};

    oldScripts.forEach((script) => {
        // it should stay loaded
        if (newScriptSources[script.src]) return;

        // it wasn't on the last page, so it has already been unloaded
        if (script[status] === UNLOADED) return;

        // it doesn't have an unload method
        if (!scriptCanRegister(script)) return;

        const key = script.getAttribute('data-script-key');

        script[status] = UNLOADED;

        // the key has already been triggered by another script
        if (keysTriggered[key]) return;
        keysTriggered[key] = true;
        destroy(key);
    });
}

function addNew(oldScripts, newScripts, body, newContext, oldContext) {
    const oldScriptMap = srcMap(oldScripts);
    const scriptsOnPage = oldScripts.slice();
    const keysTriggered = {};

    newScripts.forEach((script) => {
        const key = script.getAttribute('data-script-key');
        const oldScript = oldScriptMap[script.src];

        function nullEvents() {
            this.onload = this.onreadystatechange = this.onerror = null;
        }

        if (!oldScript) {
            if ('noModule' in script && script.noModule) return;
            if (!('noModule' in script) && script.type === 'module') return;

            const patchScript = document.createElement('script');
            patchScript.src = script.src;
            patchScript.type = script.type;
            patchScript.noModule = script.noModule;
            patchScript.crossOrigin = script.crossOrigin;
            patchScript.setAttribute('data-script-key', key);

            scriptPromises.set(key, new Promise((resolve, reject) => {
                patchScript.onload = patchScript.onreadystatechange = resolve;
                patchScript.onerror = reject;
            }).then(nullEvents.bind(patchScript)).catch(nullEvents.bind(patchScript)));

            const deps = script.getAttribute('data-script-dependencies');

            if (deps) {
                patchScript.setAttribute('data-script-dependencies', deps);

                Promise
                    .all(JSON.parse(deps).map(depKey => scriptPromises.get(depKey)))
                    .then(() => {
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

    newContext.querySelectorAll('script').forEach((refNode) => {
        if (refNode.type.indexOf('text') > -1) return;

        const patchScript = document.createElement('script');

        Array.from(refNode.attributes).forEach((attr) => {
            patchScript[attr.name] = attr.value;
        });

        patchScript.innerHTML = refNode.innerHTML;
        refNode.parentNode.replaceChild(patchScript, refNode);
    });

    const scriptsLoaded = [];

    Object.keys(scriptPromises).forEach((promise) => {
        scriptsLoaded.push(promise);
    });

    return { scriptsOnPage, scriptPromises: scriptPromises.all };
}

export default function applyScripts(oldScripts, newScripts, body, newContext, oldContext) {
    removeOld(oldScripts, newScripts);
    return addNew(oldScripts, newScripts, body, newContext, oldContext);
}

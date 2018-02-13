const initEvent = key => `union__custom_init_event_for_${key}`;
const loadEvent = key => `union__custom_load_event_for_${key}`;
const unloadEvent = key => `union__custom_unload_event_for_${key}`;
const destroyEvent = key => `union__custom_destroy_event_for_${key}`;

export function init(key) {
    document.dispatchEvent(new CustomEvent(initEvent(key)));
}

export function load(key, context) {
    document.dispatchEvent(new CustomEvent(loadEvent(key), { detail: { context } }));
}

export function unload(key, context) {
    document.dispatchEvent(new CustomEvent(unloadEvent(key), { detail: { context } }));
}

export function destroy(key) {
    document.dispatchEvent(new CustomEvent(destroyEvent(key)));
}

export default function register(key, {
    onInit = (() => {}),
    onLoad = (() => {}),
    onUnload = (() => {}),
    onDestroy = (() => {})
}) {
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

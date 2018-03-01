import { srcMap } from './utils';

export function removeOld(oldStyles, newStyles) {
    const newStylesMap = srcMap(newStyles, 'href');

    oldStyles.forEach((style) => {
        if (newStylesMap[style.href] || !style.parentNode) return;

        style.parentNode.removeChild(style);
    });
}

export function addNew(oldStyles, newStyles, head) {
    const oldScriptMap = srcMap(oldStyles, 'href');
    const stylesOnPage = [];

    newStyles.forEach((style) => {
        if (oldScriptMap[style.href]) {
            stylesOnPage.push(oldScriptMap[style.href]);
            return oldScriptMap[style.href];
        }

        head.appendChild(style);
        stylesOnPage.push(style);
        return style;
    });

    return stylesOnPage;
}

export default function applyStyles(oldStyles, newStyles, body) {
    removeOld(oldStyles, newStyles);
    return addNew(oldStyles, newStyles, body);
}

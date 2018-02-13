import { srcMap } from './utils';

export function removeOld(oldStyles, newStyles) {
    const newStylesMap = srcMap(newStyles, 'href');

    oldStyles.forEach((style) => {
        if (newStylesMap[style.href] || !style.parentNode) return;

        style.parentNode.removeChild(style);
    });
}

export function addNew(oldStyles, newStyles, body) {
    const oldScriptMap = srcMap(oldStyles, 'href');
    const firstStyle = body.querySelector('link[ref="stylesheet"],link[href$=".css"]');
    const stylesOnPage = [];

    if (!firstStyle) return stylesOnPage;

    newStyles.reduce((lastStyle, style) => {
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

export default function applyStyles(oldStyles, newStyles, body) {
    removeOld(oldStyles, newStyles);
    return addNew(oldStyles, newStyles, body);
}

const PiBy180 = Math.PI / 180; // 写在这里相当于缓存，因为会频繁调用
export class Util {
    /** 单纯的创建一个新的 canvas 元素 */
    static createCanvasElement() {
        const canvas = document.createElement('canvas');
        return canvas;
    }
    /** 角度转弧度，注意 canvas 中用的都是弧度，但是角度对我们来说比较直观 */
    static degreesToRadians(degrees: number): number {
        return degrees * PiBy180;
    }
    /** 弧度转角度，注意 canvas 中用的都是弧度，但是角度对我们来说比较直观 */
    static radiansToDegrees(radians: number): number {
        return radians / PiBy180;
    }
    /** 从数组中溢出某个元素 */
    static removeFromArray(array: any[], value: any) {
        let idx = array.indexOf(value);
        if (idx !== -1) {
            array.splice(idx, 1);
        }
        return array;
    }
    static clone(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        let temp = new obj.constructor();
        for (let key in obj) {
            if (!obj[key] || typeof obj[key] !== 'object') {
                temp[key] = obj[key];
            } else {
                temp[key] = Util.clone(obj[key]);
            }
        }
        return temp;
    }
    static loadImage(url: string, options: any = {}) {
        return new Promise(function (resolve, reject) {
            let img = document.createElement('img');
            let done = () => {
                img.onload = img.onerror = null;
                resolve(img);
            };
            if (url) {
                img.onload = done;
                img.onerror = () => {
                    reject(new Error('Error loading ' + img.src));
                };
                options &&
                    options.crossOrigin &&
                    (img.crossOrigin = options.crossOrigin);
                img.src = url;
            } else {
                done();
            }
        });
    }

    /** 给元素添加类名 */
    static addClass(element: HTMLElement, className: string) {
        if (
            (' ' + element.className + ' ').indexOf(' ' + className + ' ') ===
            -1
        ) {
            element.className += (element.className ? ' ' : '') + className;
        }
    }

    /** 给元素设置样式 */
    static setStyle(
        element: HTMLElement,
        styles: string | Partial<CSSStyleDeclaration>
    ) {
        let elementStyle = element.style;

        if (typeof styles === 'string') {
            element.style.cssText += ';' + styles;

            const obj = styles.match(/opacity:\s*(\d?\.?\d*)/);

            return styles.indexOf('opacity') > -1
                ? Util.setOpacity(element, obj as any)
                : element;
        }
        for (let property in styles) {
            if (property === 'opacity') {
                Util.setOpacity(element, styles[property]!);
            } else {
                elementStyle[property] = styles[property]!;
            }
        }
        return element;
    }

    /** 设置元素透明度 */
    static setOpacity(element: HTMLElement, value: string) {
        element.style.opacity = value;
        return element;
    }
    /** 设置 css 的 userSelect 样式为 none，也就是不可选中的状态 */
    static makeElementUnselectable(element: HTMLElement): HTMLElement {
        element.style.userSelect = 'none';
        return element;
    }
}

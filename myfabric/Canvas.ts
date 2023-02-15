import { Util } from './Util';

/** 画布类 */
class Canvas {
    /** 画布宽度 */
    public width: number;
    /** 画布高度 */
    public height: number;
    /** 包围 canvas 的外层 div 容器 */
    public wrapperEl: HTMLElement;
    /** 下层 canvas 画布，主要用于绘制所有物体 */
    public lowerCanvasEl: HTMLCanvasElement;
    /** 上层 canvas，主要用于监听鼠标事件、涂鸦模式、左键点击拖蓝框选区域 */
    public upperCanvasEl: HTMLCanvasElement;
    /** 缓冲层画布 */
    public cacheCanvasEl: HTMLCanvasElement;
    /** 上层画布环境 */
    public contextTop: CanvasRenderingContext2D;
    /** 下层画布环境 */
    public contextContainer: CanvasRenderingContext2D;
    /** 缓冲层画布环境 */
    public contextCache: CanvasRenderingContext2D;
    /** 整个画布到上面和左边的偏移量 */
    private _offset: Offset;
    /** 画布中所有添加的物体 */
    private _objects: FabricObject[];

    constructor(el: HTMLCanvasElement, options) {
        // 初始化下层画布 lower-canvas
        this._initStatic(el, options);
        // 初始化上层画布 upper-canvas
        this._initInteractive();
        // 初始化缓冲层画布
        this._createCacheCanvas();
    }

    // 下层画布初始化：参数赋值、重置宽高，并赋予样式
    _initStatic(el: HTMLCanvasElement, options) {
        this.lowerCanvasEl = el;
        Util.addClass(this.lowerCanvasEl, 'lower-canvas');
        this._applyCanvasStyle(this.lowerCanvasEl);
        this.contextContainer = this.lowerCanvasEl.getContext('2d')!;

        for (let prop in options) {
            this[prop] = options[prop];
        }

        this.width = +this.lowerCanvasEl.width;
        this.height = +this.lowerCanvasEl.height;
        this.lowerCanvasEl.style.width = this.width + 'px';
        this.lowerCanvasEl.style.height = this.height + 'px';
    }
    // 其余两个画布同理

    _applyCanvasStyle(el: HTMLCanvasElement) {
        let width = this.width || el.width;
        let height = this.height || el.height;
        Util.setStyle(el, {
            position: 'absolute',
            width: width + 'px',
            height: height + 'px',
            left: '0',
            top: '0',
        });
        el.width = width;
        el.height = height;
        Util.makeElementUnselectable(el);
    }
}

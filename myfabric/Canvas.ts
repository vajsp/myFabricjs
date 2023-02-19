import { FabricObject } from './FabricObject';
import { Offset, Pos } from './interface';
import { Util } from './Util';

/** 画布类 */
class Canvas {
    /** 画布宽度 */
    public width: number;
    /** 画布高度 */
    public height: number;
    /** 画布背景颜色 */
    public backgroundColor;
    /** 包围 canvas 的外层 div 容器 */
    public wrapperEl: HTMLElement;
    /** 下层 canvas 画布，主要用于绘制所有物体 */
    public lowerCanvasEl: HTMLCanvasElement;
    /** 上层 canvas，主要用于监听鼠标事件、涂鸦模式、左键点击拖蓝框选区域 */
    public upperCanvasEl: HTMLCanvasElement;
    /** 上层画布环境 */
    public contextTop: CanvasRenderingContext2D;
    /** 下层画布环境 */
    public contextContainer: CanvasRenderingContext2D;
    /** 缓冲层画布环境，方便某些情况方便计算用的，比如检测物体是否透明 */
    public cacheCanvasEl: HTMLCanvasElement;
    public contextCache: CanvasRenderingContext2D;
    public containerClass: string = 'canvas-container';

    /** 记录最近一个激活的物体，可以优化点选过程，也就是点选的时候先判断是否是当前激活物体 */
    // public lastRenderedObjectWithControlsAboveOverlay;
    /** 通过像素来检测物体而不是通过包围盒 */
    // public perPixelTargetFind: boolean = false;

    /** 一些鼠标样式 */
    public defaultCursor: string = 'default';
    public hoverCursor: string = 'move';
    public moveCursor: string = 'move';
    public rotationCursor: string = 'crosshair';

    public viewportTransform: number[] = [1, 0, 0, 1, 0, 0];
    public vptCoords: {};

    // public relatedTarget;
    /** 选择区域框的背景颜色 */
    public selectionColor: string = 'rgba(100, 100, 255, 0.3)';
    /** 选择区域框的边框颜色 */
    public selectionBorderColor: string = 'red';
    /** 选择区域的边框大小，拖蓝的线宽 */
    public selectionLineWidth: number = 1;
    /** 左键拖拽的产生的选择区域，拖蓝区域 */
    private _groupSelector: GroupSelector | null;
    /** 当前选中的组 */
    public _activeGroup: Group | null;

    /** 画布中所有添加的物体 */
    private _objects: FabricObject[];
    /** 整个画布到上面和左边的偏移量 */
    private _offset: Offset;
    /** 当前物体的变换信息，src 目录下中有截图 */
    private _currentTransform: CurrentTransform | null;
    /** 当前激活物体 */
    private _activeObject;
    /** 变换之前的中心点方式 */
    // private _previousOriginX;
    private _previousPointer: Pos;

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

    /** 初始化交互层，也就是 upper-canvas */
    _initInteractive() {
        this._currentTransform = null;
        this._groupSelector = null;
        this._initWrapperElement();
        this._createUpperCanvas();
        this._initEvents();
        this.calcOffset();
    }

    /** 因为我们用了两个 canvas，所以在 canvas 的外面再多包一个 div 容器 */
    _initWrapperElement() {
        this.wrapperEl = Util.wrapElement(this.lowerCanvasEl, 'div', {
            class: this.containerClass,
        });
        Util.setStyle(this.wrapperEl, {
            width: this.width + 'px',
            height: this.height + 'px',
            position: 'relative',
        });
        Util.makeElementUnselectable(this.wrapperEl);
    }

    /** 创建上层画布，主要用于鼠标交互和涂鸦模式 */
    _createUpperCanvas() {
        this.upperCanvasEl = Util.createCanvasElement();
        this.upperCanvasEl.className = 'upper-canvas';
        this.wrapperEl.appendChild(this.upperCanvasEl);
        this._applyCanvasStyle(this.upperCanvasEl);
        this.contextTop = this.upperCanvasEl.getContext('2d')!;
    }

    /** 给上层画布增加鼠标事件 */
    _initEvents() {
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onResize = this._onResize.bind(this);

        Util.addListener(window, 'resize', this._onResize);
        Util.addListener(this.upperCanvasEl, 'mousedown', this._onMouseDown);
        Util.addListener(this.upperCanvasEl, 'mousemove', this._onMouseMove);
    }
    _onMouseDown(e: MouseEvent) {
        this.__onMouseDown(e);
        Util.addListener(document, 'mouseup', this._onMouseUp);
        Util.addListener(document, 'mousemove', this._onMouseMove);
        Util.removeListener(this.upperCanvasEl, 'mousemove', this._onMouseMove);
    }
    _onMouseMove(e: MouseEvent) {
        e.preventDefault();
        this.__onMouseMove(e);
    }
    _onMouseUp(e: MouseEvent) {
        this.__onMouseUp(e);
        Util.removeListener(document, 'mouseup', this._onMouseUp);
        Util.removeListener(document, 'mousemove', this._onMouseMove);
        Util.addListener(this.upperCanvasEl, 'mousemove', this._onMouseMove);
    }
    _onResize() {
        this.calcOffset();
    }

    __onMouseDown(e: MouseEvent) {
        // 只处理左键点击，要么是拖蓝事件、要么是点选事件
        let isLeftClick =
            'which' in e ? e.which === 1 : (e as MouseEvent).button === 1;
        if (!isLeftClick) return;

        // 这个我猜是为了保险起见，ignore if some object is being transformed at this moment
        if (this._currentTransform) return;

        let target = this.findTarget(e);
        let pointer = this.getPointer(e);
        let corner;
        this._previousPointer = pointer;

        if (this._shouldClearSelection(e)) {
            // 如果是拖蓝选区事件
            this._groupSelector = {
                // 重置选区状态
                ex: pointer.x,
                ey: pointer.y,
                top: 0,
                left: 0,
            };
            // 让所有元素失去激活状态
            this.deactivateAllWithDispatch();
            // this.renderAll();
        } else {
            // 如果是点选操作，接下来就要为各种变换做准备
            target!.saveState();

            // 判断点击的是不是控制点
            corner = target!._findTargetCorner(e, this._offset);
            // if ((corner = target._findTargetCorner(e, this._offset))) {
            //     this.onBeforeScaleRotate(target);
            // }
            if (this._shouldHandleGroupLogic(e, target!)) {
                // 如果是选中组
                this._handleGroupLogic(e, target);
                target = this.getActiveGroup()!;
            } else {
                // 如果是选中单个物体
                if (target !== this.getActiveGroup()) {
                    this.deactivateAll();
                }
                this.setActiveObject(target!, e);
            }
            this._setupCurrentTransform(e, target!);

            // if (target) this.renderAll();
        }
        // 不论是拖蓝选区事件还是点选事件，都需要重新绘制
        // 拖蓝选区：需要把之前激活的物体取消选中态
        // 点选事件：需要把当前激活的物体置顶
        this.renderAll();

        this.emit('mouse:down', { target, e });
        target && target.emit('mousedown', { e });
        // if (corner === 'mtr') {
        //     // 如果点击的是上方的控制点，也就是旋转操作，我们需要临时改一下变换中心，因为我们一直就是以 center 为中心，所以可以先不管
        //     this._previousOriginX = this._currentTransform.target.originX;
        //     this._currentTransform.target.adjustPosition('center');
        //     this._currentTransform.left = this._currentTransform.target.left;
        //     this._currentTransform.top = this._currentTransform.target.top;
        // }
    }
    /** 处理鼠标 hover 事件和物体变换时的拖拽事件
     * 如果是涂鸦模式，只绘制 upper-canvas
     * 如果是图片变换，只绘制 upper-canvas */
    __onMouseMove(e: MouseEvent) {
        let target, pointer;

        let groupSelector = this._groupSelector;

        if (groupSelector) {
            // 如果有拖蓝框选区域
            pointer = Util.getPointer(e, this.upperCanvasEl);

            groupSelector.left =
                pointer.x - this._offset.left - groupSelector.ex;
            groupSelector.top = pointer.y - this._offset.top - groupSelector.ey;
            this.renderTop();
        } else if (!this._currentTransform) {
            // 如果是 hover 事件，这里我们只需要改变鼠标样式，并不会重新渲染
            let style = this.upperCanvasEl.style;
            target = this.findTarget(e);

            if (target) {
                this._setCursorFromEvent(e, target);
            } else {
                // image/text was hovered-out from, we remove its borders
                // for (let i = this._objects.length; i--; ) {
                //     if (this._objects[i] && !this._objects[i].active) {
                //         this._objects[i].setActive(false);
                //     }
                // }
                style.cursor = this.defaultCursor;
            }
        } else {
            // 如果是旋转、缩放、平移等操作
            pointer = Util.getPointer(e, this.upperCanvasEl);

            let x = pointer.x,
                y = pointer.y;

            this._currentTransform.target.isMoving = true;

            let t = this._currentTransform,
                reset = false;
            // if (
            //     (t.action === 'scale' || t.action === 'scaleX' || t.action === 'scaleY') &&
            //     // Switch from a normal resize to center-based
            //     ((e.altKey && (t.originX !== 'center' || t.originY !== 'center')) ||
            //         // Switch from center-based resize to normal one
            //         (!e.altKey && t.originX === 'center' && t.originY === 'center'))
            // ) {
            //     this._resetCurrentTransform(e);
            //     reset = true;
            // }

            if (this._currentTransform.action === 'rotate') {
                // 如果是旋转操作
                this._rotateObject(x, y);

                this.emit('object:rotating', {
                    target: this._currentTransform.target,
                    e,
                });
                this._currentTransform.target.emit('rotating');
            } else if (this._currentTransform.action === 'scale') {
                // 如果是整体缩放操作
                if (e.shiftKey) {
                    this._currentTransform.currentAction = 'scale';
                    this._scaleObject(x, y);
                } else {
                    if (!reset && t.currentAction === 'scale') {
                        // Switch from a normal resize to proportional
                        this._resetCurrentTransform(e);
                    }

                    this._currentTransform.currentAction = 'scaleEqually';
                    this._scaleObject(x, y, 'equally');
                }

                this.emit('object:scaling', {
                    target: this._currentTransform.target,
                    e,
                });
                this._currentTransform.target.emit('scaling', { e });
            } else if (this._currentTransform.action === 'scaleX') {
                // 如果只是缩放 x
                this._scaleObject(x, y, 'x');

                this.emit('object:scaling', {
                    target: this._currentTransform.target,
                    e,
                });
                this._currentTransform.target.emit('scaling', { e });
            } else if (this._currentTransform.action === 'scaleY') {
                // 如果只是缩放 y
                this._scaleObject(x, y, 'y');

                this.emit('object:scaling', {
                    target: this._currentTransform.target,
                    e,
                });
                this._currentTransform.target.emit('scaling', { e });
            } else {
                // 如果是拖拽物体
                this._translateObject(x, y);

                this.emit('object:moving', {
                    target: this._currentTransform.target,
                    e,
                });

                this._setCursor(this.moveCursor);
                this._currentTransform.target.emit('moving', { e });
            }

            this.renderAll();
        }

        this.emit('mouse:move', { target, e });
        target && target.emit('mousemove', { e });
    }
    /** 主要就是清空拖蓝选区，设置物体激活状态，重新渲染画布 */
    __onMouseUp(e: MouseEvent) {
        let target;
        if (this._currentTransform) {
            let transform = this._currentTransform;

            target = transform.target;
            if (target._scaling) {
                target._scaling = false;
            }

            // 每次物体更改都要重新计算新的控制点
            let i = this._objects.length;
            while (i--) {
                this._objects[i].setCoords();
            }

            target.isMoving = false;

            // 在点击之间如果物体状态改变了才派发事件
            if (target.hasStateChanged()) {
                this.emit('object:modified', { target });
                target.emit('modified');
            }

            // if (this._previousOriginX) {
            //     this._currentTransform.target.adjustPosition(this._previousOriginX);
            //     this._previousOriginX = null;
            // }
        }

        this._currentTransform = null;

        if (this._groupSelector) {
            // 如果有拖蓝框选区域
            this._findSelectedObjects(e);
        }
        let activeGroup = this.getActiveGroup();
        if (activeGroup) {
            //重新设置 激活组 中的物体
            activeGroup.setObjectsCoords();
            activeGroup.set('isMoving', false);
            this._setCursor(this.defaultCursor);
        }

        // clear selection
        this._groupSelector = null;
        this.renderAll();

        this._setCursorFromEvent(e, target);

        // fix for FF
        // this._setCursor('');

        // let _this = this;
        // setTimeout(function () {
        //     _this._setCursorFromEvent(e, target);
        // }, 50);

        // if (target) {
        //     const { top, left, currentWidth, currentHeight, width, height, angle, scaleX, scaleY, originX, originY } = target;
        //     const obj = {
        //         top,
        //         left,
        //         currentWidth,
        //         currentHeight,
        //         width,
        //         height,
        //         angle,
        //         scaleX,
        //         scaleY,
        //         originX,
        //         originY,
        //     };
        //     console.log(JSON.stringify(obj, null, 4));
        // }

        this.emit('mouse:up', { target, e });
        target && target.emit('mouseup', { e });
    }

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

    /** 获取画布的偏移量，到时计算鼠标点击位置需要用到 */
    calcOffset(): Canvas {
        this._offset = Util.getElementOffset(this.lowerCanvasEl);
        return this;
    }

    /** 检测是否有物体在鼠标位置 */
    findTarget(
        e: MouseEvent,
        skipGroup: boolean = false
    ): FabricObject | undefined {
        let target: FabricObject | null = null;
        // let pointer = this.getPointer(e);

        // 优先考虑当前组中的物体，因为激活的物体被选中的概率大
        let activeGroup = this.getActiveGroup();
        if (activeGroup && !skipGroup && this.containsPoint(e, activeGroup)) {
            target = activeGroup;
            return target;
        }

        // 遍历所有物体，判断鼠标点是否在物体包围盒内
        for (let i = this._objects.length; i--; ) {
            if (this._objects[i] && this.containsPoint(e, this._objects[i])) {
                target = this._objects[i];
                break;
            }
        }

        // 如果不根据包围盒来判断，而是根据透明度的话，可以用下面的代码
        // 先通过包围盒找出可能点选的物体，再通过透明度具体判断，具体思路可参考 _isTargetTransparent 方法
        // let possibleTargets = [];
        // for (let i = this._objects.length; i--; ) {
        //     if (this._objects[i] && this.containsPoint(e, this._objects[i])) {
        //         if (this.perPixelTargetFind || this._objects[i].perPixelTargetFind) {
        //             possibleTargets[possibleTargets.length] = this._objects[i];
        //         } else {
        //             target = this._objects[i];
        //             this.relatedTarget = target;
        //             break;
        //         }
        //         break;
        //     }
        // }
        // for (let j = 0, len = possibleTargets.length; j < len; j++) {
        //     pointer = this.getPointer(e);
        //     let isTransparent = this._isTargetTransparent(possibleTargets[j], pointer.x, pointer.y);
        //     if (!isTransparent) {
        //         target = possibleTargets[j];
        //         this.relatedTarget = target;
        //         break;
        //     }
        // }

        if (target) return target;
    }
}

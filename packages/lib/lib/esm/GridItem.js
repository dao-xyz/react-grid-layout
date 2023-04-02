import { jsx as _jsx } from "react/jsx-runtime";
import React, { useRef, useState } from "react";
import { DraggableCore } from "react-draggable";
import { Resizable } from "react-resizable";
import { perc, setTopLeft, setTransform } from "./utils";
import { calcGridItemPosition, calcGridItemWHPx, calcGridColWidth, calcXY, calcWH, clamp } from "./calculateUtils";
import clsx from "clsx";
const GridItem = (props) => {
    const [resizing, setResizing] = useState();
    const [dragging, setDragging] = useState();
    const [dragStart, setDragStart] = useState();
    const [className, setClassName] = useState(props.className || "");
    const elementRef = useRef();
    let { cancel = "", handle = "", minH = 1, minW = 1, maxH = Infinity, maxW = Infinity, transformScale = 1, resizeHandles, resizeHandle } = props;
    const moveDroppingItem = (prevProps) => {
        const { droppingPosition } = props;
        if (!droppingPosition)
            return;
        const node = elementRef.current;
        // Can't find DOM node (are we unmounted?)
        if (!node)
            return;
        const prevDroppingPosition = prevProps.droppingPosition || {
            left: 0,
            top: 0
        };
        const shouldDrag = (dragging && droppingPosition.left !== prevDroppingPosition.left) ||
            droppingPosition.top !== prevDroppingPosition.top;
        if (!dragging) {
            onDragStart(droppingPosition.e, {
                node,
                deltaX: droppingPosition.left,
                deltaY: droppingPosition.top
            });
        }
        else if (shouldDrag) {
            const deltaX = droppingPosition.left - dragging.left;
            const deltaY = droppingPosition.top - dragging.top;
            onDrag(droppingPosition.e, {
                node,
                deltaX,
                deltaY
            });
        }
    };
    // TODO
    // setEffect((moveDroppingItem())=>[droppingPosition])
    const getPositionParams = (p = props) => {
        return {
            cols: p.cols,
            containerPadding: p.containerPadding,
            containerWidth: p.containerWidth,
            margin: p.margin,
            maxRows: p.maxRows,
            rowHeight: p.rowHeight
        };
    };
    /**
     * This is where we set the grid item's absolute placement. It gets a little tricky because we want to do it
     * well when server rendering, and the only way to do that properly is to use percentage width/left because
     * we don't know exactly what the browser viewport is.
     * Unfortunately, CSS Transforms, which are great for performance, break in this instance because a percentage
     * left is relative to the item itself, not its container! So we cannot use them on the server rendering pass.
     *
     * @param  {Object} pos Position object with width, height, left, top.
     * @return {Object}     Style object.
     */
    const createStyle = (pos) => {
        const { usePercentages, containerWidth, useCSSTransforms } = props;
        let style;
        // CSS Transforms support (default)
        if (useCSSTransforms) {
            style = setTransform(pos);
        }
        else {
            // top,left (slow)
            style = setTopLeft(pos);
            // This is used for server rendering.
            if (usePercentages) {
                if (containerWidth == null) {
                    throw new Error("Container width is missing!");
                }
                style.left = perc(pos.left / containerWidth);
                style.width = perc(pos.width / containerWidth);
            }
        }
        return style;
    };
    /**
     * Mix a Draggable instance into a child.
     * @param  {Element} child    Child element.
     * @return {Element}          Child wrapped in Draggable.
     */
    const mixinDraggable = (child, isDraggable) => {
        return (_jsx(DraggableCore, { disabled: !isDraggable, onStart: onDragStart, onDrag: onDrag, onStop: onDragStop, handle: props.handle, cancel: ".react-resizable-handle" + (props.cancel ? "," + props.cancel : ""), scale: props.transformScale, nodeRef: elementRef, children: child }));
    };
    /**
     * Mix a Resizable instance into a child.
     * @param  {Element} child    Child element.
     * @param  {Object} position  Position object (pixel values)
     * @return {Element}          Child wrapped in Resizable.
     */
    const mixinResizable = (child, position, isResizable) => {
        const positionParams = getPositionParams();
        // This is the max possible width - doesn't go to infinity because of the width of the window
        const maxWidth = calcGridItemPosition(positionParams, 0, 0, 0, props.cols - props.x, // TODO types
        0).width;
        // Calculate min/max constraints using our min & maxes
        const mins = calcGridItemPosition(positionParams, 0, 0, 0, minW, minH);
        const maxes = calcGridItemPosition(positionParams, 0, 0, 0, maxW, maxH);
        const minConstraints = [mins.width, mins.height];
        const maxConstraints = [
            Math.min(maxes.width, maxWidth),
            Math.min(maxes.height, Infinity)
        ];
        return (_jsx(Resizable
        // These are opts for the resize handle itself
        , { 
            // These are opts for the resize handle itself
            draggableOpts: {
                disabled: !isResizable
            }, className: isResizable ? undefined : "react-resizable-hide", width: position.width, height: position.height, minConstraints: minConstraints, maxConstraints: maxConstraints, onResizeStop: onResizeStop, onResizeStart: onResizeStart, onResize: onResize, transformScale: transformScale, resizeHandles: resizeHandles, handle: resizeHandle, children: child }));
    };
    /**
     * onDragStart event handler
     * @param  {Event}  e             event data
     * @param  {Object} callbackData  an object with node, delta and position information
     */
    const onDragStart = (e, { node }) => {
        const { onDragStart } = props;
        if (!onDragStart)
            return;
        const newPosition = { top: 0, left: 0 };
        // TODO: this wont work on nested parents
        const { offsetParent } = node;
        if (!offsetParent)
            return;
        const parentRect = offsetParent.getBoundingClientRect();
        const clientRect = node.getBoundingClientRect();
        const cLeft = clientRect.left / transformScale;
        const pLeft = parentRect.left / transformScale;
        const cTop = clientRect.top / transformScale;
        const pTop = parentRect.top / transformScale;
        newPosition.left = cLeft - pLeft + offsetParent.scrollLeft;
        newPosition.top = cTop - pTop + offsetParent.scrollTop;
        setDragging(newPosition);
        // Call callback with this data
        const { x, y } = calcXY(getPositionParams(), newPosition.top, newPosition.left, props.w, // TODO types
        props.h // TODO types
        );
        setDragStart({ x, y });
        return onDragStart.call(this, {
            i: props.i,
            x: x,
            y: y,
            data: {
                e,
                node,
                newPosition
            }
        });
    };
    /**
     * onDrag event handler
     * @param  {Event}  e             event data
     * @param  {Object} callbackData  an object with node, delta and position information
     */
    const onDrag = (e, { node, deltaX, deltaY }) => {
        const { onDrag } = props;
        if (!onDrag)
            return;
        if (!dragging) {
            throw new Error("onDrag called before onDragStart.");
        }
        let top = dragging.top + deltaY;
        let left = dragging.left + deltaX;
        const { isBounded, i, w, h, containerWidth } = props;
        const positionParams = getPositionParams();
        // Boundary calculations; keeps items within the grid
        if (isBounded) {
            const { offsetParent } = node;
            if (offsetParent) {
                const { margin, rowHeight } = props;
                const bottomBoundary = offsetParent.clientHeight - calcGridItemWHPx(h, rowHeight, margin[1]);
                top = clamp(top, 0, bottomBoundary);
                const colWidth = calcGridColWidth(positionParams);
                const rightBoundary = containerWidth - calcGridItemWHPx(w, colWidth, margin[0]);
                left = clamp(left, 0, rightBoundary);
            }
        }
        const newPosition = { top, left };
        setDragging(newPosition);
        // Call callback with this data
        const { x, y } = calcXY(positionParams, top, left, w, h);
        return onDrag.call(this, {
            i,
            x: x,
            y: y,
            data: {
                e,
                node,
                newPosition
            }
        });
    };
    /**
     * onDragStop event handler
     * @param  {Event}  e             event data
     * @param  {Object} callbackData  an object with node, delta and position information
     */
    const onDragStop = (e, { node }) => {
        const { onDragStop } = props;
        if (!onDragStop)
            return;
        if (!dragging) {
            throw new Error("onDragEnd called before onDragStart.");
        }
        const { w, h, i } = props;
        const { left, top } = dragging;
        const newPosition = { top, left };
        const { x, y } = calcXY(getPositionParams(), top, left, w, h);
        let change = dragStart?.x !== x || dragStart?.y !== y;
        setDragging(undefined);
        setDragStart(undefined);
        return onDragStop.call(this, {
            i,
            x: x,
            y: y,
            data: {
                e,
                node,
                newPosition,
                change
            }
        });
    };
    /**
     * onResizeStop event handler
     * @param  {Event}  e             event data
     * @param  {Object} callbackData  an object with node and size information
     */
    const onResizeStop = (e, callbackData) => {
        onResizeHandler(e, callbackData, "onResizeStop");
    };
    /**
     * onResizeStart event handler
     * @param  {Event}  e             event data
     * @param  {Object} callbackData  an object with node and size information
     */
    const onResizeStart = (e, callbackData) => {
        onResizeHandler(e, callbackData, "onResizeStart");
    };
    /**
     * onResize event handler
     * @param  {Event}  e             event data
     * @param  {Object} callbackData  an object with node and size information
     */
    const onResize = (e, callbackData) => {
        onResizeHandler(e, callbackData, "onResize");
    };
    /**
     * Wrapper around drag events to provide more useful data.
     * All drag events call the function with the given handler name,
     * with the signature (index, x, y).
     *
     * @param  {String} handlerName Handler name to wrap.
     * @return {Function}           Handler function.
     */
    const onResizeHandler = (e, { node, size }, handlerName) => {
        const handler = props[handlerName];
        if (!handler)
            return;
        const { cols, x, y, i } = props;
        // Get new XY
        let { w, h } = calcWH(getPositionParams(), size.width, size.height, x, y);
        // minW should be at least 1 (TODO propTypes validation?)
        minW = Math.max(minW, 1);
        // maxW should be at most (cols - x)
        maxW = Math.min(maxW, cols - x);
        // Min/max capping
        w = clamp(w, minW, maxW);
        h = clamp(h, minH, maxH);
        setResizing(handlerName === "onResizeStop" ? undefined : size);
        handler.call(this, {
            i,
            x: w,
            y: h,
            data: { e, node, size }
        });
    };
    const { x, y, z, w, h, isDraggable, isResizable, droppingPosition, useCSSTransforms } = props;
    const pos = calcGridItemPosition(getPositionParams(), x, y, z, w, h, {
        dragging,
        resizing
    });
    const child = React.Children.only(props.children);
    // Create the child element. We clone the existing element but modify its className and style.
    let newChild = React.cloneElement(child, {
        ref: elementRef,
        className: clsx("react-grid-item", child.props.className, props.className, {
            static: props.static,
            resizing: Boolean(resizing),
            "react-draggable": isDraggable,
            "react-draggable-dragging": Boolean(dragging),
            dropping: Boolean(droppingPosition),
            cssTransforms: useCSSTransforms
        }),
        // We can set the width and height on the child, but unfortunately we can't set the position.
        style: {
            ...props.style,
            ...child.props.style,
            ...createStyle(pos)
        }
    });
    // Resizabl e support. This is usually on but the user can toggle it off.
    newChild = mixinResizable(newChild, pos, isResizable);
    // Draggable support. This is always on, except for with placeholders.
    newChild = mixinDraggable(newChild, isDraggable);
    return newChild;
};
export default GridItem;
//# sourceMappingURL=GridItem.js.map
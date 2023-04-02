import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { deepEqual } from "fast-equals";
import clsx from "clsx";
import { bottom, cloneLayoutItem, compact, getAllCollisions, getLayoutItem, moveElement, noop, synchronizeLayoutWithChildren, withLayoutItem } from "./utils";
import { calcXY } from "./calculateUtils";
import GridItem from "./GridItem";
// End Types
const layoutClassName = "react-grid-layout";
let isFirefox = false;
// Try...catch will protect from navigator not existing (e.g. node) or a bad implementation of navigator
try {
    isFirefox = /firefox/i.test(navigator.userAgent);
}
catch (e) {
    /* Ignore */
}
/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */
const ReactGridLayout = (properties) => {
    const { autoSize = true, cols = 12, className = "", style = {}, draggableHandle = "", draggableCancel = "", containerPadding = undefined, rowHeight = 150, maxRows = Infinity, // infinite vertical growth
    margin = [10, 10], isBounded = false, isDraggable = true, isResizable = true, allowOverlap = false, isDroppable = false, useCSSTransforms = true, transformScale = 1, compactType = "vertical", preventCollision = false, droppingItem = {
        i: "__dropping-elem__",
        h: 1,
        w: 1
    }, // TODO fix
    resizeHandles = ["se"], onLayoutChange = noop, onDragStart = noop, onDrag = noop, onDragStop = noop, onResizeStart = noop, onResize = noop, onResizeStop = noop, onDrop = noop, onDropDragOver = noop, width = 0, resizeHandle, innerRef } = properties;
    // Refactored to another module to make way for preval
    const [activeDrag, setActiveDrag] = useState();
    const [mounted, setMounted] = useState();
    const [oldDragItem, setOldDragItem] = useState();
    const [oldLayout, setOldLayout] = useState();
    const [oldResizeItem, setOldresizeItem] = useState();
    const [droppingDOMNode, setDroppingDOMNode] = useState();
    const [droppingPosition, setdDroppingPosition] = useState();
    const [children, setChildren] = useState(properties.children);
    const [layout, setLayout] = useState(synchronizeLayoutWithChildren(properties.layout || [], children, cols, compactType, allowOverlap));
    /*     const [compactTypeState, setCompactTypeState] = useState<CompactType>()
          const [propsLayout, setPropsLayout] = useState<Layout>() */
    const dragEnterCounter = useRef(0);
    useEffect(() => {
        setMounted(true);
        // Possibly call back with layout on mount. This should be done after correcting the layout width
        // to ensure we don't rerender with the wrong width.
        onLayoutMaybeChanged(layout, layout);
    }, []);
    useEffect(() => {
        setLayout(synchronizeLayoutWithChildren(properties.layout || [], children, cols, 
        // Legacy support for verticalCompact: false
        compactType, allowOverlap));
    }, [JSON.stringify(properties.layout)]);
    /*   componentDidUpdate(prevProps: Props, prevState: State) {
            if (!this.state.activeDrag) {
                const newLayout = this.state.layout;
                const oldLayout = prevState.layout;
    
                this.onLayoutMaybeChanged(newLayout, oldLayout);
            }
        } */
    useEffect(() => {
        const newLayout = synchronizeLayoutWithChildren(properties.layout || layout, properties.children, properties.cols || cols, properties.compactType, properties.allowOverlap);
        setLayout(newLayout);
        setChildren(properties.children);
    }, [properties.children]);
    /**
     * Calculates a pixel value for the container.
     * @return {String} Container height in pixels.
     */
    const containerHeight = () => {
        if (!autoSize)
            return;
        const nbRow = bottom(layout);
        const containerPaddingY = containerPadding
            ? containerPadding[1]
            : margin[1];
        return (nbRow * rowHeight + (nbRow - 1) * margin[1] + containerPaddingY * 2 + "px");
    };
    /**
     * When dragging starts
     * @param {String} i Id of the child
     * @param {Number} x X position of the move
     * @param {Number} y Y position of the move
     * @param {Event} e The mousedown event
     * @param {Element} node The current dragging DOM element
     */
    const onDragStartFn = properties => {
        const l = getLayoutItem(layout, properties.i);
        if (!l)
            return;
        setOldDragItem(cloneLayoutItem(l));
        setOldLayout(layout);
        return onDragStart(layout, l, l, undefined, properties.data.e, properties.data.node);
    };
    /**
     * Each drag movement create a new dragelement and move the element to the dragged location
     * @param {String} i Id of the child
     * @param {Number} x X position of the move
     * @param {Number} y Y position of the move
     * @param {Event} e The mousedown event
     * @param {Element} node The current dragging DOM element
     */
    const onDragFn = properties => {
        const l = getLayoutItem(layout, properties.i);
        if (!l)
            return;
        // Create placeholder (display only)
        const placeholder = {
            w: l.w,
            h: l.h,
            x: l.x,
            y: l.y,
            z: l.z,
            placeholder: true,
            i: properties.i
        };
        // Move the element to the dragged location.
        const isUserAction = true;
        let newLayout = moveElement({
            layout,
            l,
            x: properties.x,
            y: properties.y,
            isUserAction,
            preventCollision,
            compactType,
            cols,
            allowOverlap
        });
        onDrag(newLayout, oldDragItem, l, placeholder, properties.data.e, properties.data.node);
        setLayout(allowOverlap ? newLayout : compact(newLayout, compactType, cols));
        setActiveDrag(placeholder);
    };
    /**
     * When dragging stops, figure out which position the element is closest to and update its x and y.
     * @param  {String} i Index of the child.
     * @param {Number} x X position of the move
     * @param {Number} y Y position of the move
     * @param {Event} e The mousedown event
     * @param {Element} node The current dragging DOM element
     */
    const onDragStopFn = properties => {
        if (!activeDrag)
            return;
        const l = getLayoutItem(layout, properties.i);
        if (!l)
            return;
        // Move the element here
        const isUserAction = true;
        const movedLayout = moveElement({
            layout,
            l,
            x: properties.x,
            y: properties.y,
            isUserAction,
            preventCollision,
            compactType,
            cols,
            allowOverlap
        });
        if (properties.data.change) {
        }
        onDragStop(movedLayout, oldDragItem, l, undefined, properties.data.e, properties.data.node);
        // Set state
        const newLayout = allowOverlap
            ? movedLayout
            : compact(movedLayout, compactType, cols);
        setActiveDrag(undefined);
        setLayout(newLayout);
        setOldDragItem(undefined);
        setOldLayout(undefined);
        if (properties.data.change) {
            onLayoutChange(newLayout);
        }
    };
    const onLayoutMaybeChanged = (newLayout, oldLayout) => {
        if (!oldLayout) {
            oldLayout = layout;
        }
        if (!deepEqual(oldLayout, newLayout)) {
            onLayoutChange(newLayout);
        }
    };
    const onResizeStartFn = properties => {
        const l = getLayoutItem(layout, properties.i);
        if (!l)
            return;
        setOldresizeItem(cloneLayoutItem(l));
        setOldLayout(layout);
        onResizeStart(layout, l, l, undefined, properties.data.e, properties.data.node);
    };
    const onResizeFn = properties => {
        const [newLayout, l] = withLayoutItem(layout, properties.i, l => {
            // Something like quad tree should be used
            // to find collisions faster
            let hasCollisions;
            if (preventCollision && !allowOverlap) {
                const collisions = getAllCollisions(layout, {
                    ...l,
                    w: properties.x,
                    h: properties.y
                }).filter(layoutItem => layoutItem.i !== l.i);
                hasCollisions = collisions.length > 0;
                // If we're colliding, we need adjust the placeholder.
                if (hasCollisions) {
                    // adjust w && h to maximum allowed space
                    let leastX = Infinity, leastY = Infinity;
                    collisions.forEach(layoutItem => {
                        if (layoutItem.x > l.x)
                            leastX = Math.min(leastX, layoutItem.x);
                        if (layoutItem.y > l.y)
                            leastY = Math.min(leastY, layoutItem.y);
                    });
                    if (Number.isFinite(leastX))
                        l.w = leastX - l.x;
                    if (Number.isFinite(leastY))
                        l.h = leastY - l.y;
                }
            }
            if (!hasCollisions) {
                // Set new width and height.
                l.w = properties.x;
                l.h = properties.y;
            }
            return l;
        });
        // Shouldn't ever happen, but typechecking makes it necessary
        if (!l)
            return;
        // Create placeholder element (display only)
        const placeholder = {
            w: l.w,
            h: l.h,
            x: l.x,
            y: l.y,
            z: l.z,
            static: true,
            i: properties.i
        };
        onResize(newLayout, oldResizeItem, l, placeholder, properties.data.e, properties.data.node);
        // Re-compact the newLayout and set the drag placeholder.
        setLayout(allowOverlap ? newLayout : compact(newLayout, compactType, cols));
        setActiveDrag(placeholder);
    };
    const onResizeStopFn = properties => {
        const l = getLayoutItem(layout, properties.i);
        onResizeStop(layout, oldResizeItem, l, undefined, properties.data.e, properties.data.node);
        // Set state
        const newLayout = allowOverlap
            ? layout
            : compact(layout, compactType, cols);
        setActiveDrag(undefined);
        setLayout(newLayout);
        setOldresizeItem(undefined);
        setOldLayout(undefined);
        onLayoutMaybeChanged(newLayout, oldLayout);
    };
    /**
     * Create a placeholder object.
     * @return {Element} Placeholder div.
     */
    const placeholder = () => {
        if (!activeDrag)
            return;
        // {...activeDrag} is pretty slow, actually
        return (_jsx(GridItem, { w: activeDrag.w, h: activeDrag.h, x: activeDrag.x, y: activeDrag.y, z: activeDrag.z || 0, i: activeDrag.i, className: "react-grid-placeholder", containerWidth: width, cols: cols, margin: margin, containerPadding: containerPadding || margin, maxRows: maxRows, rowHeight: rowHeight, isDraggable: false, isResizable: false, isBounded: false, useCSSTransforms: useCSSTransforms, transformScale: transformScale, children: _jsx("div", {}) }));
    };
    /**
     * Given a grid item, set its style attributes & surround in a <Draggable>.
     * @param  {Element} child React element.
     * @return {Element}       Element wrapped in draggable and properly placed.
     */
    const processGridItem = (child, isDroppingItem) => {
        if (!child || !child.key)
            return;
        const l = getLayoutItem(layout, String(child.key));
        if (!l)
            return;
        // Determine user manipulations possible.
        // If an item is static, it can't be manipulated by default.
        // Any properties defined directly on the grid item will take precedence.
        const draggable = typeof l.isDraggable === "boolean"
            ? l.isDraggable
            : !l.static && isDraggable;
        const resizable = typeof l.isResizable === "boolean"
            ? l.isResizable
            : !l.static && isResizable;
        const resizeHandlesOptions = l.resizeHandles || resizeHandles;
        // isBounded set on child if set on parent, and child is not explicitly false
        const bounded = draggable && isBounded && l.isBounded !== false;
        return (_jsx(GridItem, { containerWidth: width, cols: cols, margin: margin, containerPadding: containerPadding || margin, maxRows: maxRows, rowHeight: rowHeight, cancel: draggableCancel, handle: draggableHandle, onDragStop: onDragStopFn, onDragStart: onDragStartFn, onDrag: onDragFn, onResizeStart: onResizeStartFn, onResize: onResizeFn, onResizeStop: onResizeStopFn, isDraggable: draggable, isResizable: resizable, isBounded: bounded, useCSSTransforms: useCSSTransforms && mounted, usePercentages: !mounted, transformScale: transformScale, w: l.w, h: l.h, x: l.x, y: l.y, z: l.z || 0, i: l.i, minH: l.minH, minW: l.minW, maxH: l.maxH, maxW: l.maxW, static: l.static, droppingPosition: isDroppingItem ? droppingPosition : undefined, resizeHandles: resizeHandlesOptions, resizeHandle: resizeHandle, children: child }));
    };
    // Called while dragging an element. Part of browser native drag/drop API.
    // Native event target might be the layout itself, or an element within the layout.
    const onDragOverFn = e => {
        e.preventDefault(); // Prevent any browser native action
        e.stopPropagation();
        // we should ignore events from layout's children in Firefox
        // to avoid unpredictable jumping of a dropping placeholder
        // FIXME remove this hack
        if (isFirefox &&
            // $FlowIgnore can't figure this out
            !e.nativeEvent.target?.["classList"].contains(layoutClassName)) {
            return false;
        }
        // Allow user to customize the dropping item or short-circuit the drop based on the results
        // of the `onDragOver(e: Event)` callback.
        const onDragOverResult = onDropDragOver?.(e); // TODO fix
        if (onDragOverResult === false) {
            if (droppingDOMNode) {
                removeDroppingPlaceholder();
            }
            return false;
        }
        const finalDroppingItem = { ...droppingItem, ...onDragOverResult };
        // This is relative to the DOM element that this event fired for.
        const { layerX, layerY } = e.nativeEvent; // TODO fix
        const droppingPosition = {
            left: layerX / transformScale,
            top: layerY / transformScale,
            e
        };
        if (!droppingDOMNode) {
            const positionParams = {
                cols,
                margin,
                maxRows,
                rowHeight,
                containerWidth: width,
                containerPadding: containerPadding || margin
            };
            const calculatedPosition = calcXY(positionParams, layerY, layerX, finalDroppingItem.w, finalDroppingItem.h);
            setDroppingDOMNode(_jsx("div", {}, finalDroppingItem.i));
            setdDroppingPosition(droppingPosition);
            setLayout([
                ...layout,
                {
                    ...finalDroppingItem,
                    x: calculatedPosition.x,
                    y: calculatedPosition.y,
                    static: false,
                    isDraggable: true
                }
            ]);
        }
        else if (droppingPosition) {
            const { left, top } = droppingPosition;
            const shouldUpdatePosition = left != layerX || top != layerY;
            if (shouldUpdatePosition) {
                setdDroppingPosition(droppingPosition);
            }
        }
    };
    const removeDroppingPlaceholder = () => {
        const newLayout = compact(layout.filter(l => l.i !== droppingItem.i), compactType, cols, allowOverlap);
        setLayout(newLayout);
        setDroppingDOMNode(undefined);
        setActiveDrag(undefined);
        setdDroppingPosition(undefined);
    };
    const onDragLeaveFn = e => {
        e.preventDefault(); // Prevent any browser native action
        e.stopPropagation();
        dragEnterCounter.current = dragEnterCounter.current - 1;
        // onDragLeave can be triggered on each layout's child.
        // But we know that count of dragEnter and dragLeave events
        // will be balanced after leaving the layout's container
        // so we can increase and decrease count of dragEnter and
        // when it'll be equal to 0 we'll remove the placeholder
        if (dragEnterCounter.current === 0) {
            removeDroppingPlaceholder();
        }
    };
    const onDragEnterFn = e => {
        e.preventDefault(); // Prevent any browser native action
        e.stopPropagation();
        dragEnterCounter.current += 1;
    };
    const onDropFn = e => {
        e.preventDefault(); // Prevent any browser native action
        e.stopPropagation();
        const item = layout.find(l => l.i === droppingItem.i);
        // reset dragEnter counter on drop
        dragEnterCounter.current = 0;
        removeDroppingPlaceholder();
        onDrop(layout, item, e);
    };
    const mergedClassName = clsx(layoutClassName, className);
    const mergedStyle = {
        height: containerHeight(),
        ...style
    };
    return (_jsxs("div", { ref: innerRef, className: mergedClassName, style: mergedStyle, onDrop: isDroppable ? onDropFn : noop, onDragLeave: isDroppable ? onDragLeaveFn : noop, onDragEnter: isDroppable ? onDragEnterFn : noop, onDragOver: isDroppable ? onDragOverFn : noop, children: [children &&
                (Array.isArray(children)
                    ? React.Children.map(children, child => processGridItem(child))
                    : processGridItem(children)) // TODO fix types
            , isDroppable && droppingDOMNode && processGridItem(droppingDOMNode, true), placeholder()] }));
};
ReactGridLayout.displayName = "ReactGridLayout";
export default ReactGridLayout;
//# sourceMappingURL=ReactGridLayout.js.map
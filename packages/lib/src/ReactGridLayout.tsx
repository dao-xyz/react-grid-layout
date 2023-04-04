import * as React from "react";
import { useState, useRef, useEffect } from "react";

import { deepEqual } from "fast-equals";
import clsx from "clsx";
import {
	bottom,
	childrenEqual,
	cloneLayoutItem,
	compact,
	EventCallback,
	getAllCollisions,
	getLayoutItem,
	GridDragStopEvent,
	moveElement,
	noop,
	synchronizeLayoutWithChildren,
	withLayoutItem
} from "./utils";

import { calcXY } from "./calculateUtils";

import GridItem, { GridItemCallback } from "./GridItem";
import type { ReactElement } from "react";

// Types
import type {
	CompactType,
	GridResizeEvent,
	GridDragEvent,
	DragOverEvent,
	Layout,
	DroppingPosition,
	LayoutItem
} from "./utils";

import type { PositionParams } from "./calculateUtils";
import { ResizeHandle, ResizeHandleAxis } from "./types";

type State = {
	activeDrag?: LayoutItem;
	layout: Layout;
	mounted: boolean;
	oldDragItem?: LayoutItem;
	oldLayout?: Layout;
	oldResizeItem?: LayoutItem;
	droppingDOMNode?: ReactElement<any>;
	droppingPosition?: DroppingPosition;
	// Mirrored props
	children: React.ReactNode;
	compactType?: CompactType;
	propsLayout?: Layout;
};

// util

// Defines which resize handles should be rendered (default: 'se')
// Allows for any combination of:
// 's' - South handle (bottom-center)
// 'w' - West handle (left-center)
// 'e' - East handle (right-center)
// 'n' - North handle (top-center)
// 'sw' - Southwest handle (bottom-left)
// 'nw' - Northwest handle (top-left)
// 'se' - Southeast handle (bottom-right)
// 'ne' - Northeast handle (top-right)
export type ResizeHandleAxesType = (
	| "s"
	| "w"
	| "e"
	| "n"
	| "sw"
	| "nw"
	| "se"
	| "ne"
)[];

// Custom component for resize handles
export type ResizeHandleType = React.ReactNode | React.FunctionComponent;

export type Props = React.PropsWithChildren<{
	className: string;
	style: Object;
	width: number;
	autoSize: boolean;
	cols: number;
	draggableCancel: string;
	draggableHandle: string;
	compactType?: CompactType;
	layout: Layout;
	margin?: [number, number];
	containerPadding?: [number, number];
	rowHeight: number;
	maxRows: number;
	isBounded: boolean;
	isDraggable: boolean;
	isResizable: boolean;
	isDroppable: boolean;
	preventCollision: boolean;
	useCSSTransforms: boolean;
	transformScale: number;
	droppingItem: LayoutItem;
	resizeHandles: ResizeHandleAxis[];
	resizeHandle?: ResizeHandle;
	allowOverlap: boolean;

	// Callbacks
	onLayoutChange: (layout: Layout) => void;
	onDrag: EventCallback;
	onDragStart: EventCallback;
	onDragStop: EventCallback;
	onResize: EventCallback;
	onResizeStart: EventCallback;
	onResizeStop: EventCallback;
	onDropDragOver: (
		e: DragOverEvent
	) => ({ w?: number; h?: number } | false) | undefined | void;
	onDrop: (
		layout: Layout,
		item?: LayoutItem,
		e?: React.DragEvent<HTMLDivElement>
	) => void;
	innerRef?: React.Ref<HTMLDivElement>;
}>;

// End Types

const layoutClassName = "react-grid-layout";
let isFirefox = false;
// Try...catch will protect from navigator not existing (e.g. node) or a bad implementation of navigator
try {
	isFirefox = /firefox/i.test(navigator.userAgent);
} catch (e) {
	/* Ignore */
}

/**
 * A reactive, fluid grid layout with draggable, resizable components.
 */

const ReactGridLayout = (properties: Partial<Props>) => {
	const {
		autoSize = true,
		cols = 12,
		className = "",
		style = {},
		draggableHandle = "",
		draggableCancel = "",
		containerPadding = undefined,
		rowHeight = 150,
		maxRows = Infinity, // infinite vertical growth
		margin = [10, 10],
		isBounded = false,
		isDraggable = true,
		isResizable = true,
		allowOverlap = false,
		isDroppable = false,
		useCSSTransforms = true,
		transformScale = 1,
		compactType = "vertical",
		preventCollision = false,
		droppingItem = {
			i: "__dropping-elem__",
			h: 1,
			w: 1
		} as any, // TODO fix
		resizeHandles = ["se"],
		onLayoutChange = noop,
		onDragStart = noop,
		onDrag = noop,
		onDragStop = noop,
		onResizeStart = noop,
		onResize = noop,
		onResizeStop = noop,
		onDrop = noop,
		onDropDragOver = noop,
		width = 0,
		resizeHandle,
		innerRef
	} = properties;

	// Refactored to another module to make way for preval
	const [activeDrag, setActiveDrag] = useState<LayoutItem>();
	const [mounted, setMounted] = useState<boolean>();
	const [oldDragItem, setOldDragItem] = useState<LayoutItem>();
	const [oldLayout, setOldLayout] = useState<Layout>();
	const [oldResizeItem, setOldresizeItem] = useState<LayoutItem>();
	const [droppingDOMNode, setDroppingDOMNode] = useState<ReactElement>();
	const [droppingPosition, setdDroppingPosition] = useState<DroppingPosition>();
	const [children, setChildren] = useState<React.ReactNode>(
		properties.children
	);
	const [layout, setLayout] = useState<Layout>(
		synchronizeLayoutWithChildren(
			properties.layout || [],
			children,
			cols,
			compactType,
			allowOverlap
		)
	);
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
		setLayout(
			synchronizeLayoutWithChildren(
				properties.layout || [],
				children,
				cols,
				// Legacy support for verticalCompact: false
				compactType,
				allowOverlap
			)
		);
	}, [JSON.stringify(properties.layout)]);

	/*   componentDidUpdate(prevProps: Props, prevState: State) {
			if (!this.state.activeDrag) {
				const newLayout = this.state.layout;
				const oldLayout = prevState.layout;
    
				this.onLayoutMaybeChanged(newLayout, oldLayout);
			}
		} */

	useEffect(() => {
		const newLayout = synchronizeLayoutWithChildren(
			properties.layout || layout,
			properties.children,
			properties.cols || cols,
			properties.compactType,
			properties.allowOverlap
		);
		setLayout(newLayout);
		setChildren(properties.children);
	}, [properties.children]);

	/**
	 * Calculates a pixel value for the container.
	 * @return {String} Container height in pixels.
	 */
	const containerHeight = (): string | undefined => {
		if (!autoSize) return;
		const nbRow = bottom(layout);
		const containerPaddingY = containerPadding
			? containerPadding[1]
			: margin[1];
		return (
			nbRow * rowHeight + (nbRow - 1) * margin[1] + containerPaddingY * 2 + "px"
		);
	};

	/**
	 * When dragging starts
	 * @param {String} i Id of the child
	 * @param {Number} x X position of the move
	 * @param {Number} y Y position of the move
	 * @param {Event} e The mousedown event
	 * @param {Element} node The current dragging DOM element
	 */
	const onDragStartFn: GridItemCallback<GridDragEvent> = properties => {
		const l = getLayoutItem(layout, properties.i);
		if (!l) return;

		setOldDragItem(cloneLayoutItem(l));
		setOldLayout(layout);
		return onDragStart(
			layout,
			l,
			l,
			undefined,
			properties.data.e,
			properties.data.node
		);
	};

	/**
	 * Each drag movement create a new dragelement and move the element to the dragged location
	 * @param {String} i Id of the child
	 * @param {Number} x X position of the move
	 * @param {Number} y Y position of the move
	 * @param {Event} e The mousedown event
	 * @param {Element} node The current dragging DOM element
	 */
	const onDragFn: GridItemCallback<GridDragEvent> = properties => {
		const l = getLayoutItem(layout, properties.i);
		if (!l) return;

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

		onDrag(
			newLayout,
			oldDragItem,
			l,
			placeholder,
			properties.data.e,
			properties.data.node
		);

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
	const onDragStopFn: GridItemCallback<GridDragStopEvent> = properties => {
		if (!activeDrag) return;

		const l = getLayoutItem(layout, properties.i);
		if (!l) return;

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

		onDragStop(
			movedLayout,
			oldDragItem,
			l,
			undefined,
			properties.data.e,
			properties.data.node
		);

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

	const onLayoutMaybeChanged = (newLayout: Layout, oldLayout?: Layout) => {
		if (!oldLayout) {
			oldLayout = layout;
		}
		if (!deepEqual(oldLayout, newLayout)) {
			onLayoutChange(newLayout);
		}
	};

	const onResizeStartFn: GridItemCallback<GridResizeEvent> = properties => {
		const l = getLayoutItem(layout, properties.i);
		if (!l) return;

		setOldresizeItem(cloneLayoutItem(l));
		setOldLayout(layout);
		onResizeStart(
			layout,
			l,
			l,
			undefined,
			properties.data.e,
			properties.data.node
		);
	};

	const onResizeFn: GridItemCallback<GridResizeEvent> = properties => {
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
					let leastX = Infinity,
						leastY = Infinity;
					collisions.forEach(layoutItem => {
						if (layoutItem.x > l.x) leastX = Math.min(leastX, layoutItem.x);
						if (layoutItem.y > l.y) leastY = Math.min(leastY, layoutItem.y);
					});

					if (Number.isFinite(leastX)) l.w = leastX - l.x;
					if (Number.isFinite(leastY)) l.h = leastY - l.y;
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
		if (!l) return;

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
		console.log(placeholder)

		onResize(
			newLayout,
			oldResizeItem,
			l,
			placeholder,
			properties.data.e,
			properties.data.node
		);

		// Re-compact the newLayout and set the drag placeholder.
		setLayout(allowOverlap ? newLayout : compact(newLayout, compactType, cols));
		setActiveDrag(placeholder);
	};

	const onResizeStopFn: GridItemCallback<GridResizeEvent> = properties => {
		const l = getLayoutItem(layout, properties.i);
		onResizeStop(
			layout,
			oldResizeItem,
			l,
			undefined,
			properties.data.e,
			properties.data.node
		);

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
	const placeholder = (): ReactElement<any> | undefined => {
		if (!activeDrag) return;

		// {...activeDrag} is pretty slow, actually
		return (
			<GridItem
				w={activeDrag.w}
				h={activeDrag.h}
				x={activeDrag.x}
				y={activeDrag.y}
				z={activeDrag.z || 0}
				i={activeDrag.i}
				aspectRatio={activeDrag.aspectRatio}
				className="react-grid-placeholder"
				containerWidth={width}
				cols={cols}
				margin={margin}
				containerPadding={containerPadding || margin}
				maxRows={maxRows}
				rowHeight={rowHeight}
				isDraggable={false}
				isResizable={false}
				isBounded={false}
				useCSSTransforms={useCSSTransforms}
				transformScale={transformScale}
			>
				<div />
			</GridItem>
		);
	};

	/**
	 * Given a grid item, set its style attributes & surround in a <Draggable>.
	 * @param  {Element} child React element.
	 * @return {Element}       Element wrapped in draggable and properly placed.
	 */
	const processGridItem = (
		child: ReactElement<any>,
		isDroppingItem?: boolean
	): ReactElement<any> | undefined => {
		if (!child || !child.key) return;
		const l = getLayoutItem(layout, String(child.key));
		if (!l) return;

		// Determine user manipulations possible.
		// If an item is static, it can't be manipulated by default.
		// Any properties defined directly on the grid item will take precedence.
		const draggable =
			typeof l.isDraggable === "boolean"
				? l.isDraggable
				: !l.static && isDraggable;
		const resizable =
			typeof l.isResizable === "boolean"
				? l.isResizable
				: !l.static && isResizable;
		const resizeHandlesOptions = l.resizeHandles || resizeHandles;

		// isBounded set on child if set on parent, and child is not explicitly false
		const bounded = draggable && isBounded && l.isBounded !== false;

		return (
			<GridItem
				containerWidth={width}
				cols={cols}
				margin={margin}
				containerPadding={containerPadding || margin}
				maxRows={maxRows}
				rowHeight={rowHeight}
				cancel={draggableCancel}
				handle={draggableHandle}
				onDragStop={onDragStopFn}
				onDragStart={onDragStartFn}
				onDrag={onDragFn}
				onResizeStart={onResizeStartFn}
				onResize={onResizeFn}
				onResizeStop={onResizeStopFn}
				isDraggable={draggable}
				isResizable={resizable}
				isBounded={bounded}
				useCSSTransforms={useCSSTransforms && mounted}
				usePercentages={!mounted}
				transformScale={transformScale}
				w={l.w}
				h={l.h}
				x={l.x}
				y={l.y}
				z={l.z || 0}
				i={l.i}
				minH={l.minH}
				minW={l.minW}
				maxH={l.maxH}
				maxW={l.maxW}
				aspectRatio={l.aspectRatio}
				static={l.static}
				droppingPosition={isDroppingItem ? droppingPosition : undefined}
				resizeHandles={resizeHandlesOptions}
				resizeHandle={resizeHandle}
			>
				{child}
			</GridItem>
		);
	};

	// Called while dragging an element. Part of browser native drag/drop API.
	// Native event target might be the layout itself, or an element within the layout.
	const onDragOverFn: React.DragEventHandler<HTMLDivElement> = e => {
		e.preventDefault(); // Prevent any browser native action
		e.stopPropagation();

		// we should ignore events from layout's children in Firefox
		// to avoid unpredictable jumping of a dropping placeholder
		// FIXME remove this hack
		if (
			isFirefox &&
			// $FlowIgnore can't figure this out
			!e.nativeEvent.target?.["classList"].contains(layoutClassName)
		) {
			return false;
		}

		// Allow user to customize the dropping item or short-circuit the drop based on the results
		// of the `onDragOver(e: Event)` callback.
		const onDragOverResult = onDropDragOver?.(e as any as DragOverEvent); // TODO fix
		if (onDragOverResult === false) {
			if (droppingDOMNode) {
				removeDroppingPlaceholder();
			}
			return false;
		}
		const finalDroppingItem = { ...droppingItem, ...onDragOverResult };

		// This is relative to the DOM element that this event fired for.
		const { layerX, layerY } = e.nativeEvent as any; // TODO fix
		const droppingPosition = {
			left: layerX / transformScale,
			top: layerY / transformScale,
			e
		};

		if (!droppingDOMNode) {
			const positionParams: PositionParams = {
				cols,
				margin,
				maxRows,
				rowHeight,
				containerWidth: width,
				containerPadding: containerPadding || margin
			};

			const calculatedPosition = calcXY(
				positionParams,
				layerY,
				layerX,
				finalDroppingItem.w,
				finalDroppingItem.h
			);

			setDroppingDOMNode(<div key={finalDroppingItem.i} />);
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
		} else if (droppingPosition) {
			const { left, top } = droppingPosition;
			const shouldUpdatePosition = left != layerX || top != layerY;
			if (shouldUpdatePosition) {
				setdDroppingPosition(droppingPosition);
			}
		}
	};

	const removeDroppingPlaceholder: () => void = () => {
		const newLayout = compact(
			layout.filter(l => l.i !== droppingItem.i),
			compactType,
			cols,
			allowOverlap
		);

		setLayout(newLayout);
		setDroppingDOMNode(undefined);
		setActiveDrag(undefined);
		setdDroppingPosition(undefined);
	};

	const onDragLeaveFn: React.DragEventHandler<HTMLDivElement> = e => {
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

	const onDragEnterFn: React.DragEventHandler<HTMLDivElement> = e => {
		e.preventDefault(); // Prevent any browser native action
		e.stopPropagation();
		dragEnterCounter.current += 1;
	};

	const onDropFn: React.DragEventHandler<HTMLDivElement> = e => {
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

	return (
		<div
			ref={innerRef}
			className={mergedClassName}
			style={mergedStyle}
			onDrop={isDroppable ? onDropFn : noop}
			onDragLeave={isDroppable ? onDragLeaveFn : noop}
			onDragEnter={isDroppable ? onDragEnterFn : noop}
			onDragOver={isDroppable ? onDragOverFn : noop}
		>
			{
				children &&
				(Array.isArray(children)
					? React.Children.map(children, child => processGridItem(child))
					: processGridItem(children as any)) // TODO fix types
			}
			{isDroppable && droppingDOMNode && processGridItem(droppingDOMNode, true)}
			{placeholder()}
		</div>
	);
};
ReactGridLayout.displayName = "ReactGridLayout";
export default ReactGridLayout;

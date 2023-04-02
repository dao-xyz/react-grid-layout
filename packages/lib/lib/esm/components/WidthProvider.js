import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useState, useEffect } from "react";
import clsx from "clsx";
const layoutClassName = "react-grid-layout";
/*
 * A simple HOC that provides facility for listening to container resizes.
 *
 * The Flow type is pretty janky here. I can't just spread `WPProps` into this returned object - I wish I could - but it triggers
 * a flow bug of some sort that causes it to stop typechecking.
 */
export const WidthProvideRGL = (ComposedComponent) => {
    return (props) => {
        const elementRef = useRef(null);
        const [mounted, setMounted] = useState(false);
        const [state, setState] = useState({
            width: 1280
        });
        const { measureBeforeMount = false } = props;
        useEffect(() => {
            setMounted(true);
            window.addEventListener("resize", onWindowResize);
            // Call to properly set the breakpoint and resize the elements.
            // Note that if you're doing a full-width element, this can get a little wonky if a scrollbar
            // appears because of the grid. In that case, fire your own resize event, or set `overflow: scroll` on your body.
            onWindowResize();
            return () => {
                setMounted(false);
                window.removeEventListener("resize", onWindowResize);
            };
        }, []);
        const onWindowResize = () => {
            if (!mounted)
                return;
            const node = elementRef.current; // Flow casts this to Text | Element
            // fix: grid position error when node or parentNode display is none by window resize
            // #924 #1084
            if (node instanceof HTMLElement && node.offsetWidth) {
                setState({ width: node.offsetWidth });
            }
        };
        if (measureBeforeMount && !mounted) {
            return (_jsx("div", { className: clsx(props.className, layoutClassName), style: props.style, 
                // $FlowIgnore ref types
                ref: elementRef }));
        }
        return _jsx(ComposedComponent, { ...props, innerRef: elementRef, ...state });
    };
};
//# sourceMappingURL=WidthProvider.js.map
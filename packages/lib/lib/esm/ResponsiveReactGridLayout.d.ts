/// <reference types="react" />
import { type ResponsiveLayout, type OnLayoutChangeCallback, type Breakpoints } from "./responsiveUtils";
import { Props } from "./ReactGridLayout";
type Modify<T, R> = Omit<T, keyof R> & R;
export type ResponsiveProps<Breakpoint extends string = string> = Modify<Props, {
    breakpoint?: Breakpoint;
    breakpoints: Breakpoints<Breakpoint>;
    cols: Record<Breakpoint, number>;
    layouts: ResponsiveLayout<Breakpoint>;
    width: number;
    margin: Record<Breakpoint, [number, number]> | [number, number] | undefined;
    containerPadding: Record<Breakpoint, [number, number]> | [number, number] | undefined;
    onBreakpointChange: (Breakpoint: any, cols: number) => void;
    onLayoutChange: OnLayoutChangeCallback;
    onWidthChange: (containerWidth: number, margin: [number, number], cols: number, containerPadding?: [number, number]) => void;
}>;
export declare const ResponsiveReactGridLayout: (properties: Partial<ResponsiveProps>) => JSX.Element;
export {};

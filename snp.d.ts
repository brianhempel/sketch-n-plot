declare const IPython: any;
declare const Jupyter: any;
interface Array<T> {
    addAsSet(elem: T): Array<T>;
    removeAsSet(elem: T): Array<T>;
    dedup(): Array<T>;
    partition(predicate: (elem: T) => boolean): [Array<T>, Array<T>];
    intersperse<A>(sep: A): Array<T | A>;
    takeWhile(predicate: (elem: T) => boolean): Array<T>;
}
declare function equal_by_json(a: any, b: any): boolean;
declare function select(snp_state: any, shape: any): void;
declare function deselect_all(snp_state: any): void;
declare function relativeTopLeft(el: any, container: any): number[];
declare function relativeBoundingRect(el: any, container: any): DOMRect;
declare function get_cells_up_through(cell: any): any;
declare function default_code_and_arg_for_type(type: any): any;
declare class SNPGlobals {
    static ellipses_svg_html: string;
    static dial_svg_counter: number;
    static int_to_arg_kind: string[];
}
declare function dial_svg_html(): string;
declare function to_code(node: any): any;
declare function make_el(tag: any, attrs: any, style: any, listeners: any, children: any): any;
declare type Dropdown = HTMLDivElement & ToCodeAble & {
    selected_el: HTMLElement;
};
declare function make_dropdown(els: any, options?: {
    selected_el: any;
}): Dropdown;
declare function arg_to_widget(sync_editor_and_output: any, code: any, arg_type: any, code_type: any): HTMLSpanElement | Text;
declare function make_dial_and_num(sync_editor_and_output: any, code: any, change_per_px: any): HTMLSpanElement;
declare function siblingsAfter(node: any): any[];
declare function siblingsBefore(node: any): any[];
declare function make_arg_el(sync_editor_and_output: any, arg: any, options?: {
    positional: boolean;
}): HTMLSpanElement;
declare type ToCodeAble = {
    to_code: () => string;
};
declare type EllipsesEl = HTMLSpanElement & ToCodeAble & {
    hidden_arg_els: HTMLElement[];
};
declare function make_ellipses_el(sync_editor_and_output: any, hidden_arg_els: any): EllipsesEl;
declare function compare_qualified_names(name1: any, name2: any): number;
declare function hide(elem: any): void;
declare function show(elem: any): void;
declare function infer_types_and_attach_widgets(snp_state: any): void;
declare function place_inspector(snp_state: any): void;
declare function place_over_shape(snp_state: any, shape: any, el: any): void;
declare function arg_defaults_from_callee_type(callee: any): any;
declare function hard_rerun(snp_state: any): void;
declare function make_call_widget(callee: any, given_positional_args: any, given_keyword_args: any, callee_code: any, code_mirror: any, mark: any, snp_state: any): HTMLDivElement;
declare function loced_widgets_from_code(cell_items: any, cell_lineno: any, cm: any, snp_state: any): any[];
declare function tree_path(root: any, target: any): any;
declare function el_by_path(root: any, path: any): any;
declare function replace_hover_regions(snp_state: any, new_svg_str: any): void;
declare function redraw_cell(snp_state: any): void;
declare function attach_snp(snp_outer: any): void;

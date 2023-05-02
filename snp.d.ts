declare const IPython: any;
declare const Jupyter: any;
declare var ellipses_svg_html: string;
declare var dial_svg_counter: number;
declare var int_to_arg_kind: Array<string>;
declare var default_value_from_name: Array<[string, any, string]>;
declare var pre_cell_execute_handlers_to_first_unbind_when_this_file_is_rerun: Function[];
declare var select_lineno_after_execute: number | undefined;
interface Array<T> {
    addAsSet(elem: T): Array<T>;
    removeAsSet(elem: T): Array<T>;
    dedup(): Array<T>;
    partition(predicate: (elem: T) => boolean): [Array<T>, Array<T>];
    intersperse<A>(sep: A): Array<T | A>;
    takeWhile(predicate: (elem: T) => boolean): Array<T>;
}
declare function equal_by_json(a: any, b: any): boolean;
declare type SelectedItem = {
    name: string;
} | {
    func_code: string;
    call_num: number;
} | undefined;
declare function selected_shapes(snp_state: {
    canvas_selection: SelectedItem;
    hover_regions_svg: () => any;
}): any[];
declare function select(snp_state: any, key: any): void;
declare function shape_selection_key(shape: any): SelectedItem;
declare function deselect_all(snp_state: any): void;
declare function relativeTopLeft(el: any, container: any): number[];
declare function relativeBoundingRect(el: any, container: any): DOMRect;
declare function get_cells_up_through(cell: any): any;
declare function default_code_and_code_type_for_type(type: any, name?: string | undefined): [string, any];
declare function dial_svg_html(): string;
declare function to_code(node: any): any;
declare function make_el(tag: any, attrs: any, style: any, listeners: any, children: any): any;
declare type Dropdown = HTMLDivElement & ToCodeAble & {
    selected_el: HTMLElement;
};
declare function make_dropdown(sync_editor_and_output: any, els: any, options?: {
    selected_el: any;
}): Dropdown;
declare function arg_to_widget(sync_editor_and_output: any, code: string, arg_type: any, code_type: any, type_compatible_local_names: string[]): Node;
declare function arg_to_widgets(sync_editor_and_output: any, code: string, arg_type: any, code_type: any): Node[];
declare function make_dial_and_num(sync_editor_and_output: any, code: any, change_per_px: any): HTMLSpanElement;
declare function siblingsAfter(node: any): any[];
declare function siblingsBefore(node: any): any[];
declare function make_arg_el(sync_editor_and_output: any, arg: Arg, options?: {
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
declare function place_inspector(snp_state: any): void;
declare function place_over_shape(snp_state: any, shape: any, el: any): void;
interface Arg {
    name: string;
    kind: string;
    code: string;
    type: any;
    code_type: any | undefined;
    type_compatible_local_names: string[];
}
declare function arg_defaults_from_callee_type(callee: any): Arg[];
declare function hard_rerun(snp_state: any): void;
declare function make_call_widget(callee: any, given_positional_args: Arg[], given_keyword_args: Arg[], callee_code: string, code_mirror: any, mark: any, snp_state: any): HTMLDivElement;
declare function loced_widgets_from_code(cell_items: any, cell_lineno: any, cm: any, snp_state: any): any[];
declare function replace_hover_regions(snp_state: any, new_svg_str: any): void;
declare function redraw_cell(snp_state: any): void;
declare function attach_snp(snp_outer: any, cell_lineno: any, provenance_is_off_by_n_lines: any, user_call_info: any, sidebar_stuff: any): void;
declare function shortest_qualified_name(names: any): any;
declare function build_sidebar(snp_state: any, sidebar_stuff: any): void;
declare function attach_widgets_to_hover_regions(snp_state: any, user_call_info: any): void;
declare function make_new_code_button(cm: any, receiver_name: string, method_name: string, method_type: any, snp_state: any): any;

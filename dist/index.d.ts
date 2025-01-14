import Base from 'inquirer/lib/prompts/base';
import { Question, Transformer } from 'inquirer';
import Paginator from 'inquirer/lib/utils/paginator';
import { Node } from './types';
declare type FileTreeSelectionPromptOptions<T = any> = Pick<Question<T>, 'type' | 'name' | 'message' | 'filter' | 'validate' | 'default'> & {
    transformer?: Transformer<T>;
    /**
     * count of items show in terminal. default: 10
     */
    pageSize?: number;
    /**
     * if true, will only show directory. Default: false
     */
    onlyShowDir?: boolean;
    /**
     * if true, will only show valid files (if validate is provided). Default: false.
     */
    onlyShowValid?: boolean;
    /**
     * if true, will hide children of valid directories (if validate is provided). Default: false.
     */
    hideChildrenOfValid?: boolean;
    /**
     * if true, will enable to select multiple files. Default: false.
     */
    multiple?: boolean;
    /**
     * Default to be current process.cwd()
     */
    root?: string;
    /**
     * Hide root, Default: false
     */
    hideRoot?: boolean;
    selectedList?: string[];
    /**
     * show `..` in inside root dir, and you the user can press space on it to go upper directory. Default: false
     */
    enableGoUpperDirectory?: boolean;
};
declare module 'inquirer' {
    interface QuestionMap<T> {
        fileTreeSelection: Omit<FileTreeSelectionPromptOptions<T>, 'type'> & {
            type: 'file-tree-selection';
        };
    }
}
/**
 * type: string
 * onlyShowDir: boolean (default: false)
 */
declare class FileTreeSelectionPrompt extends Base<FileTreeSelectionPromptOptions & {
    states: any;
}> {
    rootNode: Node;
    firstRender: boolean;
    shownList: string[] | Record<string, any>;
    selectedList: string[] | Record<string, any>;
    paginator: Paginator;
    done: (...args: any[]) => void;
    active: Node;
    get fileTree(): Node | {
        children: Node[];
    };
    constructor(questions: any, rl: any, answers: any);
    /**
     * Start the Inquiry session
     * @param  {Function} cb  Callback when prompt is done
     * @return {this}
     */
    _run(cb: any): Promise<this>;
    renderFileTree(root?: Node | {
        children: Node[];
    }, indent?: number): string;
    prepareChildren(node: Node): any;
    /**
     * Render the prompt to screen
     * @return {FileTreeSelectionPrompt} self
     */
    render(error?: any): void;
    onEnd(state: any): void;
    onError(state: any): void;
    /**
     * When user press `enter` key
     */
    onSubmit(state: any): void;
    moveActive(distance?: number): void;
    /**
     * When user press a key
     */
    onUpKey(): void;
    onDownKey(): void;
    onLeftKey(): void;
    onRigthKey(): void;
    onSpaceKey(triggerByTab?: boolean): Promise<void>;
}
export default FileTreeSelectionPrompt;

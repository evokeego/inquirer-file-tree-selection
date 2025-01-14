'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * `file-tree-slection` type prompt
 */
const chalk = require('chalk');
const figures = require('figures');
const cliCursor = require('cli-cursor');
const path = require('path');
const fs = require('fs');
const { fromEvent } = require('rxjs');
const { filter, share, map, takeUntil } = require('rxjs/operators');
const observe = require('inquirer/lib/utils/events');
const base_1 = __importDefault(require("inquirer/lib/prompts/base"));
const paginator_1 = __importDefault(require("inquirer/lib/utils/paginator"));
const utils_1 = require("./utils");
const upperDir_1 = require("./upperDir");
/**
 * type: string
 * onlyShowDir: boolean (default: false)
 */
class FileTreeSelectionPrompt extends base_1.default {
    constructor(questions, rl, answers) {
        super(questions, rl, answers);
        const root = path.resolve(process.cwd(), this.opt.root || '.');
        const rootNode = {
            path: root,
            type: 'directory',
            name: '.(root directory)',
            _rootNode: true
        };
        this.rootNode = rootNode;
        this.shownList = [];
        this.firstRender = true;
        this.opt = Object.assign(Object.assign({
            default: null,
            pageSize: 10,
            onlyShowDir: false,
            multiple: false,
            states: false,
        }, this.opt), { selectedList: this.opt.selectedList || this.opt.default });
        // Make sure no default is set (so it won't be printed)
        // this.opt.default = null;
        this.selectedList = this.opt.selectedList;
        if (this.selectedList) {
            !Array.isArray(this.selectedList) && (this.selectedList = [this.selectedList]);
        }
        else {
            if (this.opt.states) {
                this.selectedList = {};
            }
            else {
                this.selectedList = [];
            }
        }
        this.paginator = new paginator_1.default(this.screen);
    }
    get fileTree() {
        if (this.opt.hideRoot) {
            return this.rootNode;
        }
        return {
            children: [this.rootNode]
        };
    }
    /**
     * Start the Inquiry session
     * @param  {Function} cb  Callback when prompt is done
     * @return {this}
     */
    _run(cb) {
        return __awaiter(this, void 0, void 0, function* () {
            this.done = cb;
            var events = observe(this.rl);
            var validation = this.handleSubmitEvents(events.line.pipe(map(() => this.active.path)));
            validation.success.forEach(this.onSubmit.bind(this));
            validation.error.forEach(this.onError.bind(this));
            events.normalizedUpKey
                .pipe(takeUntil(validation.success))
                .forEach(this.onUpKey.bind(this));
            events.normalizedDownKey
                .pipe(takeUntil(validation.success))
                .forEach(this.onDownKey.bind(this));
            events.keypress.pipe(filter(({ key }) => key.name === 'right'), share())
                .pipe(takeUntil(validation.success))
                .forEach(this.onRigthKey.bind(this));
            events.keypress.pipe(filter(({ key }) => key.name === 'left'), share())
                .pipe(takeUntil(validation.success))
                .forEach(this.onLeftKey.bind(this));
            events.spaceKey
                .pipe(takeUntil(validation.success))
                .forEach(this.onSpaceKey.bind(this, false));
            function normalizeKeypressEvents(value, key) {
                return { value: value, key: key || {} };
            }
            fromEvent(this.rl.input, 'keypress', normalizeKeypressEvents)
                .pipe(filter(({ key }) => key && key.name === 'tab'), share())
                .pipe(takeUntil(validation.success))
                .forEach(this.onSpaceKey.bind(this, true));
            cliCursor.hide();
            if (this.firstRender) {
                const rootNode = this.rootNode;
                yield this.prepareChildren(rootNode);
                rootNode.open = true;
                this.active = this.active || rootNode.children[0];
                this.prepareChildren(this.active);
                this.render();
            }
            return this;
        });
    }
    renderFileTree(root = this.fileTree, indent = 2) {
        const children = root.children || [];
        let output = '';
        const transformer = this.opt.transformer;
        const isFinal = this.status === 'answered';
        let showValue;
        children.forEach(itemPath => {
            if (this.opt.onlyShowDir && itemPath.type !== 'directory') {
                return;
            }
            this.shownList.push(itemPath);
            let prefix = itemPath.type === 'directory'
                ? itemPath.open
                    ? figures.arrowDown + ' '
                    : figures.arrowRight + ' '
                : itemPath === this.active
                    ? figures.play + ' '
                    : '';
            // when multiple is true, add radio icon at prefix
            if (this.opt.multiple) {
                if (this.opt.states) {
                    prefix += itemPath.path in this.selectedList ? this.opt.states.find((state) => state.state == this.selectedList[itemPath.path]).label : figures.radioOff;
                }
                else {
                    prefix += this.selectedList.includes(itemPath.path) ? figures.radioOn : figures.radioOff;
                }
                prefix += ' ';
            }
            const safeIndent = (indent - prefix.length + 2) > 0
                ? indent - prefix.length + 2
                : 0;
            if (itemPath.name == '..') {
                showValue = `${' '.repeat(safeIndent)}${prefix}..(Press \`Space\` to go parent directory)\n`;
            }
            else if (transformer) {
                const transformedValue = transformer(itemPath.path, this.answers, { isFinal });
                showValue = ' '.repeat(safeIndent) + prefix + transformedValue + '\n';
            }
            else {
                showValue = ' '.repeat(safeIndent) + prefix + itemPath.name + (itemPath.type === 'directory' ? path.sep : '') + '\n';
            }
            if (itemPath === this.active && itemPath.isValid) {
                output += chalk.cyan(showValue);
            }
            else if (itemPath === this.active && !itemPath.isValid) {
                output += chalk.red(showValue);
            }
            else {
                output += showValue;
            }
            if (itemPath.open) {
                output += this.renderFileTree(itemPath, indent + 2);
            }
        });
        return output;
    }
    prepareChildren(node) {
        return __awaiter(this, void 0, void 0, function* () {
            const parentPath = node.path;
            try {
                if (node.name == '..' || !fs.lstatSync(parentPath).isDirectory() || node.children || node.open === true) {
                    return;
                }
                const children = fs.readdirSync(parentPath, { withFileTypes: true }).map(item => {
                    return {
                        parent: node,
                        type: item.isDirectory() ? 'directory' : 'file',
                        name: item.name,
                        path: path.resolve(parentPath, item.name)
                    };
                });
                node.children = children;
            }
            catch (e) {
                // maybe for permission denied, we cant read the dir
                // do nothing here
            }
            const validate = this.opt.validate;
            const filter = (val) => __awaiter(this, void 0, void 0, function* () {
                if (!this.opt.filter) {
                    return val;
                }
                return yield this.opt.filter(val, this.answers);
            });
            if (validate) {
                const addValidity = (fileObj) => __awaiter(this, void 0, void 0, function* () {
                    const isValid = yield validate(yield filter(fileObj.path), this.answers);
                    fileObj.isValid = false;
                    if (isValid === true) {
                        if (this.opt.onlyShowDir) {
                            if (fileObj.type == 'directory') {
                                fileObj.isValid = true;
                            }
                        }
                        else {
                            fileObj.isValid = true;
                        }
                    }
                    if (fileObj.children) {
                        if (this.opt.hideChildrenOfValid && fileObj.isValid) {
                            fileObj.children.length = 0;
                        }
                        const children = fileObj.children.map(x => x);
                        for (let index = 0, length = children.length; index < length; index++) {
                            const child = children[index];
                            yield addValidity(child);
                            if (child.isValid) {
                                fileObj.hasValidChild = true;
                            }
                            if (this.opt.onlyShowValid && !child.hasValidChild && !child.isValid) {
                                const spliceIndex = fileObj.children.indexOf(child);
                                fileObj.children.splice(spliceIndex, 1);
                            }
                        }
                    }
                });
                yield addValidity(node);
            }
            if (this.opt.enableGoUpperDirectory && node === this.rootNode) {
                this.rootNode.children.unshift((0, upperDir_1.getUpperDirNode)(this.rootNode.path));
            }
            // When it's single selection and has default value, we should expand to the default file.
            if (this.firstRender && this.opt.default && !this.opt.multiple) {
                const defaultPath = this.opt.default;
                const founded = node.children.find(item => {
                    if (item.name === '..') {
                        return false;
                    }
                    if (item.path === defaultPath) {
                        return true;
                    }
                    if (defaultPath.includes(`${item.path}${path.sep}`)) {
                        return true;
                    }
                });
                if (founded) {
                    if (founded.path === defaultPath) {
                        this.active = founded;
                        let parent = founded.parent;
                        while (parent && !parent._rootNode) {
                            parent.open = true;
                            parent = parent.parent;
                        }
                    }
                    else {
                        return yield this.prepareChildren(founded);
                    }
                }
            }
            !this.firstRender && this.render();
        });
    }
    /**
     * Render the prompt to screen
     * @return {FileTreeSelectionPrompt} self
     */
    render(error) {
        // Render question
        var message = this.getQuestion();
        if (this.firstRender) {
            message += chalk.dim('(Use arrow keys, Use space to toggle folder)');
        }
        if (this.status === 'answered') {
            message += chalk.cyan(this.opt.multiple ? JSON.stringify(this.selectedList) : this.active.path);
        }
        else {
            this.shownList = [];
            const fileTreeStr = this.renderFileTree();
            message += '\n' + this.paginator.paginate(fileTreeStr + '----------------', this.shownList.indexOf(this.active), this.opt.pageSize);
        }
        let bottomContent;
        if (error) {
            bottomContent = '\n' + chalk.red('>> ') + error;
        }
        this.firstRender = false;
        this.screen.render(message, bottomContent);
    }
    onEnd(state) {
        this.status = 'answered';
        // this.answer = state.value;
        // Re-render prompt
        this.render();
        this.screen.done();
        this.done(state.value);
    }
    onError(state) {
        this.render(state.isValid);
    }
    /**
     * When user press `enter` key
     */
    onSubmit(state) {
        this.status = 'answered';
        this.render();
        this.screen.done();
        cliCursor.show();
        this.done(this.opt.multiple ? this.selectedList : state.value);
    }
    moveActive(distance = 0) {
        const currentIndex = this.shownList.indexOf(this.active);
        let index = currentIndex + distance;
        if (index >= this.shownList.length) {
            index = 0;
        }
        else if (index < 0) {
            index = this.shownList.length - 1;
        }
        this.active = this.shownList[index];
        if (this.active.name !== '..') {
            this.prepareChildren(this.active);
        }
        this.render();
    }
    /**
     * When user press a key
     */
    onUpKey() {
        this.moveActive(-1);
    }
    onDownKey() {
        this.moveActive(1);
    }
    onLeftKey() {
        if ((this.active.type === 'file' || !this.active.open) && this.active.parent) {
            this.active = this.active.parent;
        }
        this.active.open = false;
        this.render();
    }
    onRigthKey() {
        this.active.open = true;
        this.render();
    }
    onSpaceKey(triggerByTab = false) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!triggerByTab && this.active.name == '..' && (0, utils_1.isSubPath)(this.active.path, this.rootNode.path)) {
                this.rootNode = Object.assign(Object.assign({}, this.active), { name: path.basename(this.active.path) });
                yield this.prepareChildren(this.rootNode);
                this.active = (_a = this.rootNode.children) === null || _a === void 0 ? void 0 : _a[0];
                this.firstRender = true;
                this.rootNode.open = true;
                this.render();
                this.firstRender = false;
                return;
            }
            if (!triggerByTab && this.opt.multiple) {
                if (this.active.isValid === false) {
                    return;
                }
                if (this.opt.states) {
                    if (this.active.path in this.selectedList) {
                        let nextStateIndex = 1 + this.opt.states.findIndex((state) => state.state == this.selectedList[this.active.path]);
                        if (nextStateIndex < this.opt.states.length) {
                            this.selectedList[this.active.path] = this.opt.states[nextStateIndex].state;
                        }
                        else {
                            delete this.selectedList[this.active.path];
                        }
                    }
                    else {
                        this.selectedList[this.active.path] = this.opt.states[0].state;
                    }
                }
                else {
                    if (this.selectedList.includes(this.active.path)) {
                        this.selectedList.splice(this.selectedList.indexOf(this.active.path), 1);
                    }
                    else {
                        this.selectedList.push(this.active.path);
                    }
                }
                this.render();
                return;
            }
            if (this.active.children && this.active.children.length === 0) {
                return;
            }
            this.active.open = !this.active.open;
            this.render();
        });
    }
}
module.exports = FileTreeSelectionPrompt;
exports.default = FileTreeSelectionPrompt;

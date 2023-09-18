import * as vscode from 'vscode';
import * as path from 'path';
import * as utilities from '../utilities';

interface Entry {
    uri: vscode.Uri;
    type: vscode.FileType;
}

export class FileSystemProvider implements vscode.TreeDataProvider<Entry> {

    private left: vscode.Uri;
    private right: vscode.Uri;

    constructor(left: vscode.Uri, right: vscode.Uri) {
        this.left = left;
        this.right = right;
    }

    stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
        return this._stat(uri.fsPath);
    }

    async _stat(path: string): Promise<vscode.FileStat> {
        return new utilities.FileStat(await utilities.stat(path));
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
        return this._readDirectory(uri);
    }

    async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        const children = await utilities.readdir(uri.fsPath);

        const result: [string, vscode.FileType][] = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const stat = await this._stat(path.join(uri.fsPath, child));
            result.push([child, stat.type]);
        }

        return Promise.resolve(result);
    }

    readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
        return utilities.readfile(uri.fsPath);
    }

    async getChildren(element?: Entry): Promise<Entry[]> {
        if (element) {
            const children = await this.readDirectory(element.uri);
            return children.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(element.uri.fsPath, name)), type }));
        }

        var entries: Entry[] = [];
        var visited: Set<string> = new Set<string>();

        if (this.left) {
            const children = await this.readDirectory(this.left);
            children.map(([name, type]) => {
                visited.add(name);
                let uri: vscode.Uri = vscode.Uri.file(path.join(this.right.fsPath, name));
                entries.push({ uri: uri, type });
            });
        }

        if (this.right) {
            const children = await this.readDirectory(this.right);
            children.map(([name, type]) => {
                if (!visited.has(name)) {
                    let uri: vscode.Uri = vscode.Uri.file(path.join(this.right.fsPath, name));
                    entries.push({ uri: uri, type });
                }
            });
        }

        entries.sort((a, b) => {
            if (a.type === b.type) {
                return a.uri.path.localeCompare(b.uri.path);
            }
            return a.type === vscode.FileType.Directory ? -1 : 1;
        });

        return entries;
    }

    getTreeItem(element: Entry): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(element.uri, element.type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        if (element.type === vscode.FileType.File) {
            treeItem.contextValue = 'file';
        }
        return treeItem;
    }
}

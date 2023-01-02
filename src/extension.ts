import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	let config = vscode.workspace.getConfiguration('sp-clipboard-copy-history');
	let capacity = config.get('capacity', 10);

	var disposables: vscode.Disposable[] = [];
	var buffer: any[] = [];

	disposables.push(vscode.commands.registerCommand('sp-clipboard-copy-history.copy', () => {
		push(vscode.window.activeTextEditor);
		vscode.commands.executeCommand("editor.action.clipboardCopyAction");
	}));

	disposables.push(vscode.commands.registerCommand('sp-clipboard-copy-history.cut', () => {
		push(vscode.window.activeTextEditor);
		vscode.commands.executeCommand("editor.action.clipboardCopyAction");
		vscode.commands.executeCommand("editor.action.clipboardCutAction");
	}));

	disposables.push(vscode.commands.registerCommand('sp-clipboard-copy-history.paste', () => {
		vscode.commands.executeCommand("editor.action.clipboardPasteAction").then(() => {
			if (vscode.window.activeTextEditor) {
				var start = vscode.window.activeTextEditor.selection.anchor;
				var end = vscode.window.activeTextEditor.selection.anchor;
				vscode.window.activeTextEditor.selection = new vscode.Selection(start.line, start.character, end.line, end.character);
				vscode.commands.executeCommand("editor.action.formatSelection").then(function () {
					setTimeout(function () {
						if (vscode.window.activeTextEditor) {
							let newPos = vscode.window.activeTextEditor.selection.active;
							vscode.window.activeTextEditor.selection = new vscode.Selection(newPos, newPos);
						}
					}, 100);
				});
			}
		});
	}));

	disposables.push( vscode.commands.registerCommand('sp-clipboard-copy-history.pastefromhistory', () => {
		if (buffer.length === 0) {
			vscode.window.setStatusBarMessage("Clipboard: Nothing to history", 5000);
			return;
		}
		let e = vscode.window.activeTextEditor;
		if (e === undefined) {
			return;
		}
		vscode.commands.executeCommand("sp-clipboard-copy-history.show");
	}));

	disposables.push( vscode.commands.registerCommand('sp-clipboard-copy-history.show', () => {
		if (buffer.length === 0) {
			vscode.window.setStatusBarMessage("Clipboard: Nothing to history", 5000);
			return;
		}
		var items: vscode.QuickPickItem[] = [];
		for (var i = 0; i < buffer.length; i++) {
			items.push({ label: (i + 1).toString(), description: buffer[i] });
		};
		vscode.window.showQuickPick(items).then((item) => {
			if (item) {
				paste(item.description);
			}
		});
	}));

	disposables.push( vscode.commands.registerCommand('sp-clipboard-copy-history.clear', () => {
		buffer = [];
		vscode.window.setStatusBarMessage("Clipboard: Cleared Copy Hisotry!", 5000);
	}));

	context.subscriptions.concat(disposables);

	function push(e: vscode.TextEditor | undefined) {
		if (e === undefined) {
			return;
		}
		let selectedText: string = e.document.getText(new vscode.Range(e.selection.start, e.selection.end));
		if (selectedText.length === 0) {
			let eol;
			try {
				const files = vscode.workspace.getConfiguration("files");
				eol = files.get("eol", "\n");
			} catch (e) {
				eol = "\n";
			}
			selectedText = e.document.lineAt(e.selection.start.line).text + eol;
		}

		if (selectedText.trim().length > 0 && !buffer.find(value => value === selectedText)) {
			buffer.unshift(selectedText);
			if (buffer.length > capacity) {
				buffer = buffer.slice(0, capacity);
			}
		}
	}

	function paste(text: string | undefined) {
		const e = vscode.window.activeTextEditor;
		const d = e ? e.document : undefined;
		if (text === undefined || e === undefined || d === undefined) {
			return;
		}

		e.edit(function (edit: vscode.TextEditorEdit) {
			e.selections.forEach(x => { edit.replace(x, text); });
		}).then(() => {
			setTimeout(() => {
				const selections = e.selections;
				e.selections = [selections[0]];
				vscode.commands.executeCommand("editor.action.clipboardCopyAction").then(() => {
					setTimeout(() => {
						e.selections = selections;
						vscode.commands.executeCommand("editor.action.formatSelection");
					}, 100);
				});
			}, 100);
		});
	}
}

export function deactivate() {}

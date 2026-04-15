export interface Command {
	execute(): void;
	undo(): void;
}

export class CommandHistory {
	private undoStack: Command[] = [];
	private redoStack: Command[] = [];

	run(cmd: Command): void {
		cmd.execute();
		this.undoStack.push(cmd);
		this.redoStack = [];
	}

	undo(): void {
		const cmd = this.undoStack.pop();
		if (cmd) {
			cmd.undo();
			this.redoStack.push(cmd);
		}
	}

	redo(): void {
		const cmd = this.redoStack.pop();
		if (cmd) {
			cmd.execute();
			this.undoStack.push(cmd);
		}
	}

	get canUndo(): boolean { return this.undoStack.length > 0; }
	get canRedo(): boolean { return this.redoStack.length > 0; }
}

import type { AgendaItem } from "../presenters/HomepagePresenter";
import type { Command } from "./Command";

type Apply = (items: AgendaItem[]) => void;

abstract class ItemsCommand implements Command {
	constructor(
		protected readonly before: AgendaItem[],
		protected readonly after: AgendaItem[],
		protected readonly apply: Apply,
	) {}
	execute(): void { this.apply(this.after); }
	undo(): void { this.apply(this.before); }
}

export class AddItemCommand extends ItemsCommand {}
export class RemoveItemCommand extends ItemsCommand {}
export class EditItemCommand extends ItemsCommand {}
export class MoveItemCommand extends ItemsCommand {}

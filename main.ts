import { Notice, Plugin } from "obsidian";

export default class MergeNotesPlugin extends Plugin {
	async onload() {
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				menu.addItem((item) => {
					item.setTitle("Merge notes")
						.setIcon("document")
						.onClick(async () => {
							new Notice(file.path);
						});
				});
			})
		);
	}

	onunload() {}
}

import { MergeNotesModal } from "./src/components/MergeNotesModal";
import { Plugin, TFile } from "obsidian";

export default class MergeNotesPlugin extends Plugin {
	async onload() {
		this.registerEvent(
			this.app.workspace.on("files-menu", (menu, files) => {
				menu.addItem((item) => {
					item.setTitle("Merge notes").onClick(async () => {
						const modal = new MergeNotesModal(this.app, files as TFile[]);
						modal.open();
					});
				});
			})
		);
	}

	onunload() {}
}

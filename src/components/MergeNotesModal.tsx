import { App, Modal, TFile, Notice } from "obsidian";
import { MergeNotesView } from "./MergeNotesView";
import { Root, createRoot } from "react-dom/client";
import React from "react";

export class MergeNotesModal extends Modal {
	private files: TFile[];
	root: Root | null = null;

	constructor(app: App, files: TFile[] = []) {
		super(app);
		this.files = files;
	}

	createRoot = () => {
		const { contentEl } = this;
		const root = contentEl.createEl("div");
		root.id = "root";

		return root;
	};

	onOpen() {
		const isContainFolder = this.files.some((file) => !file.stat);
		if (isContainFolder) {
			new Notice("Merge Notes does not support folders.");
			this.close();
			return;
		}

		const root = this.createRoot();
		this.root = createRoot(root);
		this.root.render(
			<MergeNotesView files={this.files} app={this.app} modal={this} />
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
		this.files = [];
		this.root?.unmount();
	}
}

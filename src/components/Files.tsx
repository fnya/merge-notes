import { DragAndDropState } from "../types/DragAndDropState";
import { File } from "./File";
import { store, DnD } from "@dflex/dnd";
import { TFile, Notice } from "obsidian";
import { Title } from "./Title";
import React, { useState } from "react";

export const Files = (props: any) => {
	const files = props.files as TFile[];
	const { app, modal } = props;
	const [title, setTitle] = useState(files[0].basename);
	const [dragState, setDragState] = useState<DragAndDropState>({
		dflexDnD: null,
	});

	const mouseDown = (e: MouseEvent) => {
		const { button, clientX, clientY } = e;
		const target = (e.target as HTMLElement).parentNode as HTMLElement;

		// Avoid right mouse click and ensure id
		if (typeof button === "number" && button === 0) {
			setDragState({
				dflexDnD: new DnD(target.id, {
					x: clientX,
					y: clientY,
				}),
			});
		}
	};

	const mouseMove = (e: MouseEvent) => {
		if (dragState.dflexDnD) {
			const { clientX, clientY } = e;
			dragState.dflexDnD.dragAt(clientX, clientY);
			setDragState({
				dflexDnD: dragState.dflexDnD,
			});
		}
	};

	const mouseUp = (e: MouseEvent) => {
		if (dragState.dflexDnD) {
			dragState.dflexDnD.endDragging();
			setDragState({
				dflexDnD: null,
			});
		}
	};

	const mergeNotes = async () => {
		let fileContent = "";

		await Promise.all(
			Array.from(files).map(async (file) => {
				const outFile = files.find((f) => file.path === f.path);

				if (outFile) {
					try {
						const eachConent = await app.vault.adapter.read(outFile.path);
						fileContent += outFile.basename + "\n";
						fileContent += eachConent + "\n";
					} catch (e) {
						console.log(e);
					}
				}
			})
		);

		try {
			await app.vault.create(title + ".md", fileContent);
			new Notice("Merge completed");
		} catch (e) {
			console.log(e);
			if (e.message === "File already exists") {
				new Notice(e.message);
			} else {
				new Notice("An error occurred while merging notes");
			}
		}

		modal.close();
	};

	return (
		<div>
			<Title title={title} />
			<ul>
				{files.map((file: TFile) => {
					return (
						<File
							key={file.path}
							file={file}
							store={store}
							mouseDown={mouseDown}
							mouseMove={mouseMove}
							mouseUp={mouseUp}
						/>
					);
				})}
			</ul>
			*Drag and drop to change order
			<br />
			<br />
			<button onClick={mergeNotes}>Merge</button>
		</div>
	);
};

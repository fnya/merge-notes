import { File } from "./File";
import { TFile, Notice } from "obsidian";
import { Title } from "./Title";
import React, { useState } from "react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export const Files = (props: any) => {
	const files = props.files as TFile[];
	const { app, modal } = props;
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);
	const sortFiles = (files: TFile[]) => {
		return files.sort((a, b) => a.basename.localeCompare(b.basename));
	};
	const [items, setItems] = useState(sortFiles(files).map((file) => file.path));
	const [title, setTitle] = useState(
		"Merged - " + sortFiles(files)[0].basename
	);
	const [showTooltip, setShowTooltip] = useState(false);
	const [tooltip, setTooltip] = useState("");

	const getNormalizedTitle = (title?: string) => {
		if (!title || title.length === 0) {
			return "unnamed";
		}

		return (
			title
				// for Mac
				.replace(/:/g, " ")
				.replace(/\./g, " ")
				// for Windows
				.replace(/¥/g, " ")
				.replace(/\//g, " ")
				.replace(/\*/g, " ")
				.replace(/\?/g, " ")
				.replace(/</g, " ")
				.replace(/>/g, " ")
				.replace(/\|/g, " ")
		);
	};

	const getDirectoryPath = () => {
		const dir = sortFiles(files)[0].path.split("/").slice(0, -1).join("/");

		if (dir === "") {
			return "";
		}

		return dir + "/";
	};

	const mergeNotes = async () => {
		let fileContent = "";

		await Promise.all(
			Array.from(items).map(async (item) => {
				const exportFile = files.find((file) => file.path === item)!;

				if (exportFile) {
					try {
						const eachConent = await app.vault.adapter.read(exportFile.path);
						fileContent += exportFile.basename + "\n";
						fileContent += eachConent + "\n\n\n";
					} catch (e) {
						console.error(e);
					}
				}
			})
		);

		try {
			await app.vault.create(
				getDirectoryPath() + getNormalizedTitle(title) + ".md",
				fileContent
			);
			new Notice("Merge completed");
		} catch (e) {
			console.error(e);
			if (e.message === "File already exists") {
				new Notice(e.message);
			} else {
				new Notice("An error occurred while merging notes");
			}
		}

		modal.close();
	};

	const handleDragEnd = (event: any) => {
		const { active, over } = event;

		if (active.id !== over.id) {
			setItems((items) => {
				const oldIndex = items.indexOf(active.id);
				const newIndex = items.indexOf(over.id);

				return arrayMove(items, oldIndex, newIndex);
			});
		}
	};

	return (
		<div>
			<Title title={title} setTitle={setTitle} />
			<div className="mergeNotesNote">
				<div className={showTooltip ? "mergeNotesTooltip" : "mergeNotesHide"}>
					{tooltip}
				</div>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext items={items} strategy={verticalListSortingStrategy}>
						{items.map((id) => {
							const localFile = files.find((file) => file.path === id)!;
							return (
								<File
									key={id}
									id={id}
									file={localFile}
									setShowTooltip={setShowTooltip}
									setTooltip={setTooltip}
								/>
							);
						})}
					</SortableContext>
				</DndContext>
			</div>
			<div className="mergeNotesExplain">*drag and drop to change order</div>
			<div className="mergeNotesButton">
				<button onClick={mergeNotes}>Merge notes</button>
			</div>
		</div>
	);
};

import {
	closestCenter,
	DndContext,
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
import { Notice, parseYaml, TFile } from "obsidian";
import React, { useState } from "react";
import { File } from "./File";
import { Title } from "./Title";

const PROPERTIES_REGEX = /---\n([\s\S]*?)\n---/;
const MERGED_NOTED_DIRECTORY = "_merged_notes";

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
	const [isExcludeProperties, setIsExcludeProperties] = useState(false);
	const [isExcludeEachNoteName, setIsExcludeEachNoteName] = useState(false);
	const [isMoveNotes, setIsMoveNotes] = useState(false);
	const [isNoBackup, setIsNoBackup] = useState(false);

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

	const getMergedNotesFolderName = (): string => {
		const now = new Date();

		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, "0"); // +1 because the month begins at 0
		const day = String(now.getDate()).padStart(2, "0");
		const hours = String(now.getHours()).padStart(2, "0");
		const minutes = String(now.getMinutes()).padStart(2, "0");
		const seconds = String(now.getSeconds()).padStart(2, "0");

		return `${year}${month}${day}T${hours}${minutes}${seconds}`;
	};

	const getProperties = (content: string) => {
		const properties = content.match(PROPERTIES_REGEX);

		if (properties) {
			let tempProperties = properties![1];

			if (tempProperties && tempProperties.contains(",")) {
				const lines = tempProperties.split("\n");
				tempProperties = "";

				lines.forEach((line) => {
					if (line.trim() !== "") {
						if (line.includes(",")) {
							const index = line.indexOf(":");
							const key = line.substring(0, index).trim();
							const value = line.substring(index + 1).trim();

							const values = value
								.split(",")
								.map((v) =>
									v.trim().replace("[", "").replace("]", "").replace(/"/g, "")
								);

							tempProperties += `${key}:`;

							values.forEach((v) => {
								tempProperties += `\n  - "${v}"`;
							});
							tempProperties += "\n";
						} else {
							tempProperties += line + "\n";
						}
					}
				});
			}

			return parseYaml(tempProperties);
		}

		return undefined;
	};

	const getExcludePropertiesContent = (content: string) => {
		if (content.match(PROPERTIES_REGEX)) {
			return content.replace(PROPERTIES_REGEX, "");
		}

		return content;
	};

	const hasProperties = (content: string) => {
		return content.startsWith("---\n") && content.indexOf("---\n", 4) !== -1;
	};

	const createPropertiesContent = (
		content: string,
		title: string,
		item: string,
		properties: any[],
		tags: any[],
		isExcludeEachNoteName: boolean
	) => {
		let fileContent = "";

		const postfix = new String(items.indexOf(item) + 1);
		const eachProperties = getProperties(content);

		for (const key in eachProperties) {
			if (key.toLowerCase() === "tags") {
				eachProperties[key].forEach((tag: string) => {
					const addTag = tag.startsWith("#") ? tag.substring(1) : tag;
					if (tags.indexOf(addTag) === -1) {
						tags.push(addTag);
					}
				});
			} else {
				const existProperty = properties.some((property) =>
					property.hasOwnProperty(key)
				);

				const property: any = {};

				if (existProperty) {
					property[key + postfix] = eachProperties[key];
					properties.push(property);
				} else {
					property[key] = eachProperties[key];
					properties.push(property);
				}
			}
		}

		if (!isExcludeEachNoteName) {
			fileContent += `# ${title}\n`;
		}
		fileContent += getExcludePropertiesContent(content) + "\n\n\n";

		return fileContent;
	};

	const createPropertiesString = (properties: any[]) => {
		let propertiesString = "";

		properties.forEach((property) => {
			for (const key in property) {
				if (property[key] instanceof Array) {
					const proertyValue = Array.from(property[key])
						.map((value) => `"${value}"`)
						.join(",");
					propertiesString += `${key}: [${proertyValue}]\n`;
				} else {
					propertiesString += `${key}: ${property[key]}\n`;
				}
			}
		});

		return propertiesString;
	};

	const mergeNotes = async () => {
		let fileContent = "";
		const properties: any[] = [];
		const tags: any[] = [];

		await Promise.all(
			Array.from(items).map(async (item) => {
				const exportFile = files.find((file) => file.path === item)!;

				if (exportFile) {
					try {
						const eachConent = await app.vault.adapter.read(exportFile.path);

						if (hasProperties(eachConent)) {
							fileContent += createPropertiesContent(
								eachConent,
								exportFile.basename,
								item,
								properties,
								tags,
								isExcludeEachNoteName
							);
						} else {
							if (!isExcludeEachNoteName) {
								fileContent += "# " + exportFile.basename + "\n";
							}
							fileContent += eachConent + "\n\n\n";
						}
					} catch (e) {
						console.error(e);
					}
				}
			})
		);

		let propertiesString = "";

		if (tags.length > 0) {
			const tagsString = tags.map((tag) => `  - "${tag}"`).join("\n");
			propertiesString += "tags: \n" + tagsString + "\n";
		}

		if (properties.length > 0) {
			propertiesString += createPropertiesString(properties);
		}

		if (isExcludeProperties) {
			propertiesString = "";
		}

		if (propertiesString !== "") {
			fileContent = `---\n${propertiesString}---\n\n${fileContent}`;
		}

		try {
			await app.vault.create(
				getDirectoryPath() + getNormalizedTitle(title) + ".md",
				fileContent
			);
		} catch (e) {
			console.error(e);
			if (e.message === "File already exists.") {
				new Notice(e.message, 3000);
			} else {
				new Notice("An error occurred while merging notes");
			}
		}

		if (isMoveNotes) {
			await Promise.all(
				Array.from(items).map(async (item) => {
					const exportFile = files.find((file) => file.path === item)!;

					if (exportFile) {
						try {
							if (!(await app.vault.adapter.exists(MERGED_NOTED_DIRECTORY))) {
								await app.vault.adapter.mkdir(MERGED_NOTED_DIRECTORY);
							}

							const mergedNotesFolderName = getMergedNotesFolderName();

							await app.vault.adapter.mkdir(
								MERGED_NOTED_DIRECTORY + "/" + mergedNotesFolderName
							);

							await app.vault.rename(
								exportFile,
								MERGED_NOTED_DIRECTORY +
									"/" +
									mergedNotesFolderName +
									"/" +
									exportFile.name
							);
						} catch (e) {
							console.error(e);
						}
					}
				})
			);
		}

		if (isNoBackup) {
			await Promise.all(
				Array.from(items).map(async (item) => {
					const exportFile = files.find((file) => file.path === item)!;

					if (exportFile) {
						try {
							await app.vault.delete(exportFile);
						} catch (e) {
							console.error(e);
						}
					}
				})
			);
		}

		new Notice("Merge completed", 3000);

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
			<div className="mergeNotesExplain">*Drag and drop to change order</div>
			<div className="mergeNotesMergeOptions">
				<div>
					<input
						type="checkbox"
						id="isExcludeProperties"
						onChange={(e) => setIsExcludeProperties(e.target.checked)}
					></input>
					<label htmlFor="isExcludeProperties">Exclude properties</label>
				</div>
				<div>
					<input
						type="checkbox"
						id="isExcludeEachNoteName"
						onChange={(e) => setIsExcludeEachNoteName(e.target.checked)}
					></input>
					<label htmlFor="isExcludeEachNoteName">Exclude each note name</label>
				</div>
				<div>
					<input
						type="checkbox"
						id="isMoveNotes"
						checked={isMoveNotes}
						onChange={(e) => {
							setIsMoveNotes(e.target.checked);
							setIsNoBackup(false);
						}}
					></input>
					<label htmlFor="isMoveNotes">
						The original notes are moved to the `_merged_notes` directory
					</label>
				</div>
				<div>
					<input
						type="checkbox"
						id="isNoBackup"
						checked={isNoBackup}
						onChange={(e) => {
							setIsNoBackup(e.target.checked);
							setIsMoveNotes(false);
						}}
					></input>
					<label htmlFor="isNoBackup">
						!!Danger!! Do not back up the original notes
					</label>
				</div>
			</div>

			<div className="mergeNotesButton">
				<button onClick={mergeNotes}>Merge notes</button>
			</div>
		</div>
	);
};

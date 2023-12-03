import { File } from "./File";
import { TFile, Notice, parseYaml } from "obsidian";
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

const PROPERTIES_REGEX = /---\n([\s\S]*?)\n---/;

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

	const getProperties = (content: string) => {
		if (content.match(PROPERTIES_REGEX)) {
			return parseYaml(content.match(PROPERTIES_REGEX)![1]);
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
		tags: any[]
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

		fileContent += `# ${title}\n`;
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
								tags
							);
						} else {
							fileContent += "# " + exportFile.basename + "\n";
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
			<div className="mergeNotesMergeOptions">
				<div>
					<input
						type="checkbox"
						id="isExcludeProperties"
						onChange={(e) => setIsExcludeProperties(e.target.checked)}
					></input>
					<label htmlFor="isExcludeProperties">exclude properties</label>
				</div>
			</div>

			<div className="mergeNotesButton">
				<button onClick={mergeNotes}>Merge notes</button>
			</div>
		</div>
	);
};

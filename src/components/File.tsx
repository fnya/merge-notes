import { CSS } from "@dnd-kit/utilities";
import { TFile } from "obsidian";
import { useSortable } from "@dnd-kit/sortable";
import React from "react";

export const File = (props: any) => {
	const file = props.file as TFile;
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id: props.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			id={file.path}
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
		>
			<div className="file">{file.basename}</div>
		</div>
	);
};

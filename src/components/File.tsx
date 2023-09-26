import { CSS } from "@dnd-kit/utilities";
import { TFile } from "obsidian";
import { useSortable } from "@dnd-kit/sortable";
import React from "react";

export const File = (props: any) => {
	const file = props.file as TFile;
	const { setShowTooltip, setTooltip } = props;
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id: props.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const show = () => {
		setTooltip(file.basename);
		setShowTooltip(true);
	};

	const hide = () => {
		setTooltip("");
		setShowTooltip(false);
	};

	return (
		<div
			id={file.path}
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			onMouseEnter={show}
			onMouseLeave={hide}
		>
			<div className="mergeNotesFile">{file.basename}</div>
		</div>
	);
};

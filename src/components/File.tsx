import { TFile } from "obsidian";
import React, { useEffect } from "react";

export const File = (props: any) => {
	const file = props.file as TFile;
	const { store, mouseDown, mouseMove, mouseUp } = props;

	useEffect(() => {
		store.register({ id: file.path });

		return () => {
			store.unregister(file.path);
		};
	}, []);

	return (
		<div
			id={file.path}
			onMouseDown={mouseDown}
			onMouseMove={mouseMove}
			onMouseUp={mouseUp}
		>
			<div className="file">{file.basename}</div>
		</div>
	);
};

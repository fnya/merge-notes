import { Files } from "./Files";
import React from "react";

export const MergeNotesView = (props: any) => {
	const { files, app, modal } = props;

	return (
		<div>
			<Files files={files} app={app} modal={modal} />
		</div>
	);
};

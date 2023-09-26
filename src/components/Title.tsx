import React from "react";

export const Title = (props: any) => {
	const { title } = props;
	const setTitile = props.setTitle as React.Dispatch<
		React.SetStateAction<string>
	>;

	return (
		<div>
			<label htmlFor="title" className="mergeNotesTitleLabel">
				Title after merged:
			</label>
			<input
				type="text"
				className="mergeNotesTitle"
				value={title}
				onChange={(e) => setTitile(e.target.value)}
			/>
		</div>
	);
};

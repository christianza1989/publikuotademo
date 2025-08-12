"use client";

// This component will be dynamically imported in the page
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

interface EditorProps {
    onChange: (data: string) => void;
    value: string;
}

const editorConfiguration = {
    heading: {
        options: [
            { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
            { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
            { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' }
        ]
    }
};

export default function Editor({ onChange, value }: EditorProps) {
    return (
        <CKEditor
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor={ClassicEditor as any}
            config={editorConfiguration as any}
            data={value}
            onChange={(event, editor) => {
                const data = editor.getData();
                onChange(data);
            }}
        />
    );
}

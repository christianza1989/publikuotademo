"use client";

import { useEffect, useRef } from 'react';
import type { CKEditor as CKEditorType } from '@ckeditor/ckeditor5-react';
import type ClassicEditorType from '@ckeditor/ckeditor5-build-classic';

interface EditorProps {
    onChange: (data: string) => void;
    editorLoaded: boolean;
    value: string;
}

export default function Editor({ onChange, editorLoaded, value }: EditorProps) {
    const editorRef = useRef<{ CKEditor: typeof CKEditorType; ClassicEditor: typeof ClassicEditorType } | null>(null);
    const { CKEditor, ClassicEditor } = editorRef.current || {};

    useEffect(() => {
        editorRef.current = {
            CKEditor: require('@ckeditor/ckeditor5-react').CKEditor,
            ClassicEditor: require('@ckeditor/ckeditor5-build-classic'),
        };
    }, []);

    return (
        <div>
            {editorLoaded && CKEditor && ClassicEditor ? (
                <CKEditor
                    editor={ClassicEditor as any}
                    data={value}
                    onChange={(event, editor) => {
                        const data = editor.getData();
                        onChange(data);
                    }}
                />
            ) : (
                <div>Loading Editor...</div>
            )}
        </div>
    );
}

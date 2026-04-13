import React from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Registrar handler de imagem personalizado
const imageHandler = function(this: any) {
  const quill = this.quill;
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/*');
  input.click();

  input.onchange = async () => {
    const file = input.files?.[0];
    if (file) {
      // Verifica tamanho máximo (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Imagem muito grande. O tamanho máximo é 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', base64);
        quill.setSelection(range.index + 1);
      };
      reader.readAsDataURL(file);
    }
  };
};

const modules = {
  toolbar: {
    container: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
    handlers: {
      image: imageHandler,
    },
  },
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'link', 'image',
  'blockquote', 'code-block',
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Digite o conteúdo aqui...',
  disabled = false,
}) => {
  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={disabled}
        className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
        style={{
          minHeight: '300px',
        }}
      />
      <style>{`
        .rich-text-editor .ql-container {
          font-size: 14px;
          min-height: 200px;
          border-radius: 0 0 0.5rem 0.5rem;
        }
        
        .rich-text-editor .ql-editor {
          min-height: 200px;
          max-height: 500px;
          overflow-y: auto;
        }
        
        .rich-text-editor .ql-toolbar {
          border-radius: 0.5rem 0.5rem 0 0;
          background: #f9fafb;
        }
        
        .dark .rich-text-editor .ql-toolbar {
          background: #27272a;
          border-color: #3f3f46;
        }
        
        .dark .rich-text-editor .ql-container {
          border-color: #3f3f46;
          background: #18181b;
          color: #f4f4f5;
        }
        
        .dark .rich-text-editor .ql-editor {
          color: #f4f4f5;
        }
        
        .dark .rich-text-editor .ql-editor.ql-blank::before {
          color: #71717a;
        }
        
        .rich-text-editor .ql-stroke {
          stroke: #71717a;
        }
        
        .rich-text-editor .ql-fill {
          fill: #71717a;
        }
        
        .rich-text-editor .ql-picker-label {
          color: #71717a;
        }
        
        .rich-text-editor .ql-active .ql-stroke {
          stroke: var(--color-primary-600);
        }
        
        .rich-text-editor .ql-active .ql-fill {
          fill: var(--color-primary-600);
        }
        
        .rich-text-editor .ql-active .ql-picker-label {
          color: var(--color-primary-600);
        }
      `}</style>
    </div>
  );
};

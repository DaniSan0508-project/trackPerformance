import React from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
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
  readOnly = false,
}) => {
  const isReadOnly = disabled || readOnly;

  return (
    <div className={`rich-text-editor relative ${isReadOnly ? 'read-only' : ''}`}>
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={isReadOnly ? { toolbar: false } : modules}
        formats={formats}
        placeholder={placeholder}
        readOnly={isReadOnly}
        className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
        style={{
          minHeight: isReadOnly ? '150px' : '300px',
        }}
      />
      <style>{`
        .rich-text-editor {
          position: relative;
        }

        .rich-text-editor.read-only .ql-container {
          border-radius: 0.5rem;
        }

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

        /* Tradução e Ajustes do Tooltip de Link */
        .rich-text-editor .ql-tooltip {
          z-index: 1000;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          left: 50% !important;
          transform: translateX(-50%) !important;
          top: 10px !important;
          white-space: nowrap;
        }

        .rich-text-editor .ql-container {
          position: relative;
        }

        .dark .rich-text-editor .ql-tooltip {
          background-color: #27272a;
          border-color: #3f3f46;
          color: #f4f4f5;
        }

        .rich-text-editor .ql-tooltip::before {
          content: "Link:" !important;
          font-weight: 600;
        }

        .rich-text-editor .ql-tooltip input[type=text] {
          border-radius: 0.375rem;
          border: 1px solid #d1d5db;
          padding: 3px 8px;
          margin-right: 8px;
        }

        .dark .rich-text-editor .ql-tooltip input[type=text] {
          background-color: #18181b;
          border-color: #3f3f46;
          color: #f4f4f5;
        }

        .rich-text-editor .ql-tooltip.ql-editing a.ql-action::after {
          content: 'Salvar' !important;
          background-color: var(--color-primary-600, #2563eb);
          color: white;
          padding: 4px 12px;
          border-radius: 0.375rem;
          font-weight: 600;
          border-right: none !important;
        }

        .rich-text-editor .ql-tooltip a.ql-action::after {
          content: 'Editar' !important;
        }

        .rich-text-editor .ql-tooltip a.ql-remove::before {
          content: 'Remover' !important;
        }
      `}</style>
    </div>
  );
};

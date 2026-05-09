import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import Placeholder from '@tiptap/extension-placeholder'
import './PostEditor.css'

const MenuBar = ({ editor }) => {
  if (!editor) return null
  const btn = (onClick, label, active) => (
    <button
      key={label}
      className={`editor-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
  return (
    <div className="editor-menubar">
      {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
      {btn(() => editor.chain().focus().toggleBlockquote().run(), '"', editor.isActive('blockquote'))}
      {btn(() => editor.chain().focus().toggleBulletList().run(), '•', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleCode().run(), '<>', editor.isActive('code'))}
      {btn(() => editor.chain().focus().setHorizontalRule().run(), '—', false)}
    </div>
  )
}

export default function PostEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      Typography,
      Placeholder.configure({ placeholder: 'Begin writing…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  return (
    <div className="post-editor">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="editor-content" />
    </div>
  )
}

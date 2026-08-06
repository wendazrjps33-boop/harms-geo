'use client'

import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Typography from '@tiptap/extension-typography'
import ImageUploadDialog from './ImageUploadDialog'
import { useI18n } from '../i18n/context'

export default function ContentEditor({ content, onSave, onRegenerate, onConfirm, onPublish, loading }) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState([])
  const [newTag, setNewTag] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showImageDialog, setShowImageDialog] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Typography,
    ],
    content: '',
    editable: true,
    onUpdate: () => setHasChanges(true),
  })

  useEffect(() => {
    if (content && editor) {
      setTitle(content.title || '')
      setTags(content.tags || [])
      setHasChanges(false)
      const body = content.body || ''
      if (body.startsWith('<')) {
        editor.commands.setContent(body)
      } else {
        editor.commands.setContent(body.replace(/\n/g, '<br>'))
      }
    }
  }, [content, editor])

  const handleTitleChange = (e) => {
    setTitle(e.target.value)
    setHasChanges(true)
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
      setHasChanges(true)
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
    setHasChanges(true)
  }

  const handleSave = () => {
    if (!editor) return
    onSave({ title, body: editor.getHTML(), tags })
    setHasChanges(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault()
      handleAddTag()
    }
  }

  const wordCount = editor ? editor.storage.characterCount?.characters?.() || editor.getText().length : 0
  const targetWordCount = content?.target_word_count || 1000
  const isReadOnly = content?.status === 'published'

  const handleImageInsert = ({ url, alt }) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url, alt: alt || '' }).run()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPreview(false)}
            className={`px-3 py-1 rounded-md text-sm ${
              !isPreview ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t('editor.edit')}
          </button>
          <button
            onClick={() => setIsPreview(true)}
            className={`px-3 py-1 rounded-md text-sm ${
              isPreview ? 'bg-brand-100 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t('editor.preview')}
          </button>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`text-sm ${
            wordCount < targetWordCount * 0.8 ? 'text-danger' : 'text-gray-500'
          }`}>
            {t('editor.wordCount', { count: wordCount, target: targetWordCount })}
          </span>
          {content?.quality_score != null && content.quality_score < 50 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {t('editor.lowQuality')}
            </span>
          )}
          {(content?.status === 'draft' || content?.status === 'ready') && (
            <>
              <button
                onClick={handleSave}
                disabled={!hasChanges || loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  hasChanges && !loading
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {loading ? t('editor.saving') : t('editor.save')}
              </button>
              {content?.status === 'draft' && (
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-success text-white hover:opacity-90"
                >
                  {t('editor.confirmContent')}
                </button>
              )}
              {content?.status === 'ready' && (
                <button
                  onClick={onPublish}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700"
                >
                  {t('editor.publish')}
                </button>
              )}
            </>
          )}
          {content?.status === 'published' && (
            <button
              onClick={onPublish}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700"
            >
              {t('editor.publishToMore')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder={t('editor.titlePlaceholder')}
          className="w-full text-2xl font-bold text-gray-900 border-none outline-none mb-4"
          disabled={isReadOnly}
        />

        {!isPreview && (
        <div className="flex items-center gap-1 mb-3 pb-3 border-b">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded text-sm ${editor?.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title={t('editor.bold')}
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded text-sm ${editor?.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title={t('editor.italic')}
            >
              <em>I</em>
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-2 py-1 rounded text-sm ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title={t('editor.heading2')}
            >
              H2
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`px-2 py-1 rounded text-sm ${editor?.isActive('heading', { level: 3 }) ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title={t('editor.heading3')}
            >
              H3
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded text-sm ${editor?.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title={t('editor.bulletList')}
            >
              <span>&#8226;</span>
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded text-sm ${editor?.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title={t('editor.orderedList')}
            >
              <span>1.</span>
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded text-sm ${editor?.isActive('blockquote') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title={t('editor.quote')}
            >
              <span>&ldquo;</span>
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded text-sm ${editor?.isActive('codeBlock') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
              title={t('editor.codeBlock')}
            >
              <span>&lt;/&gt;</span>
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button
              onClick={() => setShowImageDialog(true)}
              className="p-1.5 rounded text-sm hover:bg-gray-100"
              title={t('editor.insertImage')}
            >
              <span>🖼</span>
            </button>
          </div>
        )}

        {isPreview ? (
          <div className="border rounded-lg p-6 min-h-[400px] prose max-w-none bg-white">
            <div dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }} />
          </div>
        ) : (
          <div className="border rounded-lg">
            <EditorContent editor={editor} className="p-4 min-h-[400px] prose max-w-none" />
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-brand-100 text-brand-700"
              >
                {tag}
                {!isReadOnly && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-brand-500 hover:text-brand-700"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {!isReadOnly && (
            <div className="flex items-center">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('editor.addTagPlaceholder')}
                className="flex-1 border rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="bg-brand-600 text-white px-4 py-2 rounded-r-lg text-sm hover:bg-brand-700 disabled:bg-gray-300"
              >
                {t('editor.addTag')}
              </button>
            </div>
          )}
        </div>
      </div>

      {content?.status === 'draft' && (
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            {loading ? t('editor.regenerating') : t('editor.regenerateContent')}
          </button>
        </div>
      )}

      <ImageUploadDialog
        isOpen={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onInsert={handleImageInsert}
      />
    </div>
  )
}

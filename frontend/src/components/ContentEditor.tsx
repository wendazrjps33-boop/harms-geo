'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import ImageUploadDialog from './ImageUploadDialog';
import { useI18n } from '@/app/i18n/context';
import type { ContentDetail } from '@/types/api';

interface ContentEditorProps {
  content: ContentDetail | null;
  onSave: (data: { title: string; body: string; tags: string[] }) => void;
  onRegenerate: () => void;
  onConfirm: () => void;
  onPublish: () => void;
  loading?: boolean;
}

export default function ContentEditor({
  content,
  onSave,
  onRegenerate,
  onConfirm,
  onPublish,
  loading = false,
}: ContentEditorProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
      Typography,
    ],
    content: '',
    editable: true,
    onUpdate: () => setHasChanges(true),
  });

  useEffect(() => {
    if (content && editor) {
      setTitle(content.title || '');
      setTags(content.tags || []);
      setHasChanges(false);
      const body = content.body || '';
      if (body.startsWith('<')) {
        editor.commands.setContent(body);
      } else {
        editor.commands.setContent(body.replace(/\n/g, '<br>'));
      }
    }
  }, [content, editor]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setHasChanges(true);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setHasChanges(true);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!editor) return;
    onSave({
      title,
      body: editor.getHTML(),
      tags,
    });
    setHasChanges(false);
  };

  const handleImageInsert = ({ url, alt }: { url: string; alt: string }) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url, alt }).run();
    }
    setShowImageDialog(false);
  };

  if (!content) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {t('content.selectContent')}
      </div>
    );
  }

  const isReadOnly = content.status === 'published';
  const wordCount = editor?.storage.characterCount?.characters?.() || editor?.getText().length || 0;

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          disabled={isReadOnly}
          className="w-full text-2xl font-semibold text-gray-900 border-none focus:outline-none focus:ring-0 disabled:bg-transparent disabled:text-gray-500"
          placeholder={t('content.titlePlaceholder')}
        />
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700"
          >
            {tag}
            {!isReadOnly && (
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-brand-400 hover:text-brand-600"
              >
                ×
              </button>
            )}
          </span>
        ))}
        {!isReadOnly && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder={t('content.addTag')}
            />
            <button
              onClick={handleAddTag}
              className="px-2 py-1 text-xs text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* 工具栏 */}
      {!isReadOnly && editor && (
        <div className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-md transition-colors ${
              editor.isActive('bold')
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title={t('editor.bold')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
            </svg>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-md transition-colors ${
              editor.isActive('italic')
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title={t('editor.italic')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m-2 0l-4 16m-2 0h4m2-16l4 16" />
            </svg>
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded-md transition-colors ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title={t('editor.heading2')}
          >
            <span className="text-xs font-bold">H2</span>
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded-md transition-colors ${
              editor.isActive('heading', { level: 3 })
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title={t('editor.heading3')}
          >
            <span className="text-xs font-bold">H3</span>
          </button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={() => setShowImageDialog(true)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title={t('editor.insertImage')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setIsPreview(!isPreview)}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {isPreview ? t('editor.edit') : t('editor.preview')}
          </button>
        </div>
      )}

      {/* 编辑器内容 */}
      <div className="border border-gray-200 rounded-xl bg-white">
        {isPreview ? (
          <div
            className="prose prose-sm max-w-none h-[500px] overflow-y-auto px-4 py-3"
            dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '' }}
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      {/* 字数统计 */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {t('editor.wordCount')}: {wordCount}
          {content.target_word_count ? ` / ${content.target_word_count}` : ''}
        </span>
        {content.quality_score !== undefined && (
          <span
            className={
              content.quality_score >= 50 ? 'text-success' : 'text-warning'
            }
          >
            {t('content.qualityScore')}: {content.quality_score}
          </span>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        {!isReadOnly && (
          <>
            <button
              onClick={handleSave}
              disabled={!hasChanges || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
            {content.status === 'draft' && (
              <>
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('content.confirm')}
                </button>
                <button
                  onClick={onRegenerate}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('content.regenerate')}
                </button>
              </>
            )}
          </>
        )}
        {content.status === 'ready' && (
          <button
            onClick={onPublish}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-success rounded-lg hover:bg-success-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('content.publish')}
          </button>
        )}
      </div>

      {/* 图片上传弹窗 */}
      <ImageUploadDialog
        isOpen={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onInsert={handleImageInsert}
      />
    </div>
  );
}

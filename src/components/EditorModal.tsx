'use client'

import { useState, useEffect } from 'react'

interface EditorModalProps {
  filename: string
  content: string
  onSave: (content: string) => void
  onClose: () => void
}

export function EditorModal({ filename, content, onSave, onClose }: EditorModalProps) {
  const [text, setText] = useState(content)

  useEffect(() => {
    setText(content)
  }, [content])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-mono text-lg">{filename}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black text-xl">
            &times;
          </button>
        </div>

        {/* Editor */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
          spellCheck={false}
        />

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-black"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(text)
              onClose()
            }}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

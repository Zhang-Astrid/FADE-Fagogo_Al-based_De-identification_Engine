import React from "react";
import PDFPreview from '../Preview/PDFPreview'

export default function Results() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold mb-4">脱敏结果预览与导出</h1>
      <div className="bg-white p-6 rounded shadow">
        <div className="font-semibold mb-2">PDF预览</div>
        <div className="flex gap-4 mb-4">
          <button className="px-4 py-2 bg-blue-100 rounded">原图</button>
          <button className="px-4 py-2 bg-blue-100 rounded">脱敏图</button>
        </div>
        <div className="h-64 bg-gray-100 flex items-center justify-center text-gray-400">
          PDF每页预览区域（静态占位）
        </div>
        <div className="mt-4 text-sm text-gray-500">可高亮敏感词区域，支持原/脱敏切换</div>
      </div>
      <div className="flex gap-4 mt-6">
        <button className="px-6 py-2 bg-blue-600 text-white rounded">下载脱敏PDF</button>
        <button className="px-6 py-2 bg-gray-600 text-white rounded">导出识别日志</button>
      </div>
    </div>
  )
}

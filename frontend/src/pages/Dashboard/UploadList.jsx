import React, { useState } from "react";
import { deleteDocument } from '../../api/redact';
import { useNavigate } from 'react-router-dom';

export default function UploadList({ userDocuments }) {
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const navigate = useNavigate();

  if (!userDocuments || userDocuments.length === 0) {
    return null;
  }

  const handleDocumentSelect = (documentId) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === userDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(userDocuments.map(doc => doc.id || doc.document_code));
    }
  };

  const handleProcessSelected = () => {
    if (selectedDocuments.length > 0) {
      // 通过state传递选中的文档信息
      const selectedDocs = userDocuments.filter(doc => 
        selectedDocuments.includes(doc.id || doc.document_code)
      );
      console.log('选中的文档:', selectedDocs); // 调试信息
      navigate('/config', { state: { selectedDocuments: selectedDocs } });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDocuments.length > 0) {
      for (const docId of selectedDocuments) {
        const doc = userDocuments.find(d => (d.id || d.document_code) === docId);
        if (doc) {
          try {
            await deleteDocument(doc.document_code);
          } catch (e) {
            // 可选：错误处理
            console.error('删除失败', e);
          }
        }
      }
      // 删除后刷新页面（或触发父组件刷新）
      window.location.reload();
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'uploaded': return 'uploaded';
      case 'processing': return 'processing';
      case 'processed': return 'processed';
      case 'failed': return 'failed';
      default: return 'uploaded';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'uploaded': return '已上传';
      case 'processing': return '处理中';
      case 'processed': return '已处理';
      case 'failed': return '处理失败';
      default: return '已上传';
    }
  };

  return (
    <section className="upload-list-container">
      <header className="upload-list-header">
        <div className="upload-list-title-section">
          <h3 className="upload-list-title">我的文档</h3>
          {userDocuments.length > 0 && (
            <div className="upload-list-controls">
              <label className="upload-list-select-all">
                <input
                  type="checkbox"
                  checked={selectedDocuments.length === userDocuments.length}
                  onChange={handleSelectAll}
                />
                全选
              </label>
              {selectedDocuments.length > 0 && (
                <div className="upload-list-btn-group">
                  <button
                    className="upload-list-process-btn"
                    onClick={handleProcessSelected}
                  >
                    去处理 ({selectedDocuments.length})
                  </button>
                  <button
                    className="upload-list-process-btn upload-list-delete-btn"
                    onClick={handleDeleteSelected}
                  >
                    删除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      
      <ul className="upload-list-documents">
        {userDocuments.map((doc, i) => (
          <li key={i} className="upload-list-document-item">
            <input
              type="checkbox"
              className="upload-list-document-checkbox"
              checked={selectedDocuments.includes(doc.id || doc.document_code)}
              onChange={() => handleDocumentSelect(doc.id || doc.document_code)}
            />
            <span className="upload-list-document-name">{doc.filename}</span>
            <span className="upload-list-document-size">{doc.file_size_mb}MB</span>
            <span className="upload-list-document-pages">{doc.page_count}页</span>
            <span className={`upload-list-document-status ${getStatusClass(doc.status)}`}>
              {getStatusText(doc.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
} 
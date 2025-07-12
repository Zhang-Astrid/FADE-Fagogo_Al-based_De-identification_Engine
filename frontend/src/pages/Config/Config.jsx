import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { processDocument, getDocumentDetail } from "../../api/redact";

// 只保留detector.py支持的五类敏感信息类型
const defaultFields = [
  { group: "敏感信息类型", fields: [
    { key: "name", label: "姓名 (NER)" },
    { key: "address", label: "地址 (NER)" },
    { key: "company", label: "公司名 (NER)" },
    { key: "email", label: "邮箱 (正则)" },
    { key: "sens_number", label: "长数字字母混合 (正则)" },
  ]},
];

const methodOptions = [
  { value: "blur", label: "模糊(高斯模糊)" },
  { value: "cover", label: "遮挡(黑条)" },
  { value: "replace", label: "文本替换(如：***)" },
  { value: "smear", label: "图像涂抹" },
];

export default function Config() {
  const [fields, setFields] = useState(defaultFields);
  const [selected, setSelected] = useState({}); // {name: {checked: true, method: 'blur'}}
  const [customField, setCustomField] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [documentInfo, setDocumentInfo] = useState(null);
  
  const navigate = useNavigate();

  // 获取当前选中的文档信息
  useEffect(() => {
    const documentCode = window.selectedDocumentCode;
    if (documentCode) {
      loadDocumentInfo(documentCode);
    }
  }, []);

  const loadDocumentInfo = async (documentCode) => {
    try {
      const result = await getDocumentDetail(documentCode);
      if (result.success) {
        setDocumentInfo(result.document);
      }
    } catch (err) {
      console.error('获取文档信息失败:', err);
      setError('获取文档信息失败');
    }
  };

  function handleFieldCheck(group, key, checked) {
    setSelected(sel => ({
      ...sel,
      [key]: { ...sel[key], checked }
    }));
  }
  
  function handleMethodChange(key, method) {
    setSelected(sel => ({
      ...sel,
      [key]: { ...sel[key], method }
    }));
  }
  
  function handleAddCustomField() {
    if (!customField.trim()) return;
    setFields(f => [
      ...f,
      { group: "自定义字段", fields: [{ key: customField.trim(), label: customField.trim() }] }
    ]);
    setCustomField("");
  }
  
  function handleSaveTemplate() {
    if (!templateName.trim()) return;
    // 模板保存逻辑（可扩展）
    setTemplateName("");
    alert("模板已保存");
  }
  
  async function handleSubmit() {
    const documentCode = window.selectedDocumentCode;
    if (!documentCode) {
      setError('请先上传文档');
      return;
    }

    // 构造config参数：只传递被勾选的字段及其处理方式
    const config = Object.entries(selected)
      .filter(([, v]) => v.checked)
      .reduce((acc, [key, v]) => {
        acc[key] = v.method || 'blur';
        return acc;
      }, {});

    if (Object.keys(config).length === 0) {
      setError('请至少选择一个字段进行处理');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await processDocument(documentCode, config);
      if (result.success) {
        // 跳转到预览页面，传递处理结果
        navigate('/preview', { 
          state: { 
            processedDocument: result.processed_document,
            documentInfo: documentInfo
          } 
        });
      } else {
        setError(result.error || '处理失败');
      }
    } catch (err) {
      console.error('处理失败:', err);
      setError(err.message || '处理失败');
    } finally {
      setLoading(false);
    }
  }

  // 全部勾选并预览（演示功能）
  async function handleSelectAllAndPreview() {
    const documentCode = window.selectedDocumentCode;
    if (!documentCode) {
      setError('请先上传文档');
      return;
    }

    // 自动勾选所有字段
    const allConfig = {};
    fields.forEach(group => {
      group.fields.forEach(field => {
        allConfig[field.key] = 'blur'; // 默认使用模糊处理
      });
    });

    setLoading(true);
    setError('');

    try {
      const result = await processDocument(documentCode, allConfig);
      if (result.success) {
        navigate('/preview', { 
          state: { 
            processedDocument: result.processed_document,
            documentInfo: documentInfo
          } 
        });
      } else {
        setError(result.error || '处理失败');
      }
    } catch (err) {
      console.error('处理失败:', err);
      setError(err.message || '处理失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="config-root">
      <h1 className="config-title">脱敏配置</h1>
      
      {error && (
        <div style={{ 
          background: '#fee', 
          color: '#c33', 
          padding: '12px', 
          borderRadius: '6px', 
          marginBottom: '16px' 
        }}>
          {error}
        </div>
      )}

      {documentInfo && (
        <div style={{ 
          background: '#e8f4fd', 
          padding: '12px', 
          borderRadius: '6px', 
          marginBottom: '16px' 
        }}>
          <strong>当前文档:</strong> {documentInfo.filename} ({documentInfo.file_size_mb}MB)
        </div>
      )}
      
      <div className="config-card">
        <div className="config-section-title">字段勾选与方式选择</div>
        <div className="config-field-groups">
          {fields.map((g, i) => (
            <div className="config-field-group" key={g.group+"-"+i}>
              <div className="config-field-group-title">{g.group}</div>
              <div className="config-field-list">
                {g.fields.map(f => (
                  <div className="config-field-item" key={f.key}>
                    <input 
                      type="checkbox" 
                      id={f.key} 
                      checked={selected[f.key]?.checked||false} 
                      onChange={e=>handleFieldCheck(g.group, f.key, e.target.checked)} 
                    />
                    <label htmlFor={f.key}>{f.label}</label>
                    {selected[f.key]?.checked && (
                      <select 
                        className="config-method-select" 
                        value={selected[f.key]?.method||methodOptions[0].value} 
                        onChange={e=>handleMethodChange(f.key, e.target.value)}
                      >
                        {methodOptions.map(opt => <option value={opt.value} key={opt.value}>{opt.label}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="config-custom-field-row">
          <input 
            className="config-custom-field-input" 
            placeholder="自定义字段名" 
            value={customField} 
            onChange={e=>setCustomField(e.target.value)} 
          />
          <button className="config-btn" onClick={handleAddCustomField} type="button">添加字段</button>
        </div>
      </div>
      
      <div className="config-card config-template-row">
        <input 
          className="config-template-input" 
          placeholder="模板名称" 
          value={templateName} 
          onChange={e=>setTemplateName(e.target.value)} 
        />
        <button className="config-btn" onClick={handleSaveTemplate} type="button">保存为模板</button>
      </div>
      
      <button 
        className="config-main-btn" 
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? '处理中...' : '提交并预览'}
      </button>
      
      <button 
        className="config-main-btn" 
        onClick={handleSelectAllAndPreview}
        disabled={loading}
        style={{ marginLeft: '12px' }}
      >
        {loading ? '处理中...' : '全部勾选并预览'}
      </button>
    </div>
  );
}

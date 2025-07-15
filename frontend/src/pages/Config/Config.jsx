import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  
  const navigate = useNavigate();
  const location = useLocation();

  // 获取当前选中的文档信息
  useEffect(() => {
    // 检查是否从预览页面返回
    if (location.state?.fromPreview) {
      const { documentCode, currentConfig } = location.state;
      setDocumentInfo({ document_code: documentCode });
      
      // 恢复之前的配置
      const restoredConfig = {};
      Object.entries(currentConfig).forEach(([key, method]) => {
        restoredConfig[key] = { checked: true, method };
      });
      setSelected(restoredConfig);
      
      console.log('Config页面 - 从预览页面返回，恢复配置:', currentConfig);
      return;
    }
    
    // 优先用location.state传递的数据
    const docs = location.state?.selectedDocuments;
    if (docs && docs.length > 0) {
      setSelectedDocuments(docs);
      if (docs.length === 1) {
        setDocumentInfo(docs[0]);
      }
      console.log('Config页面 - 来自location.state:', docs);
      return;
    }
    // 兼容单个文档处理
    const documentCode = window.selectedDocumentCode;
    if (documentCode) {
      loadDocumentInfo(documentCode);
      return;
    }
    console.log('没有找到选中的文档信息');
  }, [location.state]);

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
    // 获取要处理的文档代码
    let documentCodes = [];
    if (selectedDocuments.length > 0) {
      documentCodes = selectedDocuments.map(doc => doc.document_code);
    } else if (window.selectedDocumentCode) {
      documentCodes = [window.selectedDocumentCode];
    } else {
      setError('请先选择要处理的文档');
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

    // 添加调试信息
    console.log('=== 发送给后端的参数 ===');
    console.log('文档代码:', documentCodes);
    console.log('配置参数:', config);
    console.log('选中的字段详情:', selected);
    console.log('========================');

    setLoading(true);
    setError('');

    try {
      // 批量处理所有选中的文档
      const results = [];
      for (const documentCode of documentCodes) {
        try {
          console.log(`正在处理文档: ${documentCode}`);
          const result = await processDocument(documentCode, config);
          console.log(`文档 ${documentCode} 处理结果:`, result);
          results.push({
            documentCode,
            success: result.success,
            data: result
          });
        } catch (err) {
          console.error(`文档 ${documentCode} 处理失败:`, err);
          results.push({
            documentCode,
            success: false,
            error: err.message
          });
        }
      }

      // 检查处理结果
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      console.log('=== 处理结果汇总 ===');
      console.log('总文档数:', totalCount);
      console.log('成功处理数:', successCount);
      console.log('详细结果:', results);
      console.log('==================');

      if (successCount === 0) {
        setError('所有文档处理失败');
      } else if (successCount < totalCount) {
        setError(`部分文档处理失败，成功处理 ${successCount}/${totalCount} 个文档`);
      } else {
        // 全部成功，显示成功消息
        alert(`成功处理 ${successCount} 个文档！`);
        
        // 如果是单个文档处理，跳转到预览页面
        if (documentCodes.length === 1) {
          const processedDocumentId = results[0].data.processed_document.id;
          navigate('/preview', {
            state: {
              documentCode: documentCodes[0],
              processedDocumentId: processedDocumentId
            }
          });
        } else {
          // 批量处理完成，返回Dashboard页面
          window.selectedDocuments = [];
          window.selectedDocumentCodes = [];
          window.selectedDocumentCode = null;
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('处理失败:', err);
      setError(err.message || '处理失败');
    } finally {
      setLoading(false);
    }
  }

  // 全部勾选并处理（演示功能）
  async function handleSelectAllAndProcess() {
    // 获取要处理的文档代码
    let documentCodes = [];
    if (selectedDocuments.length > 0) {
      documentCodes = selectedDocuments.map(doc => doc.document_code);
    } else if (window.selectedDocumentCode) {
      documentCodes = [window.selectedDocumentCode];
    } else {
      setError('请先选择要处理的文档');
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
      // 批量处理所有选中的文档
      const results = [];
      for (const documentCode of documentCodes) {
        try {
          const result = await processDocument(documentCode, allConfig);
          results.push({
            documentCode,
            success: result.success,
            data: result
          });
        } catch (err) {
          results.push({
            documentCode,
            success: false,
            error: err.message
          });
        }
      }

      // 检查处理结果
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      if (successCount === 0) {
        setError('所有文档处理失败');
      } else if (successCount < totalCount) {
        setError(`部分文档处理失败，成功处理 ${successCount}/${totalCount} 个文档`);
      } else {
        // 全部成功，显示成功消息
        alert(`成功处理 ${successCount} 个文档！`);
        // 清空选中的文档
        window.selectedDocuments = [];
        window.selectedDocumentCodes = [];
        window.selectedDocumentCode = null;
        // 返回Dashboard页面
        navigate('/dashboard');
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

      {selectedDocuments.length > 0 && (
        <div className="config-selected-docs">
          <strong>选中的文档 ({selectedDocuments.length} 个):</strong>
          <ul>
            {selectedDocuments.map((doc, index) => (
              <li key={index}>{doc.filename} ({doc.file_size_mb}MB)</li>
            ))}
          </ul>
        </div>
      )}

      {documentInfo && selectedDocuments.length === 0 && (
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
        {loading ? '处理中...' : '提交处理'}
      </button>
      
      <button 
        className="config-main-btn" 
        onClick={handleSelectAllAndProcess}
        disabled={loading}
        style={{ marginLeft: '12px' }}
      >
        {loading ? '处理中...' : '全部勾选并处理'}
      </button>
    </div>
  );
}

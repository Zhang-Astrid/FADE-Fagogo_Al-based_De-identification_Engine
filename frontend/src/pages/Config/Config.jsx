import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { processDocument, getDocumentDetail } from "../../api/redact";

// 配置常量
const CONFIG_CONSTANTS = {
  fields: [
    { group: "敏感信息类型", fields: [
      { key: "name", label: "姓名 (NER)" },
      { key: "address", label: "地址 (NER)" },
      { key: "company", label: "公司名 (NER)" },
      { key: "email", label: "邮箱 (正则)" },
      { key: "sens_number", label: "长数字字母混合 (正则)" },
    ]},
  ],
  methodOptions: [
    { value: "black", label: "黑条遮挡" },
    { value: "mosaic", label: "马赛克" },
    { value: "blur", label: "高斯模糊" },
  ],
  computeOptions: [
    { value: "cpu", label: "CPU" },
    { value: "gpu", label: "GPU" },
  ],
  modelOptions: [
    { value: "ner", label: "NER" },
    { value: "llm", label: "LLM" },
  ],
  defaults: {
    computeMode: 'cpu',
    modelType: 'ner',
    method: 'black'
  }
};

export default function Config() {
  const [fields] = useState(CONFIG_CONSTANTS.fields);
  const [selected, setSelected] = useState({}); // {name: {checked: true, method: 'blur'}}
  const [computeMode, setComputeMode] = useState(CONFIG_CONSTANTS.defaults.computeMode); // CPU/GPU选择
  const [modelType, setModelType] = useState(CONFIG_CONSTANTS.defaults.modelType); // NER/LLM选择
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

  // 处理字段勾选状态变化
  function handleFieldCheck(group, key, checked) {
    setSelected(sel => ({
      ...sel,
      [key]: { ...sel[key], checked }
    }));
  }
  
  // 处理字段方法选择变化
  function handleMethodChange(key, method) {
    setSelected(sel => ({
      ...sel,
      [key]: { ...sel[key], method }
    }));
  }

  // 构建处理配置
  function buildProcessConfig() {
    const config = {};
    fields.forEach(group => {
      group.fields.forEach(field => {
        if (selected[field.key]?.checked) {
          config[field.key] = selected[field.key].method || CONFIG_CONSTANTS.defaults.method;
        } else {
          config[field.key] = 'empty';
        }
      });
    });
    
    // 添加处理配置选项
    config.compute_mode = computeMode;
    config.model_type = modelType;
    
    return config;
  }

  // 获取要处理的文档代码
  function getDocumentCodes() {
    if (selectedDocuments.length > 0) {
      return selectedDocuments.map(doc => doc.document_code);
    } else if (window.selectedDocumentCode) {
      return [window.selectedDocumentCode];
    }
    return [];
  }
  

  
  async function handleSubmit() {
    // 获取要处理的文档代码
    const documentCodes = getDocumentCodes();
    if (documentCodes.length === 0) {
      setError('请先选择要处理的文档');
      return;
    }

    // 构建处理配置
    const config = buildProcessConfig();

    if (Object.keys(config).length === 0) {
      setError('请至少选择一个字段进行处理');
      alert('请至少选择一个字段进行处理');
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

  // 全部勾选并处理
  async function handleSelectAllAndProcess() {
    // 获取要处理的文档代码
    const documentCodes = getDocumentCodes();
    if (documentCodes.length === 0) {
      setError('请先选择要处理的文档');
      return;
    }

    // 先勾选所有字段并设置为黑色遮挡
    const newSelected = {};
    fields.forEach(group => {
      group.fields.forEach(field => {
        newSelected[field.key] = {
          checked: true,
          method: CONFIG_CONSTANTS.defaults.method // 设置为默认方法
        };
      });
    });
    
    // 更新选中状态
    setSelected(newSelected);

    // 构建处理配置
    const allConfig = buildProcessConfig();
    
    if (Object.keys(allConfig).length === 0) {
      setError('没有可处理的字段');
      alert('没有可处理的字段');
      return;
    }

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
      {/* 页面标题 */}
      <h1 className="config-title">脱敏配置</h1>
      
      {error && (
        <div className="config-error">
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
        <div className="config-document-info">
          <strong>当前文档:</strong> {documentInfo.filename} ({documentInfo.file_size_mb}MB)
        </div>
      )}
      
      {/* 处理配置区域 */}
      <div className="config-card">
        <div className="config-section-title">处理配置</div>
        <div className="config-options-row">
          <div className="config-option-group">
            <label className="config-option-label">计算模式:</label>
            <select 
              className="config-option-select" 
              value={computeMode} 
              onChange={e => setComputeMode(e.target.value)}
            >
              {CONFIG_CONSTANTS.computeOptions.map(opt => (
                <option value={opt.value} key={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="config-option-group">
            <label className="config-option-label">模型类型:</label>
            <select 
              className="config-option-select" 
              value={modelType} 
              onChange={e => setModelType(e.target.value)}
            >
              {CONFIG_CONSTANTS.modelOptions.map(opt => (
                <option value={opt.value} key={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* 字段选择区域 */}
      <div className="config-card">
        <div className="config-section-header">
          <div className="config-section-title">字段与模糊方式选择</div>
          <button 
            className="config-main-btn config-secondary-btn" 
            onClick={handleSelectAllAndProcess}
            disabled={loading}
          >
            {loading ? '处理中...' : '全部勾选并处理(默认黑条遮挡)'}
          </button>
        </div>
        <div className="config-field-groups">
          {fields.map((g, i) => (
            <div className="config-field-group" key={g.group+"-"+i}>
              <div className="config-field-list">
                {g.fields.map(f => (
                  <div className="config-field-item" key={f.key}>
                    <div className="config-field-checkbox">
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
                          value={selected[f.key]?.method||CONFIG_CONSTANTS.methodOptions[0].value} 
                          onChange={e=>handleMethodChange(f.key, e.target.value)}
                        >
                          {CONFIG_CONSTANTS.methodOptions.map(opt => <option value={opt.value} key={opt.value}>{opt.label}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 提交按钮 */}
      <button 
        className="config-main-btn" 
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? '处理中...' : '提交处理'}
      </button>
    </div>
  );
}

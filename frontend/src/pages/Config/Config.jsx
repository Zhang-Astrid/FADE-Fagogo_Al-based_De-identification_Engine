import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { processDocument, getDocumentDetail, getProcessedDocumentInfo } from "../../api/redact";

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
    { value: "black", label: "遮挡" },
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

// 字段方法参数的默认值
const MOSAIC_SIZE_DEFAULT = 30; // 百分比
const BLUR_KERNEL_DEFAULT = 30; // 百分比
const BLACK_COLOR_DEFAULT = '#000000';

export default function Config() {
  const [fields] = useState(CONFIG_CONSTANTS.fields);
  const [selected, setSelected] = useState({}); // {name: {checked: true, method: 'blur'}}
  const [computeMode, setComputeMode] = useState(CONFIG_CONSTANTS.defaults.computeMode); // CPU/GPU选择
  const [modelType, setModelType] = useState(CONFIG_CONSTANTS.defaults.modelType); // NER/LLM选择
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [documentInfo, setDocumentInfo] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const pollingRef = React.useRef(null);
  
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
    setSelected(sel => {
      const prev = sel[key] || {};
      // 如果勾选且未设置method，自动设为'black'（遮挡）
      let method = prev.method;
      let color = prev.color;
      if (checked && !method) {
        method = 'black';
        color = BLACK_COLOR_DEFAULT;
      }
      return {
      ...sel,
        [key]: {
          ...prev,
          checked,
          method,
          color
        }
      };
    });
  }
  
  // 处理字段方法选择变化
  function handleMethodChange(key, method) {
    setSelected(sel => ({
      ...sel,
      [key]: {
        ...sel[key],
        method,
        // 切换时重置参数
        mosaicSize: method === 'mosaic' ? MOSAIC_SIZE_DEFAULT : undefined,
        blurKernel: method === 'blur' ? BLUR_KERNEL_DEFAULT : undefined,
        color: method === 'black' ? BLACK_COLOR_DEFAULT : undefined
      }
    }));
  }

  // 处理mosaic size滑块变化
  function handleMosaicSizeChange(key, value) {
    setSelected(sel => ({
      ...sel,
      [key]: {
        ...sel[key],
        mosaicSize: value
      }
    }));
  }
  // 处理blur kernel滑块变化
  function handleBlurKernelChange(key, value) {
    // 只允许奇数
    const oddValue = value % 2 === 0 ? value + 1 : value;
    setSelected(sel => ({
      ...sel,
      [key]: {
        ...sel[key],
        blurKernel: oddValue
      }
    }));
  }
  // 处理black color选择
  function handleColorChange(key, value) {
    setSelected(sel => ({
      ...sel,
      [key]: {
        ...sel[key],
        color: value
      }
    }));
  }

  // 构建处理配置
  function buildProcessConfig() {
    const config = {};
    fields.forEach(group => {
      group.fields.forEach(field => {
        if (selected[field.key]?.checked) {
          config[field.key] = selected[field.key].method || CONFIG_CONSTANTS.defaults.method;
          // 附加参数
          if (selected[field.key].method === 'mosaic') {
            config[`${field.key}_mosaic_size`] = selected[field.key].mosaicSize || MOSAIC_SIZE_DEFAULT;
          } else {
            config[`${field.key}_mosaic_size`] = null;
          }
          if (selected[field.key].method === 'blur') {
            config[`${field.key}_blur_kernel`] = selected[field.key].blurKernel || BLUR_KERNEL_DEFAULT;
          } else {
            config[`${field.key}_blur_kernel`] = null;
          }
          if (selected[field.key].method === 'black') {
            config[`${field.key}_color`] = selected[field.key].color || BLACK_COLOR_DEFAULT;
          } else {
            config[`${field.key}_color`] = null;
          }
        } else {
          config[field.key] = 'empty';
          config[`${field.key}_mosaic_size`] = null;
          config[`${field.key}_blur_kernel`] = null;
          config[`${field.key}_color`] = null;
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
    navigate('/preview'); // 新增：立即跳转到预览界面

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

      const successCount = results.filter(r => r.success).length;

      // 1. 立即弹窗“已提交处理任务...”
      alert(`已提交 ${successCount} 个文档的处理任务，请稍候，处理完成后会自动刷新。`);

      // 2. 只对成功提交的文档进行轮询
      const processingList = results.filter(r => r.success).map(r => ({
        documentCode: r.documentCode,
        processedId: r.data.processed_document?.id
      })).filter(r => r.processedId);

      // 启动轮询
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (processingList.length > 0) {
        pollingRef.current = setInterval(async () => {
          try {
            // 并发请求所有文档状态
            const statusArr = await Promise.all(
              processingList.map(item => getProcessedDocumentInfo(item.processedId))
            );
            // 检查是否全部完成
            const allCompleted = statusArr.every(info => info.status === 'completed');
            if (allCompleted) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
              alert(`成功处理 ${processingList.length} 个文档！`);
              // 跳转，无论单个还是批量都跳转到Preview
              navigate('/preview', {
                state: {
                  documentCode: processingList[0].documentCode,
                  processedDocumentId: processingList[0].processedId
                }
              });
            }
          } catch {
            // 失败时不终止轮询
          }
        }, 3000);
      }
    } catch (err) {
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
          method: CONFIG_CONSTANTS.defaults.method, // black
          color: BLACK_COLOR_DEFAULT,
          mosaicSize: undefined,
          blurKernel: undefined
        };
      });
    });
    setSelected(newSelected);

    // 构建所有字段均为黑条遮挡的 config
    const allConfig = {};
    fields.forEach(group => {
      group.fields.forEach(field => {
        allConfig[field.key] = 'black';
        allConfig[`${field.key}_color`] = BLACK_COLOR_DEFAULT;
        allConfig[`${field.key}_mosaic_size`] = null;
        allConfig[`${field.key}_blur_kernel`] = null;
      });
    });
    allConfig.compute_mode = computeMode;
    allConfig.model_type = modelType;

    if (Object.keys(allConfig).length === 0) {
      setError('没有可处理的字段');
      alert('没有可处理的字段');
      return;
    }

    setLoading(true);
    setError('');
    navigate('/preview'); // 新增：立即跳转到预览界面

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
        // 清空选中的文档
        window.selectedDocuments = [];
        window.selectedDocumentCodes = [];
        window.selectedDocumentCode = null;
        // 跳转到 PDF 预览页面，传递第一个文档的参数
        if (results.length > 0 && results[0].data && results[0].data.processed_document) {
          navigate('/preview', {
            state: {
              documentCode: results[0].documentCode,
              processedDocumentId: results[0].data.processed_document.id
            }
          });
        }
      }
    } catch (err) {
      console.error('处理失败:', err);
      setError(err.message || '处理失败');
    } finally {
      setLoading(false);
    }
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // 字段渲染函数，避免重复
  function renderField(field, group, selected, handleFieldCheck, handleMethodChange, handleMosaicSizeChange, handleBlurKernelChange, handleColorChange) {
    const method = selected[field.key]?.method || CONFIG_CONSTANTS.methodOptions[0].value;
    return (
      <div className="config-field-row" key={field.key}>
        <div className="config-field-main">
          <input
            type="checkbox"
            id={field.key}
            checked={selected[field.key]?.checked || false}
            onChange={e => handleFieldCheck(group, field.key, e.target.checked)}
          />
          <label htmlFor={field.key}>{field.label}</label>
          {selected[field.key]?.checked && (
            <select
              className="config-method-select"
              value={method}
              onChange={e => handleMethodChange(field.key, e.target.value)}
            >
              {CONFIG_CONSTANTS.methodOptions.map(opt => (
                <option value={opt.value} key={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="config-field-extra">
          {selected[field.key]?.checked && (
            <>
              {method === 'mosaic' && (
                <>
                  <label>马赛克块大小：</label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={selected[field.key].mosaicSize || MOSAIC_SIZE_DEFAULT}
                    onChange={e => handleMosaicSizeChange(field.key, Number(e.target.value))}
                  />
                  <span>{selected[field.key].mosaicSize || MOSAIC_SIZE_DEFAULT}%</span>
                  <MosaicPreview percent={selected[field.key].mosaicSize || MOSAIC_SIZE_DEFAULT} />
                </>
              )}
              {method === 'blur' && (
                <>
                  <label>模糊核大小：</label>
                  <input
                    type="range"
                    min={1}
                    max={99}
                    step={2}
                    value={selected[field.key].blurKernel || BLUR_KERNEL_DEFAULT}
                    onChange={e => handleBlurKernelChange(field.key, Number(e.target.value))}
                  />
                  <span>{selected[field.key].blurKernel || BLUR_KERNEL_DEFAULT}%</span>
                  <BlurPreview percent={selected[field.key].blurKernel || BLUR_KERNEL_DEFAULT} />
                </>
              )}
              {method === 'black' && (
                <>
                  <label>遮挡颜色：</label>
                  <input
                    type="color"
                    value={selected[field.key].color || BLACK_COLOR_DEFAULT}
                    onChange={e => handleColorChange(field.key, e.target.value)}
                  />
                  <span>{selected[field.key].color || BLACK_COLOR_DEFAULT}</span>
                  <BlackPreview color={selected[field.key].color || BLACK_COLOR_DEFAULT} />
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
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
          {/* 单列：姓名 */}
          <div className="config-field-single">
            {renderField(fields[0].fields[0], fields[0].group, selected, handleFieldCheck, handleMethodChange, handleMosaicSizeChange, handleBlurKernelChange, handleColorChange)}
          </div>
          {/* 单列：地址 */}
          <div className="config-field-single">
            {renderField(fields[0].fields[1], fields[0].group, selected, handleFieldCheck, handleMethodChange, handleMosaicSizeChange, handleBlurKernelChange, handleColorChange)}
          </div>
          {/* 单列：公司名 */}
          <div className="config-field-single">
            {renderField(fields[0].fields[2], fields[0].group, selected, handleFieldCheck, handleMethodChange, handleMosaicSizeChange, handleBlurKernelChange, handleColorChange)}
          </div>
          {/* 单列：邮箱 */}
          <div className="config-field-single">
            {renderField(fields[0].fields[3], fields[0].group, selected, handleFieldCheck, handleMethodChange, handleMosaicSizeChange, handleBlurKernelChange, handleColorChange)}
          </div>
          {/* 单列：长数字字母混合 */}
          <div className="config-field-single">
            {renderField(fields[0].fields[4], fields[0].group, selected, handleFieldCheck, handleMethodChange, handleMosaicSizeChange, handleBlurKernelChange, handleColorChange)}
          </div>
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

// 预览组件
function MosaicPreview({ percent }) {
  const ref = React.useRef();
  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 20px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('案例', canvas.width/2, canvas.height/2);
    const blockSize = Math.max(2, Math.round(percent/100 * 20));
    const temp = document.createElement('canvas');
    temp.width = Math.ceil(canvas.width/blockSize);
    temp.height = Math.ceil(canvas.height/blockSize);
    const tctx = temp.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(canvas, 0, 0, temp.width, temp.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, canvas.width, canvas.height);
  }, [percent]);
  return (
    <span className="mosaic-preview-root">
      <canvas ref={ref} width={36} height={18} className="mosaic-preview-canvas" />
      <span className="mosaic-preview-label">块{Math.max(2,Math.round(percent/100*20))}px</span>
    </span>
  );
}
function BlurPreview({ percent }) {
  const blur = percent/10;
  return (
    <div className="blur-preview-root" style={{filter:`blur(${blur}px)`}}></div>
  );
}
function BlackPreview({ color }) {
  return <div className="black-preview-root" style={{background:color}}></div>;
}

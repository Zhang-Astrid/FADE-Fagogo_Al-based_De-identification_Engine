// 获取认证token
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

// 获取文件上传的认证头
function getUploadHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Token ${token}`,
  };
}

// 上传PDF文件
export async function uploadPDF(file) {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('未登录或Token丢失，请重新登录');
  }
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/documents/upload/', {
      method: 'POST',
      headers: getUploadHeaders(),
      body: formData
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('无权限或登录已过期，请重新登录');
      }
      if (response.status === 409) {
        return {
          success: false,
          error: data.error,
          message: data.message,
          existing_document: data.existing_document,
          duplicate_reason: data.duplicate_reason
        };
      }
      throw new Error(data.error || '上传失败');
    }

    return data;
  } catch (err) {
    // 新增：详细日志
    console.error('上传PDF网络错误:', err);
    throw err;
  }
}

// 获取用户文档列表
export async function getUserDocuments() {
  const response = await fetch('/api/documents/list/', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '获取文档列表失败');
  }
  
  return await response.json();
}

// 获取文档详情
export async function getDocumentDetail(documentCode) {
  const response = await fetch(`/api/documents/detail/${documentCode}/`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '获取文档详情失败');
  }
  
  return await response.json();
}

// 处理文档
export async function processDocument(documentCode, config) {
  // 添加调试信息
  console.log('=== API请求参数 ===');
  console.log('document_code:', documentCode);
  console.log('config:', config);
  console.log('请求体:', JSON.stringify({
    document_code: documentCode,
    config: config
  }, null, 2));
  console.log('==================');

  const requestBody = {
    document_code: documentCode,
    config: config
  };

  try {
    const response = await fetch('/api/documents/process/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody)
    });
    
    console.log('=== 后端响应 ===');
    console.log('响应状态:', response.status);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('后端错误:', errorData);
      throw new Error(errorData.error || '处理失败');
    }
    
    const responseData = await response.json();
    console.log('响应数据:', responseData);
    console.log('==================');
    
    return responseData;
  } catch (error) {
    console.error('=== 网络请求失败 ===');
    console.error('错误详情:', error);
    console.log('==================');
    
    // 如果是网络错误或后端未连接，返回错误信息
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('无法连接到后端服务器，请检查后端是否启动');
    }
    
    throw error;
  }
}

// 获取处理日志
export async function getProcessingLogs(processedDocumentId) {
  const response = await fetch(`/api/documents/logs/${processedDocumentId}/`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '获取处理日志失败');
  }
  
  return await response.json();
}

// 下载处理后的文档
export async function downloadProcessedDocument(processedDocumentId) {
  const response = await fetch(`/api/documents/download/${processedDocumentId}/`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '下载失败');
  }
  
  // 创建下载链接
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `processed_document_${processedDocumentId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// 删除文档
export async function deleteDocument(documentCode) {
  const response = await fetch(`/api/documents/delete/${documentCode}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '删除失败');
  }
  
  return await response.json();
}

// 兼容旧版本的函数
export async function uploadAndRedactPDF(file, config) {
  // 先上传文件
  const uploadResult = await uploadPDF(file);
  const documentCode = uploadResult.document.document_code;
  
  // 然后处理文档
  const processResult = await processDocument(documentCode, config);
  
  return {
    document: uploadResult.document,
    processed_document: processResult.processed_document
  };
}

// 获取预览文件URL
export async function getPreviewFiles(documentCode, processedDocumentId) {
  const response = await fetch(`/api/documents/preview/${documentCode}/${processedDocumentId}/`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '获取预览文件失败');
  }
  
  return await response.json();
}

// 获取处理后的文档信息（包括识别到的敏感信息）
export async function getProcessedDocumentInfo(processedDocumentId) {
  const response = await fetch(`/api/documents/processed-info/${processedDocumentId}/`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '获取处理后文档信息失败');
  }
  
  return await response.json();
}

// 批量下载处理后的文档
export async function downloadBatchProcessedDocuments(documentCodes) {
  const response = await fetch('/api/documents/batch-download/', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ document_codes: documentCodes })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '批量下载失败');
  }
  
  // 创建下载链接
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `processed_documents_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// 重新处理文档（用于预览页面修改配置后重新处理）
export async function reprocessDocument(documentCode, config) {
  console.log('=== 重新处理文档 ===');
  console.log('document_code:', documentCode);
  console.log('config:', config);

  const requestBody = {
    document_code: documentCode,
    config: config,
    reprocess: true // 标识这是重新处理
  };

  try {
    const response = await fetch('/api/documents/reprocess/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody)
    });
    
    console.log('=== 重新处理响应 ===');
    console.log('响应状态:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('重新处理错误:', errorData);
      throw new Error(errorData.error || '重新处理失败');
    }
    
    const responseData = await response.json();
    console.log('重新处理响应数据:', responseData);
    console.log('==================');
    
    return responseData;
  } catch (error) {
    console.error('=== 重新处理网络请求失败 ===');
    console.error('错误详情:', error);
    console.log('==================');
    
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      throw new Error('无法连接到后端服务器，请检查后端是否启动');
    }
    
    throw error;
  }
}

// 获取用户所有处理过的文件
export async function getUserProcessedDocuments() {
  const response = await fetch('/api/documents/processed_list/', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '获取处理结果列表失败');
  }
  return await response.json();
}

// 导出所有处理过的文档为ZIP
export async function exportAllProcessedDocuments() {
  const response = await fetch('/api/documents/export_all/', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '导出失败');
  }
  
  // 创建下载链接
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `all_processed_documents_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// 获取仪表板统计数据
export async function getDashboardStats() {
  const response = await fetch('/api/documents/dashboard_stats/', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '获取仪表板统计数据失败');
  }
  
  return await response.json();
}

// 获取系统配置选项
export async function getSystemConfigOptions() {
  const response = await fetch('/api/documents/config_options/', {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '获取配置选项失败');
  }
  
  return await response.json();
}

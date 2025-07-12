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
  const response = await fetch('/api/documents/process/', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      document_code: documentCode,
      config: config
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '处理失败');
  }
  
  return await response.json();
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

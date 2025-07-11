export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload/', {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    throw new Error('上传失败');
  }
  return await response.json();
}

// week 2 简陋版，后续需要优化

export async function uploadAndRedactPDF(file, config) {
  const formData = new FormData();
  formData.append('file', file);
  if (config) {
    formData.append('config', JSON.stringify(config));
  }
  const response = await fetch('/api/redact_all/', {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    throw new Error('处理失败');
  }
  return await response.json();
}

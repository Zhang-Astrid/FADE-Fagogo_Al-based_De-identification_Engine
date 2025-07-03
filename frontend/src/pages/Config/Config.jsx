import React, { useState } from "react";

const defaultFields = [
  { group: "个人身份信息", fields: [
    { key: "name", label: "姓名" },
    { key: "id", label: "身份证号码" },
    { key: "gender", label: "性别" },
    { key: "birth", label: "出生日期" },
  ]},
  { group: "联系方式", fields: [
    { key: "mobile", label: "手机号码" },
    { key: "phone", label: "固定电话" },
    { key: "email", label: "邮箱" },
  ]},
  { group: "住址信息", fields: [
    { key: "address", label: "居住地址" },
    { key: "work_address", label: "单位地址" },
  ]},
  { group: "职业与单位信息", fields: [
    { key: "work_name", label: "工作单位名称" },
    { key: "job_title", label: "职务" },
  ]},
  { group: "财务信息", fields: [
    { key: "bank_account", label: "银行卡号/账号" },
    { key: "social_account", label: "社保、公积金账户" },
  ]},
  { group: "法律涉案信息", fields: [
    { key: "case_number", label: "证据材料编号、立案编号" },
    { key: "litigant", label: "当事人/证人信息" },
  ]},
  { group: "生物识别信息（如签名及照片）", fields: [
    { key: "bio", label: "照片、签名、指纹图像" },
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
  function handleSubmit() {
    // 跳转预览页
    window.location.href = "/preview";
  }

  return (
    <div className="config-root">
      <h1 className="config-title">脱敏配置</h1>
      <div className="config-card">
        <div className="config-section-title">字段勾选与方式选择</div>
        <div className="config-field-groups">
          {fields.map((g, i) => (
            <div className="config-field-group" key={g.group+"-"+i}>
              <div className="config-field-group-title">{g.group}</div>
              <div className="config-field-list">
                {g.fields.map(f => (
                  <div className="config-field-item" key={f.key}>
                    <input type="checkbox" id={f.key} checked={selected[f.key]?.checked||false} onChange={e=>handleFieldCheck(g.group, f.key, e.target.checked)} />
                    <label htmlFor={f.key}>{f.label}</label>
                    {selected[f.key]?.checked && (
                      <select className="config-method-select" value={selected[f.key]?.method||methodOptions[0].value} onChange={e=>handleMethodChange(f.key, e.target.value)}>
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
          <input className="config-custom-field-input" placeholder="自定义字段名" value={customField} onChange={e=>setCustomField(e.target.value)} />
          <button className="config-btn" onClick={handleAddCustomField} type="button">添加字段</button>
        </div>
      </div>
      <div className="config-card config-template-row">
        <input className="config-template-input" placeholder="模板名称" value={templateName} onChange={e=>setTemplateName(e.target.value)} />
        <button className="config-btn" onClick={handleSaveTemplate} type="button">保存为模板</button>
      </div>
      <button className="config-main-btn" onClick={handleSubmit}>提交并预览</button>
    </div>
  );
}

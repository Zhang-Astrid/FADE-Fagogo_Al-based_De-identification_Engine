#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 开始清理项目结构...');

// 检查是否存在重复的node_modules
const rootNodeModules = path.join(__dirname, 'node_modules');
const frontendNodeModules = path.join(__dirname, 'frontend', 'node_modules');

if (fs.existsSync(frontendNodeModules)) {
    console.log('📦 发现frontend/node_modules，正在删除...');
    try {
        fs.rmSync(frontendNodeModules, { recursive: true, force: true });
        console.log('✅ 已删除 frontend/node_modules');
    } catch (error) {
        console.log('⚠️  删除失败:', error.message);
    }
}

// 重新安装依赖
console.log('📦 重新安装依赖...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ 依赖安装完成');
} catch (error) {
    console.log('❌ 依赖安装失败:', error.message);
}

console.log('🎉 清理完成！现在项目使用统一的node_modules结构。');
console.log('💡 提示：使用 npm run dev 启动项目'); 
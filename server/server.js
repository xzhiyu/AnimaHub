const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase, testConnection } = require('./database');

// 导入路由
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const characterRoutes = require('./routes/characters');
const sceneRoutes = require('./routes/scenes');
const propRoutes = require('./routes/props');
const effectRoutes = require('./routes/effects');
const videoRoutes = require('./routes/videos');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 初始化数据库
async function startServer() {
  try {
    await testConnection();
    await initDatabase();
    console.log('数据库连接和初始化成功');
  } catch (error) {
    console.error('数据库连接或初始化失败:', error);
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`API 基础路径: http://localhost:${PORT}/api`);
  });
}

startServer();

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/characters', characterRoutes);
app.use('/api/projects/:projectId/scenes', sceneRoutes);
app.use('/api/projects/:projectId/props', propRoutes);
app.use('/api/projects/:projectId/effects', effectRoutes);
app.use('/api/projects/:projectId/videos', videoRoutes);
// 兼容前端的API调用方式
app.use('/api/assets/characters', characterRoutes);
app.use('/api/assets/videos', videoRoutes);

// 根路径健康检查
app.get('/api', (req, res) => {
  res.json({ message: 'AnimaHub API 服务运行正常' });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: 'API 端点不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});


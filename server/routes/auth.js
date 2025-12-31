const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../database');
const router = express.Router();
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// 用户注册
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: '密码长度至少为6位' });
  }

  try {
    const connection = await getConnection();
    
    try {
      // 检查用户是否已存在
      const [rows] = await connection.execute('SELECT id FROM users WHERE username = ?', [username]);
      
      if (rows.length > 0) {
        return res.status(400).json({ error: '用户名已存在' });
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);

      // 插入新用户
      const [result] = await connection.execute(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword]
      );

      // 生成JWT令牌
      const token = jwt.sign(
        { id: result.insertId, username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        message: '注册成功', 
        token,
        user: { id: result.insertId, username }
      });
    } finally {
      connection.release(); // 释放连接回连接池
    }
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  try {
    const connection = await getConnection();
    
    try {
      // 查找用户
      const [rows] = await connection.execute(
        'SELECT id, username, password FROM users WHERE username = ?',
        [username]
      );
      
      if (rows.length === 0) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }
      
      const user = rows[0];

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

      // 生成JWT令牌
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ 
        message: '登录成功', 
        token,
        user: { id: user.id, username: user.username }
      });
    } finally {
      connection.release(); // 释放连接回连接池
    }
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
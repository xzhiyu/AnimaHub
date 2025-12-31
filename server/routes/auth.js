const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
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
    // 检查用户是否已存在
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
      if (err) {
        return res.status(500).json({ error: '服务器错误' });
      }

      if (row) {
        return res.status(400).json({ error: '用户名已存在' });
      }

      // 加密密码
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ error: '密码加密失败' });
        }

        // 插入新用户
        db.run(
          'INSERT INTO users (username, password) VALUES (?, ?)',
          [username, hashedPassword],
          function (err) {
            if (err) {
              return res.status(500).json({ error: '注册失败' });
            }

            // 生成JWT令牌
            const token = jwt.sign(
              { id: this.lastID, username },
              JWT_SECRET,
              { expiresIn: '7d' }
            );

            res.json({ 
              message: '注册成功', 
              token,
              user: { id: this.lastID, username }
            });
          }
        );
      });
    });
  } catch (error) {
    res.status(500).json({ error: '注册失败' });
  }
});

// 用户登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  // 查找用户
  db.get(
    'SELECT id, username, password FROM users WHERE username = ?',
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: '服务器错误' });
      }

      if (!user) {
        return res.status(401).json({ error: '用户名或密码错误' });
      }

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
    }
  );
});

module.exports = router;
const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware');
const router = express.Router();

// 为项目生成角色
router.post('/:projectId/generate', authenticateToken, (req, res) => {
  const projectId = req.params.projectId;
  const { name, gender, ageGroup, description, prompt, model, referenceImage } = req.body;
  const userId = req.user.id;

  // 验证项目是否属于当前用户
  const validateQuery = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
  db.get(validateQuery, [projectId, userId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!project) {
      return res.status(404).json({ error: '项目不存在或无权限访问' });
    }

    // 创建角色记录
    const insertQuery = `
      INSERT INTO characters (
        project_id, name, gender, age_group, description, prompt, model, reference_image, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [projectId, name, gender, ageGroup, description, prompt, model, referenceImage, 'GENERATING'],
      function (err) {
        if (err) {
          return res.status(500).json({ error: '创建角色失败' });
        }

        res.json({ 
          message: 'AI生成任务已启动', 
          id: this.lastID,
          status: 'GENERATING'
        });
      }
    );
  });
});

// 为项目上传角色
router.post('/:projectId/upload', authenticateToken, (req, res) => {
  const projectId = req.params.projectId;
  const { name, description, imageUrl } = req.body;
  const userId = req.user.id;

  // 验证项目是否属于当前用户
  const validateQuery = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
  db.get(validateQuery, [projectId, userId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!project) {
      return res.status(404).json({ error: '项目不存在或无权限访问' });
    }

    // 创建角色记录
    const insertQuery = `
      INSERT INTO characters (
        project_id, name, description, image_url, status
      ) VALUES (?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [projectId, name, description, imageUrl, 'DRAFT'],
      function (err) {
        if (err) {
          return res.status(500).json({ error: '上传角色失败' });
        }

        res.json({ 
          message: '角色上传成功', 
          id: this.lastID,
          status: 'DRAFT'
        });
      }
    );
  });
});

// 删除角色
router.delete('/:id', authenticateToken, (req, res) => {
  const characterId = req.params.id;
  const userId = req.user.id;

  // 验证角色是否属于当前用户的项目
  const validateQuery = `
    SELECT c.id 
    FROM characters c
    JOIN projects p ON c.project_id = p.id
    WHERE c.id = ? AND p.user_id = ?
  `;

  db.get(validateQuery, [characterId, userId], (err, character) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!character) {
      return res.status(404).json({ error: '角色不存在或无权限删除' });
    }

    const deleteQuery = 'DELETE FROM characters WHERE id = ?';

    db.run(deleteQuery, [characterId], function (err) {
      if (err) {
        return res.status(500).json({ error: '删除角色失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '角色不存在' });
      }

      res.json({ message: '角色删除成功' });
    });
  });
});

// 获取项目的所有角色
router.get('/project/:projectId', authenticateToken, (req, res) => {
  const projectId = req.params.projectId;
  const userId = req.user.id;

  // 验证项目是否属于当前用户
  const validateQuery = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
  db.get(validateQuery, [projectId, userId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!project) {
      return res.status(404).json({ error: '项目不存在或无权限访问' });
    }

    const query = `
      SELECT 
        id, name, gender, age_group as ageGroup, description, 
        image_url as imageUrl, status, created_at as createdAt
      FROM characters
      WHERE project_id = ?
      ORDER BY created_at DESC
    `;

    db.all(query, [projectId], (err, characters) => {
      if (err) {
        return res.status(500).json({ error: '获取角色列表失败' });
      }

      res.json(characters);
    });
  });
});

module.exports = router;
const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware');
const router = express.Router();

// 为项目创建场景
router.post('/:projectId', authenticateToken, (req, res) => {
  const projectId = req.params.projectId;
  const { name, description, prompt, imageUrl } = req.body;
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

    // 创建场景记录
    const insertQuery = `
      INSERT INTO scenes (
        project_id, name, description, prompt, image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [projectId, name, description, prompt, imageUrl, 'DRAFT'],
      function (err) {
        if (err) {
          return res.status(500).json({ error: '创建场景失败' });
        }

        res.json({ 
          message: '场景创建成功', 
          id: this.lastID,
          status: 'DRAFT'
        });
      }
    );
  });
});

// 删除场景
router.delete('/:id', authenticateToken, (req, res) => {
  const sceneId = req.params.id;
  const userId = req.user.id;

  // 验证场景是否属于当前用户的项目
  const validateQuery = `
    SELECT s.id 
    FROM scenes s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = ? AND p.user_id = ?
  `;

  db.get(validateQuery, [sceneId, userId], (err, scene) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!scene) {
      return res.status(404).json({ error: '场景不存在或无权限删除' });
    }

    const deleteQuery = 'DELETE FROM scenes WHERE id = ?';

    db.run(deleteQuery, [sceneId], function (err) {
      if (err) {
        return res.status(500).json({ error: '删除场景失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '场景不存在' });
      }

      res.json({ message: '场景删除成功' });
    });
  });
});

module.exports = router;
const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware');
const router = express.Router();

// 为项目创建特效
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

    // 创建特效记录
    const insertQuery = `
      INSERT INTO effects (
        project_id, name, description, prompt, image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [projectId, name, description, prompt, imageUrl, 'DRAFT'],
      function (err) {
        if (err) {
          return res.status(500).json({ error: '创建特效失败' });
        }

        res.json({ 
          message: '特效创建成功', 
          id: this.lastID,
          status: 'DRAFT'
        });
      }
    );
  });
});

// 删除特效
router.delete('/:id', authenticateToken, (req, res) => {
  const effectId = req.params.id;
  const userId = req.user.id;

  // 验证特效是否属于当前用户的项目
  const validateQuery = `
    SELECT e.id 
    FROM effects e
    JOIN projects p ON e.project_id = p.id
    WHERE e.id = ? AND p.user_id = ?
  `;

  db.get(validateQuery, [effectId, userId], (err, effect) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!effect) {
      return res.status(404).json({ error: '特效不存在或无权限删除' });
    }

    const deleteQuery = 'DELETE FROM effects WHERE id = ?';

    db.run(deleteQuery, [effectId], function (err) {
      if (err) {
        return res.status(500).json({ error: '删除特效失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '特效不存在' });
      }

      res.json({ message: '特效删除成功' });
    });
  });
});

module.exports = router;
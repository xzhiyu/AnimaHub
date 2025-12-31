const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware');
const router = express.Router();

// 为项目创建道具
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

    // 创建道具记录
    const insertQuery = `
      INSERT INTO props (
        project_id, name, description, prompt, image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [projectId, name, description, prompt, imageUrl, 'DRAFT'],
      function (err) {
        if (err) {
          return res.status(500).json({ error: '创建道具失败' });
        }

        res.json({ 
          message: '道具创建成功', 
          id: this.lastID,
          status: 'DRAFT'
        });
      }
    );
  });
});

// 删除道具
router.delete('/:id', authenticateToken, (req, res) => {
  const propId = req.params.id;
  const userId = req.user.id;

  // 验证道具是否属于当前用户的项目
  const validateQuery = `
    SELECT p.id 
    FROM props p
    JOIN projects p2 ON p.project_id = p2.id
    WHERE p.id = ? AND p2.user_id = ?
  `;

  db.get(validateQuery, [propId, userId], (err, prop) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!prop) {
      return res.status(404).json({ error: '道具不存在或无权限删除' });
    }

    const deleteQuery = 'DELETE FROM props WHERE id = ?';

    db.run(deleteQuery, [propId], function (err) {
      if (err) {
        return res.status(500).json({ error: '删除道具失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '道具不存在' });
      }

      res.json({ message: '道具删除成功' });
    });
  });
});

module.exports = router;
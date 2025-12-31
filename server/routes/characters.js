const express = require('express');
const { getConnection } = require('../database');
const { authenticateToken } = require('../middleware');
const router = express.Router();

// 为项目生成角色
router.post('/:projectId/generate', authenticateToken, async (req, res) => {
  const projectId = req.params.projectId;
  const { name, gender, ageGroup, description, prompt, model, referenceImage } = req.body;
  const userId = req.user.id;

  try {
    const connection = await getConnection();
    
    try {
      // 验证项目是否属于当前用户
      const validateQuery = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
      const [rows] = await connection.execute(validateQuery, [projectId, userId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '项目不存在或无权限访问' });
      }

      // 创建角色记录
      const insertQuery = `
        INSERT INTO characters (
          project_id, name, gender, age_group, description, prompt, model, reference_image, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(
        insertQuery,
        [projectId, name, gender, ageGroup, description, prompt, model, referenceImage, 'GENERATING']
      );

      res.json({ 
        message: 'AI生成任务已启动', 
        id: result.insertId,
        status: 'GENERATING'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('生成角色失败:', error);
    res.status(500).json({ error: '生成角色失败' });
  }
});

// 为项目上传角色
router.post('/:projectId/upload', authenticateToken, async (req, res) => {
  const projectId = req.params.projectId;
  const { name, description, imageUrl } = req.body;
  const userId = req.user.id;

  try {
    const connection = await getConnection();
    
    try {
      // 验证项目是否属于当前用户
      const validateQuery = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
      const [rows] = await connection.execute(validateQuery, [projectId, userId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '项目不存在或无权限访问' });
      }

      // 创建角色记录
      const insertQuery = `
        INSERT INTO characters (
          project_id, name, description, image_url, status
        ) VALUES (?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(
        insertQuery,
        [projectId, name, description, imageUrl, 'DRAFT']
      );

      res.json({ 
        message: '角色上传成功', 
        id: result.insertId,
        status: 'DRAFT'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('上传角色失败:', error);
    res.status(500).json({ error: '上传角色失败' });
  }
});

// 删除角色
router.delete('/:id', authenticateToken, async (req, res) => {
  const characterId = req.params.id;
  const userId = req.user.id;

  try {
    const connection = await getConnection();
    
    try {
      // 验证角色是否属于当前用户的项目
      const validateQuery = `
        SELECT c.id 
        FROM characters c
        JOIN projects p ON c.project_id = p.id
        WHERE c.id = ? AND p.user_id = ?
      `;

      const [rows] = await connection.execute(validateQuery, [characterId, userId]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: '角色不存在或无权限删除' });
      }

      const deleteQuery = 'DELETE FROM characters WHERE id = ?';

      const [result] = await connection.execute(deleteQuery, [characterId]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: '角色不存在' });
      }

      res.json({ message: '角色删除成功' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('删除角色失败:', error);
    res.status(500).json({ error: '删除角色失败' });
  }
});

// 获取项目的所有角色
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  const projectId = req.params.projectId;
  const userId = req.user.id;

  try {
    const connection = await getConnection();
    
    try {
      // 验证项目是否属于当前用户
      const validateQuery = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
      const [rows] = await connection.execute(validateQuery, [projectId, userId]);
      
      if (rows.length === 0) {
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

      const [characters] = await connection.execute(query, [projectId]);
      
      res.json(characters);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ error: '获取角色列表失败' });
  }
});

module.exports = router;
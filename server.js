const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const requireSsl = (process.env.PGSSLMODE || '').toLowerCase() === 'require';
const requireChannelBinding = (process.env.PGCHANNELBINDING || '').toLowerCase() === 'require';
const supabaseBucket = process.env.SUPABASE_BUCKET || 'blog-covers';

const looksLikeS3Endpoint = (value) => /\/storage\/v1\/s3\/?$/i.test(value || '');
const inferProjectUrlFromS3Endpoint = (endpoint) => {
  if (!endpoint) return null;
  try {
    const parsed = new URL(endpoint);
    if (!parsed.hostname.endsWith('.storage.supabase.co')) return null;
    const projectRef = parsed.hostname.replace('.storage.supabase.co', '');
    return `${parsed.protocol}//${projectRef}.supabase.co`;
  } catch {
    return null;
  }
};

const rawSupabaseUrl = process.env.SUPABASE_URL;
const supabaseS3Endpoint =
  process.env.SUPABASE_S3_ENDPOINT || (looksLikeS3Endpoint(rawSupabaseUrl) ? rawSupabaseUrl : null);
const supabaseProjectUrl = looksLikeS3Endpoint(rawSupabaseUrl)
  ? inferProjectUrlFromS3Endpoint(rawSupabaseUrl)
  : rawSupabaseUrl;
const publicBaseUrl = supabaseProjectUrl || inferProjectUrlFromS3Endpoint(supabaseS3Endpoint);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseS3Region = process.env.SUPABASE_S3_REGION || 'us-east-1';
const supabaseS3AccessKeyId = process.env.SUPABASE_S3_ACCESS_KEY_ID;
const supabaseS3SecretAccessKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;
const useS3Upload =
  !!supabaseS3Endpoint && !!supabaseS3AccessKeyId && !!supabaseS3SecretAccessKey;

let s3Client = null;
if (useS3Upload) {
  s3Client = new S3Client({
    region: supabaseS3Region,
    endpoint: supabaseS3Endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: supabaseS3AccessKeyId,
      secretAccessKey: supabaseS3SecretAccessKey,
    },
  });
}

// initialize supabase client for non-S3 upload fallback
let supabase = null;
if (supabaseProjectUrl && supabaseServiceKey) {
  if (supabaseServiceKey.startsWith('sb_publishable_')) {
    console.warn('SUPABASE_SERVICE_KEY is a publishable key. Use a service role/secret key for backend uploads.');
  }
  supabase = createClient(supabaseProjectUrl, supabaseServiceKey);
}

if (!useS3Upload && !supabase) {
  console.warn('No valid upload credentials found. Configure Supabase service key or S3 credentials.');
}

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const poolConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

if (requireSsl) {
  poolConfig.ssl = { rejectUnauthorized: false };
}

if (requireChannelBinding) {
  poolConfig.enableChannelBinding = true;
}

const pool = new Pool(poolConfig);

// Test database connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Routes

// GET /posts - Get all posts
app.get('/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /posts/:slug - Get post by slug
app.get('/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query('SELECT * FROM posts WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /posts - Create new post
app.post('/posts', async (req, res) => {
  try {
    const { slug, title, excerpt, date, reading_time, author, role, category, tags, cover, content, key_takeaways } = req.body;
    const result = await pool.query(
      'INSERT INTO posts (slug, title, excerpt, date, reading_time, author, role, category, tags, cover, content, key_takeaways) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [slug, title, excerpt, date, reading_time, author, role, category, JSON.stringify(tags), cover, JSON.stringify(content), JSON.stringify(key_takeaways)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Post with this slug already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// PUT /posts/:slug - Update post
app.put('/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, excerpt, date, reading_time, author, role, category, tags, cover, content, key_takeaways } = req.body;
    const result = await pool.query(
      'UPDATE posts SET title = $1, excerpt = $2, date = $3, reading_time = $4, author = $5, role = $6, category = $7, tags = $8, cover = $9, content = $10, key_takeaways = $11 WHERE slug = $12 RETURNING *',
      [title, excerpt, date, reading_time, author, role, category, JSON.stringify(tags), cover, JSON.stringify(content), JSON.stringify(key_takeaways), slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /posts/:slug - Delete post
app.delete('/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await pool.query('DELETE FROM posts WHERE slug = $1 RETURNING *', [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// upload image via Supabase storage
const upload = multer({ storage: multer.memoryStorage() });
app.post('/upload', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;

    if (useS3Upload) {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: supabaseBucket,
          Key: fileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype || 'application/octet-stream',
          CacheControl: 'max-age=3600',
        })
      );

      if (!publicBaseUrl) {
        return res.status(500).json({
          error: 'SUPABASE_URL (project URL) is required to build the public URL after S3 upload.',
        });
      }

      const publicUrl = `${publicBaseUrl}/storage/v1/object/public/${supabaseBucket}/${fileName}`;
      return res.json({ url: publicUrl });
    }

    if (!supabase) {
      return res.status(500).json({
        error: 'Upload credentials are missing. Configure S3 credentials or a Supabase service key.',
      });
    }

    const { error } = await supabase.storage
      .from(supabaseBucket)
      .upload(fileName, req.file.buffer, { cacheControl: '3600', upsert: false });
    if (error) throw error;

    const { data: publicData, error: urlError } = supabase.storage
      .from(supabaseBucket)
      .getPublicUrl(fileName);
    if (urlError) throw urlError;

    return res.json({ url: publicData.publicUrl });
  } catch (err) {
    console.error('Upload error', err);
    if (err.statusCode === '404') {
      return res.status(500).json({
        error: `Bucket "${supabaseBucket}" not found. Create it in Supabase Storage or change SUPABASE_BUCKET.`,
      });
    }
    if (err.statusCode === '403') {
      return res.status(500).json({
        error: 'Upload credentials do not have permissions. Check your Supabase service key or S3 credentials.',
      });
    }
    return res.status(500).json({ error: 'Upload failed' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

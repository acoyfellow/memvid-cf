import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { FC } from 'hono/jsx'
import { z } from 'zod'
import { cosineSimilarity, generateQRCodeSVG } from './utils'
import type { CloudflareEnv } from './env'

const app = new Hono<{ Bindings: CloudflareEnv & { AI: any } }>()

// Security middleware
app.use('*', cors({
  origin: ['http://localhost:8787', 'https://*.workers.dev'],
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['Content-Type'],
}))

// Zod schemas for validation
const EncodeSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text must be less than 10,000 characters'),
  id: z.string()
    .min(1, 'ID is required')
    .max(100, 'ID must be less than 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID can only contain letters, numbers, hyphens, and underscores')
})

const QuerySchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt must be less than 1,000 characters')
})

// TypeScript types derived from Zod schemas
type EncodeRequest = z.infer<typeof EncodeSchema>
type QueryRequest = z.infer<typeof QuerySchema>

// Helper function to handle Zod validation
function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error.errors[0]?.message || 'Validation failed' }
}

// Layout component
const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <title>Memvid-CF - QR + AI Embeddings</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Avenir, Inter, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
          }
          .container { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 2rem;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 2rem;
            margin: 1rem 0;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          h1 { 
            color: white; 
            text-align: center; 
            margin-bottom: 2rem;
            font-size: 2.5rem;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          h2 { 
            color: #4a5568; 
            margin-bottom: 1rem;
            font-size: 1.5rem;
          }
          input, textarea, button {
            width: 100%;
            padding: 12px;
            margin: 8px 0;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
          }
          input:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }
          button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            cursor: pointer;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
          }
          button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          .result {
            margin-top: 1rem;
            padding: 1rem;
            background: #f7fafc;
            border-radius: 8px;
            border-left: 4px solid #667eea;
          }
          .qr-display {
            text-align: center;
            margin: 1rem 0;
          }
          .qr-display svg {
            max-width: 300px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            background: white;
            padding: 1rem;
          }
          .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
          }
          @media (max-width: 768px) {
            .grid { grid-template-columns: 1fr; }
            .container { padding: 1rem; }
            h1 { font-size: 2rem; }
          }
        `}</style>
      </head>
      <body>
        {props.children}
      </body>
    </html>
  )
}

// Main page component
const HomePage: FC = () => {
  return (
    <Layout>
      <div class="container">
        <h1>🔗 Memvid-CF</h1>
        <p style="text-align: center; color: white; margin-bottom: 2rem; font-size: 1.2rem;">
          QR Code Generation + AI-Powered Semantic Search
        </p>
        
        <div class="grid">
          <div class="card">
            <h2>📝 Encode Text to QR</h2>
            <p style="color: #718096; margin-bottom: 1rem;">
              Create a QR code and store it with AI embeddings for semantic search
            </p>
            <form id="encodeForm">
              <input 
                type="text" 
                id="encodeId" 
                placeholder="Unique ID (e.g., doc-123)" 
                required 
              />
              <textarea 
                id="encodeText" 
                placeholder="Enter text to encode (URL, message, etc.)" 
                rows={4} 
                required
              ></textarea>
              <button type="submit" id="encodeBtn">
                Generate QR Code
              </button>
            </form>
            <div id="encodeResult" class="result" style="display: none;"></div>
          </div>

          <div class="card">
            <h2>🔍 Search by Meaning</h2>
            <p style="color: #718096; margin-bottom: 1rem;">
              Find QR codes using natural language - search by meaning, not exact text
            </p>
            <form id="queryForm">
              <input 
                type="text" 
                id="queryText" 
                placeholder="Describe what you're looking for..." 
                required 
              />
              <button type="submit" id="queryBtn">
                Search QR Codes
              </button>
            </form>
            <div id="queryResult" class="result" style="display: none;"></div>
          </div>
        </div>

        <div class="card" style="margin-top: 2rem;">
          <h2>💡 How it works</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-top: 1rem;">
            <div style="text-align: center; padding: 1rem;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">📝</div>
              <h3 style="color: #4a5568; margin-bottom: 0.5rem;">1. Encode</h3>
              <p style="color: #718096;">Enter text and get a QR code. We generate AI embeddings for semantic search.</p>
            </div>
            <div style="text-align: center; padding: 1rem;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🧠</div>
              <h3 style="color: #4a5568; margin-bottom: 0.5rem;">2. AI Processing</h3>
              <p style="color: #718096;">Cloudflare AI creates vector embeddings to understand meaning.</p>
            </div>
            <div style="text-align: center; padding: 1rem;">
              <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
              <h3 style="color: #4a5568; margin-bottom: 0.5rem;">3. Smart Search</h3>
              <p style="color: #718096;">Search by meaning, not exact words. Find related content easily.</p>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
        // Encode form handler
        document.getElementById('encodeForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('encodeBtn');
          const result = document.getElementById('encodeResult');
          const id = document.getElementById('encodeId').value;
          const text = document.getElementById('encodeText').value;
          
          btn.innerHTML = '<span class="loading"></span> Generating...';
          btn.disabled = true;
          result.style.display = 'none';
          
          try {
            const response = await fetch('/encode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, text })
            });
            
            if (response.ok) {
              result.innerHTML = 
                '<div style="color: #38a169; font-weight: 600;">✅ Success!</div>' +
                '<p>QR code generated and stored with ID: <strong>' + id + '</strong></p>' +
                '<p>AI embeddings created for semantic search.</p>';
              result.style.display = 'block';
              document.getElementById('encodeForm').reset();
            } else {
              throw new Error('Failed to encode');
            }
          } catch (error) {
            result.innerHTML = 
              '<div style="color: #e53e3e; font-weight: 600;">❌ Error</div>' +
              '<p>Failed to generate QR code. Please try again.</p>';
            result.style.display = 'block';
          }
          
          btn.innerHTML = 'Generate QR Code';
          btn.disabled = false;
        });

        // Query form handler
        document.getElementById('queryForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('queryBtn');
          const result = document.getElementById('queryResult');
          const prompt = document.getElementById('queryText').value;
          
          btn.innerHTML = '<span class="loading"></span> Searching...';
          btn.disabled = true;
          result.style.display = 'none';
          
          try {
            const response = await fetch('/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt })
            });
            
            if (response.ok) {
              const data = await response.json();
              result.innerHTML = 
                '<div style="color: #38a169; font-weight: 600;">🎯 Found matching QR code!</div>' +
                '<div style="margin: 1rem 0; padding: 1rem; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #4299e1;">' +
                  '<h4 style="margin: 0 0 0.5rem 0; color: #2d3748;">Original Text (ID: ' + data.id + '):</h4>' +
                  '<p style="margin: 0; white-space: pre-wrap; font-family: Georgia, serif; line-height: 1.6;">' + data.text + '</p>' +
                  '<small style="color: #718096; margin-top: 0.5rem; display: block;">Similarity Score: ' + (data.score * 100).toFixed(1) + '%</small>' +
                '</div>' +
                '<div class="qr-display">' + data.qrCode + '</div>' +
                '<p style="text-align: center; color: #718096;">Right-click to save the QR code</p>';
              result.style.display = 'block';
            } else if (response.status === 404) {
              result.innerHTML = 
                '<div style="color: #ed8936; font-weight: 600;">🤷‍♂️ No matches found</div>' +
                '<p>Try a different search term or create some QR codes first.</p>';
              result.style.display = 'block';
            } else {
              throw new Error('Search failed');
            }
          } catch (error) {
            result.innerHTML = 
              '<div style="color: #e53e3e; font-weight: 600;">❌ Error</div>' +
              '<p>Search failed. Please try again.</p>';
            result.style.display = 'block';
          }
          
          btn.innerHTML = 'Search QR Codes';
          btn.disabled = false;
        });
        `
      }}></script>
    </Layout>
  )
}

// Routes
app.get('/', (c) => {
  return c.html(<HomePage />)
})

app.post('/encode', async (c) => {
  try {
    const requestData = await c.req.json()
    const validation = validateRequest(EncodeSchema, requestData)
    
    if (!validation.success) {
      return c.json({ error: validation.error }, 400)
    }

    const { text, id } = validation.data
    const svg = generateQRCodeSVG(text)
    await c.env.QR_BUCKET.put(`${id}.svg`, svg)
    
    // Use AI binding directly
    const embeddingResp = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text })
    console.log('🧠 Encode embedding response:', embeddingResp)
    const embedding = embeddingResp.data[0] || embeddingResp.data
    console.log('🧠 Encode embedding length:', embedding.length)
    
    await c.env.DB.prepare(
      'INSERT INTO entries (id, text, embedding) VALUES (?, ?, ?)'
    ).bind(id, text, JSON.stringify(embedding)).run()
    return c.json({ success: true })
  } catch (error) {
    console.error('Encode error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

app.post('/query', async (c) => {
  try {
    const requestData = await c.req.json()
    const validation = validateRequest(QuerySchema, requestData)
    
    if (!validation.success) {
      return c.json({ error: validation.error }, 400)
    }

    const { prompt } = validation.data
    console.log('🔍 Searching for:', prompt)
    
    // Use AI binding directly
    const queryResp = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', { text: prompt })
    console.log('🧠 Query embedding response:', queryResp)
    const queryVec = queryResp.data[0] || queryResp.data
    console.log('🧠 Query embedding length:', queryVec.length)
    
    const { results } = await c.env.DB.prepare('SELECT * FROM entries').all()
    console.log('📊 Found entries in DB:', results?.length || 0)
    
    if (!results || results.length === 0) {
      return c.notFound()
    }
    
    let bestMatch: any = null
    let bestScore = -Infinity
    for (const row of results) {
      const storedEmbedding = JSON.parse(row.embedding)
      const score = cosineSimilarity(queryVec, storedEmbedding)
      console.log(`📈 Score for "${row.id}": ${score}`)
      if (score > bestScore) {
        bestScore = score
        bestMatch = row
      }
    }
    
    console.log('🎯 Best match:', bestMatch?.id, 'with score:', bestScore)
    
    if (!bestMatch || bestScore < 0.6) { // Set threshold to 60% for good semantic matching
      return c.notFound()
    }
    
    const qr = await c.env.QR_BUCKET.get(`${bestMatch.id}.svg`)
    if (!qr) {
      console.log('❌ QR code not found in bucket for:', bestMatch.id)
      return c.notFound()
    }
    
    // Return both QR code and text as JSON
    return c.json({
      id: bestMatch.id,
      text: bestMatch.text,
      qrCode: await qr.text(),
      score: bestScore,
      createdAt: bestMatch.created_at
    })
  } catch (error) {
    console.error('Query error:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default app 
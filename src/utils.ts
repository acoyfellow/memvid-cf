import QRCode from 'qrcode-svg'

export async function generateEmbedding(text: string, ai: any): Promise<number[]> {
  const resp = await ai.run('@cf/baai/bge-base-en-v1.5', { text })
  return resp.data
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))
  return dot / (magA * magB)
}

export function generateQRCodeSVG(text: string): string {
  const qr = new QRCode({ 
    content: text || "https://workers.dev",
    padding: 4,
    width: 256,
    height: 256,
    color: "#000000",
    background: "#ffffff",
    ecl: "M"
  })
  return qr.svg()
}

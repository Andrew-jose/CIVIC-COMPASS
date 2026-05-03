/**
 * CIVIC COMPASS — Embedding Service
 * Uses Gemini Embedding 2 for RAG.
 */

import { generateEmbedding, getGeminiClient, MODELS } from './geminiService';

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  dimensions: number;
}

export interface SimilarityResult {
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

export async function embedText(text: string): Promise<EmbeddingResult> {
  const embedding = await generateEmbedding(text);
  return { text, embedding, dimensions: embedding.length };
}

export async function embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
  const client = getGeminiClient();
  const results: EmbeddingResult[] = [];
  const batchSize = 10;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await Promise.all(
      batch.map(async (text) => {
        try {
          const response = await client.models.embedContent({
            model: MODELS.EMBEDDING,
            contents: text,
          });
          return {
            text,
            embedding: (response as any).embedding?.values || [],
            dimensions: (response as any).embedding?.values?.length || 0,
          };
        } catch (error) {
          console.error(`[EmbeddingService] Failed:`, error);
          return { text, embedding: [], dimensions: 0 };
        }
      })
    );
    results.push(...embeddings);
  }
  return results;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function findSimilar(
  query: string,
  documents: Array<{ text: string; embedding: number[]; metadata?: Record<string, any> }>,
  topK: number = 5
): Promise<SimilarityResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const scored = documents.map((doc) => ({
    text: doc.text,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
    metadata: doc.metadata,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

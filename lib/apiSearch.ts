import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

// Get index with proper host
const index = pinecone.index(
  process.env.PINECONE_INDEX_NAME!,
  process.env.PINECONE_INDEX_HOST!
);

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  if (!query) {
    return { error: "Query parameter 'q' is required" };
  }

  try {
    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
      dimensions: 3072,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Query Pinecone with namespace
    const queryResponse = await index.namespace("default").query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
      includeValues: false,
    });

    const matches = queryResponse.matches.map((match) => ({
      text: match.metadata?.text || "",
      score: match.score,
    }));

    // Prepare context for ChatGPT
    const context = matches.map((match) => match.text).join("\n\n");

    // Get answer from ChatGPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Use the provided context to answer the question. If the context doesn't contain relevant information, say so.",
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${query}`,
        },
      ],
    });

    return {
      answer: completion.choices[0].message.content,
      top_3_matches: matches,
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return { error: "An error occurred while processing your request" };
  }
}

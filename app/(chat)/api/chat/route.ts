import { openai } from "@ai-sdk/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { customModel } from "@/ai";
import { auth } from "@/app/(auth)/auth";
import { deleteChatById, getChatById, saveChat } from "@/db/queries";
import OpenAI from "openai";
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openaiEmbeddings = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get the latest user message
  const latestMessage = messages[messages.length - 1];

  // Query Pinecone for relevant context
  const embeddingResponse = await openaiEmbeddings.embeddings.create({
    model: "text-embedding-3-large",
    input: latestMessage.content,
    dimensions: 3072,
  });

  const embedding = embeddingResponse.data[0].embedding;

  const searchResults = await pinecone
    .index(process.env.PINECONE_INDEX_NAME!)
    .namespace("default")
    .query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
      includeValues: false,
    });

  const context = searchResults.matches
    .map((match) => match.metadata?.text || "")
    .join("\n\n");

  const coreMessages = convertToCoreMessages(messages);

  const result = await streamText({
    model: customModel,
    system:
      "you are TunaTalk, The Fin-telligent Chat for JPMorgan Hooking insights from your data, one byte at a time. Use the provided context to enhance your responses when relevant. Use the provided context to answer the question. If the context doesn't contain relevant information, say so.",
    messages: [
      ...coreMessages,
      { role: "system", content: `Relevant context:\n${context}` },
    ],
    maxSteps: 5,
    tools: {
      getWeather: {
        description: "Get the current weather at a location",
        parameters: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        execute: async ({ latitude, longitude }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
          );

          const weatherData = await response.json();
          return weatherData;
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}

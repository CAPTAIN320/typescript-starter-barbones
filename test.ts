
import { config } from "dotenv";
config();
import { z } from "zod";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import {
  StructuredOutputParser,
  OutputFixingParser,
} from "langchain/output_parsers";

const presentationOutputParser = StructuredOutputParser.fromZodSchema(
  z.array(
      z.object({
        title: z.string().describe("The title of the presentation"),
        slides: z.array(
          z.object({
            slideTitle: z.string().describe("The title of the slide"),
            content: z.string().describe("The content of the slide"),
            slideNumber: z.number().describe("The slide number"),
          })
        )
        .describe("An array of Slides, each representing a slide in the presentation")
      })
    )
    .describe("An array of the presentation")
);

const chatModel = new ChatOpenAI({
  modelName: "gpt-4", // Or gpt-3.5-turbo
  temperature: 0, // For best results with the output fixing parser
  maxRetries: 0, // For setting max retries
  maxConcurrency: 5, // For rate limiting
});

const presentationOutputFixingParser = OutputFixingParser.fromLLM(chatModel, presentationOutputParser);

// Don't forget to include formatting instructions in the prompt!
const presentationPrompt = new PromptTemplate({
  template: `You are an Expert level ChatGPT Prompt Engineer with expertise in various subject matters.
            Create the best possible ChatGPT response to a prompt I provide.
            I want a presentation about {query}.
            You are an expert on the topic.
            Create exactly 30 slides.
            3 sentences per slide.
            The last slide is Conclusion.\n{format_instructions}\n{query}`,
  inputVariables: ["query"],
  partialVariables: {
    format_instructions: presentationOutputFixingParser.getFormatInstructions(),
  },
});

const presentationAnswerFormattingChain = new LLMChain({
  llm: chatModel,
  prompt: presentationPrompt,
  outputKey: "records", // For readability - otherwise the chain output will default to a property named "text"
  outputParser: presentationOutputFixingParser,
});

const presentationResult = await presentationAnswerFormattingChain.call({
  query: "Dota 2",
});
console.log(JSON.stringify(presentationResult.records, null, 2));

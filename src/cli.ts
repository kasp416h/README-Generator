#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
import { generateReadme } from "./index";

const program = new Command();
const configPath = process.env.README_GENERATOR_CONFIG;
if (configPath) {
  dotenv.config({ path: path.join(configPath, ".env") });
}

// Function to set the API key
async function setApiKey(key: string) {
  try {
    if (configPath) {
      await fs.writeFile(
        path.join(configPath, ".env"),
        `OPENAI_API_KEY=${key}`
      );
      console.log("API key set successfully.");
    } else {
      console.error(
        "Please set the README_GENERATOR_CONFIG environment variable."
      );
      process.exit(1);
    }
  } catch (error: any) {
    console.error(`Error setting API key: ${error.message}`);
  }
}

// Function to run the README generation
async function runGenerateReadme(
  projectPath: string,
  extraInstructions: string = ""
) {
  try {
    console.log(
      `Generating README for project at ${projectPath} with these extra instructions: ${extraInstructions}`
    );
    const readmeContent = await generateReadme(projectPath, extraInstructions);

    const readmePath = path.join(projectPath, "README.md");

    await fs.writeFile(readmePath, readmeContent);

    console.log(`README successfully generated at ${readmePath}`);
  } catch (error: any) {
    console.error(`Error generating README: ${error.message}`);
  }
}

program
  .name("readme-generator")
  .description("CLI to generate project READMEs using GPT-4");

program
  .command("set-api-key <key>")
  .description("Set your OpenAI API key")
  .action(setApiKey);

program
  .command("generate <projectPath>")
  .description("Generate README for the specified project path")
  .option(
    "-i, --instructions <instructions>",
    "Additional instructions for the README"
  )
  .action((projectPath, options) => {
    runGenerateReadme(projectPath, options.instructions);
  });

program.parse(process.argv);

import * as fs from "fs/promises";
import * as path from "path";
import axios from "axios";

type FileInfo = {
  name: string;
  path: string;
  content: string | null;
  type: string;
};

type ProjectData = {
  projectName: string;
  projectDescription: string;
  additionalInfo: string[];
};

async function listFiles(
  dir: string,
  excludeDirs: string[] = [
    "node_modules",
    "dist",
    "android",
    "ios",
    "build",
    ".yarn",
    ".expo",
    ".git",
    "assets",
  ],
  excludeFiles: string[] = [
    ".gitignore",
    ".env",
    "package-lock.json",
    "yarn.lock",
    ".yarnrc.yml",
    "tsconfig.json",
    "google-services.json",
    "GoogleService-Info.plist",
    ".DS_Store",
  ]
): Promise<string[]> {
  let fileList: string[] = [];

  async function recurse(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (let entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          await recurse(entryPath);
        }
      } else {
        if (!excludeFiles.includes(entry.name)) {
          fileList.push(entryPath);
        }
      }
    }
  }

  await recurse(dir);
  return fileList;
}

async function processFile(filePath: string): Promise<FileInfo> {
  const ext = path.extname(filePath);
  const fileInfo: FileInfo = {
    name: path.basename(filePath),
    path: filePath,
    content: null,
    type: ext,
  };

  try {
    const content = await fs.readFile(filePath, "utf8");

    if (filePath.endsWith(".json") && fileInfo.name === "package.json") {
      const jsonContent = JSON.parse(content);
      fileInfo.name = jsonContent.name;
      fileInfo.content = jsonContent.description;
    } else if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
      const comments = extractComments(content, ext);
      fileInfo.content = comments;
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error}`);
  }

  return fileInfo;
}

function extractComments(content: string, ext: string): string {
  let extractedComments: string = "";

  if (ext === ".js") {
    const comments = content.match(/\/\*[\s\S]*?\*\/|\/\/.*/g) || [];
    extractedComments = comments.join("\n").trim();
  } else if (ext === ".jsx") {
    const comments = content.match(/\/\*[\s\S]*?\*\/|\/\/.*/g) || [];
    extractedComments = comments.join("\n").trim();
  } else if (ext === ".ts") {
    const comments = content.match(/\/\*[\s\S]*?\*\/|\/\/.*/g) || [];
    extractedComments = comments.join("\n").trim();
  } else if (ext === ".tsx") {
    const comments = content.match(/\/\*[\s\S]*?\*\/|\/\/.*/g) || [];
    extractedComments = comments.join("\n").trim();
  }

  return extractedComments;
}

async function compileData(
  filesData: FileInfo[],
  extraInstructions: string = ""
): Promise<string> {
  const projectData: ProjectData = {
    projectName: "Unnamed Project",
    projectDescription: "A description of the project.",
    additionalInfo: [],
  };

  for (const file of filesData) {
    if (file.path.endsWith(".json") && file.name === "package.json") {
      try {
        projectData.projectName = file.name || projectData.projectName;
        projectData.projectDescription =
          file.content || projectData.projectDescription;
      } catch (error) {
        console.error(`Error reading or parsing package.json: ${error}`);
      }
    } else if ([".js", ".jsx", ".ts", ".tsx"].includes(file.type)) {
      if (file.content) {
        projectData.additionalInfo.push(file.content);
      }
    }
  }

  const prompt = `Create a README.md for a project named "${
    projectData.projectName
  }". Description: "${
    projectData.projectDescription
  }". following these instructions: ${extraInstructions}. And use this next info to enchance the description in explaining how the project works and what it does, but looking at the code of the files inside: Additional details:\n${projectData.additionalInfo.join(
    "\n"
  )}`;

  return prompt;
}

async function generateReadme(
  projectDir: string,
  extraInstructions: string = ""
): Promise<string> {
  try {
    const fileList = await listFiles(projectDir);
    console.log(fileList);
    const filesData = await Promise.all(
      fileList.map((filePath) => processFile(filePath))
    );
    console.log(filesData);
    const prompt = await compileData(filesData, extraInstructions);
    console.log(prompt);
    const apiKey = process.env.OPENAI_API_KEY;
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Your system message here (if any)" },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error(`Error generating README: ${error.message}`);
    throw error;
  }
}

export { generateReadme };

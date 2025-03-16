# 🤖 LIGMA - LLMs.txt Instant Generator for Machine Accessibility

## 🌟 Overview
LIGMA (LLMs.txt Instant Generator for Machine Accessibility) is your secret weapon for preparing codebases to be consumed by Large Language Models! It flattens complex directory structures into a single, digestible text file that your favorite AI assistant can actually understand. No more context window limitations holding you back!

## ✨ Super Cool Features

- 📂 **Directory Structure Visualization**: See your entire project hierarchy in one beautiful ASCII tree
- 📄 **Smart Content Processing**: Automatically ignores irrelevant files and simplifies large chunks
- 🖼️ **Image Filtering**: Says "no thanks" to those pesky binary files eating up your context window
- 💪 **Style Tag Compression**: Shrinks those bloated CSS blocks down to size
- 🗂️ **Intelligent Ignoring**: Skips node_modules, package-lock.json, and other files that just add noise

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/agnt-gg/slop
cd /slop/utilities/llmstxt-instant-generator-for-machine-accessability

# No installation needed! Just run with Node.js
```

## 🏃‍♂️ Usage

### Generating Your LLMs.txt File

```bash
# Navigate to the directory you want to process
cd /path/to/your/project

# Run LIGMA
node /path/to/LIGMA.cjs

# That's it! Your llms.txt file will appear in the current directory
```

## 🧙‍♂️ How It Works

LIGMA works its magic by:

1. Scanning your project directory recursively
2. Building a beautiful ASCII directory tree structure
3. Processing each file to make it LLM-friendly:
   - Simplifying CSS and large JSON files
   - Skipping binary and image files
   - Compressing SVG content
4. Writing everything to a single, neat llms.txt file
5. Making your AI assistant very, very happy

## 🔧 Customization

Need to ignore additional files or directories? Simply edit the `IGNORED_ITEMS` array:

```javascript
const IGNORED_ITEMS = [
  'output.txt',
  'node_modules',
  // Add your own items here!
];
```

## ⚙️ Requirements

- Node.js (any modern version)
- A project that needs LLM-friendly flattening
- That's it!

## 📜 License

MIT (It's free! Go wild!)

---

Created with ❤️ for developers who want their LLMs to actually understand their code.

**Remember**: A well-fed LLM is a helpful LLM, and nothing feeds an LLM better than a properly flattened codebase!

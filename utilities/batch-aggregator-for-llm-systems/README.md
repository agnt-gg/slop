# 🎯 BALLS (Batch Aggregator for LLM-friendly Systems)

A powerful tool for aggregating multiple codebases into a single, AI-friendly format. Works seamlessly with LIGMA to create comprehensive codebase comparisons and analysis.

## 🌟 Overview

BALLS is designed to help developers and teams:
- Compare different codebases or frameworks side by side
- Aggregate multiple repositories into a single, digestible format
- Enable AI-powered code analysis across multiple projects
- Create comprehensive codebase audits

## ✨ Features

- Batch processing of multiple repositories
- Version-aware codebase comparison
- Configurable repository selection via balls.json
- Seamless integration with LIGMA
- Support for tagging and categorizing repositories

## 🚀 Getting Started

### Prerequisites

- Node.js
- LIGMA installed and configured
- Access to target repositories

### Installation

1. Clone the repository:
```bash
git clone https://github.com/agnt-gg/slop
cd slop/utilities/batch-aggregator-for-llm-systems
```

2. Create a `balls.json` configuration file:
```json
{
  "repos": [
    {
      "path": "/path/to/repo1",
      "tag": "tag1"
    },
    {
      "path": "/path/to/repo2",
      "tag": "tag2"
    }
  ]
}
```

3. Run BALLS:
```bash
node BALLS.cjs
```

## 💡 Use Cases

### Framework Comparison
- Compare React, Vue, Angular, and Svelte implementations
- Analyze architectural differences between frameworks
- Identify best practices across different approaches

### Codebase Audits
- Automated security audits across multiple repositories
- Code quality analysis across project boundaries
- Dependency management analysis

### Legacy Code Understanding
- Generate structural maps of old codebases
- Help new engineers understand complex systems
- Document architectural decisions

## 🛠️ Integration

BALLS works as part of a larger ecosystem:
- **LIGMA**: Flattens individual codebases
- **BALLS**: Aggregates multiple codebases
- **JOHNSON**: Optimizes the final output

### Example Workflow

1. Use LIGMA to flatten individual repositories
2. Use BALLS to aggregate multiple repositories
3. Use JOHNSON to optimize the final output
4. Analyze the results for insights

## 🔄 Version Control

BALLS supports version-aware comparisons:
- Compare different versions of the same framework
- Track architectural changes over time
- Generate before/after comparisons

## 📝 Output

BALLS generates a `combined_llms.txt` file that contains:
- Aggregated code from all specified repositories
- Clear separation between different repositories
- Tag-based organization for easy reference

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

Created with ❤️ for the developer community

---

Made with [LIGMA](https://github.com/yourusername/slop/tree/main/utilities/llmstxt-instant-generator-for-machine-accessability) and [JOHNSON](https://github.com/yourusername/slop/tree/main/utilities/joined-output-handler-for-neural-system-optimization)

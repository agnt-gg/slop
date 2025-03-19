const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

// Configuration file for BALLS
const BALLS_CONFIG = 'balls.json';

function generateBalls() {
  try {
    // Read the configuration
    console.log('📂 Reading configuration from:', path.resolve(__dirname, BALLS_CONFIG));
    const config = JSON.parse(fs.readFileSync(BALLS_CONFIG, 'utf8'));
    console.log('📋 Configuration:', JSON.stringify(config, null, 2));
    
    const llmFiles = [];

    // Get the absolute path to LIGMA
    const ligmaPath = path.resolve(__dirname, '../llmstxt-instant-generator-for-machine-accessability/LIGMA.cjs');
    console.log('🔧 LIGMA path:', ligmaPath);
    
    if (!fs.existsSync(ligmaPath)) {
      throw new Error(`LIGMA not found at: ${ligmaPath}`);
    }

    // Loop through each repository path
    for (let repo of config.repos) {
      const repoPath = path.resolve(__dirname, repo.path);
      console.log(`\n🔄 Processing repository: ${repoPath}`);
      
      if (!fs.existsSync(repoPath)) {
        console.warn(`⚠️ Warning: Repository path does not exist: ${repoPath}`);
        continue;
      }

      try {
        // Run LIGMA on the repository
        console.log(`📝 Running LIGMA in: ${repoPath}`);
        child_process.execSync(`cd "${repoPath}" && node "${ligmaPath}"`, { 
          stdio: 'inherit',
          shell: true // Add shell: true for better cross-platform compatibility
        });
        
        // Add the generated llms.txt to our list
        const llmFile = path.join(repoPath, 'llms.txt');
        if (fs.existsSync(llmFile)) {
          console.log(`✅ Found llms.txt at: ${llmFile}`);
          llmFiles.push(llmFile);
        } else {
          console.warn(`⚠️ Warning: llms.txt not found in ${repoPath}`);
        }
      } catch (repoError) {
        console.error(`❌ Error processing repository ${repoPath}:`, repoError);
      }
    }

    if (llmFiles.length === 0) {
      throw new Error('No llms.txt files were generated!');
    }

    // Aggregate all the llms.txt files
    console.log('\n📦 Aggregating llms.txt files...');
    let combinedLlmText = '';
    for (let file of llmFiles) {
      const content = fs.readFileSync(file, 'utf8');
      combinedLlmText += `\n---\nRepository: ${path.basename(path.dirname(file))}\n---\n${content}\n`;
    }

    // Write the combined content to a new file
    const outputPath = path.resolve(__dirname, 'combined_llms.txt');
    fs.writeFileSync(outputPath, combinedLlmText);
    console.log(`\n✅ BALLS has aggregated your repositories into ${outputPath}`);
    console.log(`📊 Total size: ${combinedLlmText.length} bytes`);
  } catch (error) {
    console.error('\n❌ Error in generating BALLS:', error);
    process.exit(1);
  }
}

// Run BALLS
generateBalls(); 
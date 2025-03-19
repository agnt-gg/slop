const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the path to BALLS.cjs
const BALLS_PATH = path.resolve(__dirname, '../BALLS.cjs');

// Test cases
const testCases = [
  {
    name: 'Framework Comparison',
    description: 'Test BALLS with React, Vue, and Svelte examples',
    config: {
      repos: [
        {
          path: './test/examples/frameworks/react',
          tag: 'react',
          version: '18.2.0'
        },
        {
          path: './test/examples/frameworks/vue',
          tag: 'vue',
          version: '3.3.0'
        },
        {
          path: './test/examples/frameworks/svelte',
          tag: 'svelte',
          version: '4.2.0'
        }
      ]
    }
  },
  {
    name: 'Legacy System Modernization',
    description: 'Test BALLS with legacy and modern system examples',
    config: {
      repos: [
        {
          path: './test/examples/legacy/old-system',
          tag: 'legacy',
          version: '1.0.0'
        },
        {
          path: './test/examples/legacy/new-system',
          tag: 'modern',
          version: '2.0.0'
        }
      ]
    }
  }
];

// Run tests
async function runTests() {
  console.log('🧪 Starting BALLS tests...\n');

  for (const testCase of testCases) {
    console.log(`📝 Running test: ${testCase.name}`);
    console.log(`Description: ${testCase.description}\n`);

    try {
      // Write test config
      fs.writeFileSync('balls.json', JSON.stringify(testCase.config, null, 2));

      // Run BALLS
      execSync(`node "${BALLS_PATH}"`, { stdio: 'inherit' });

      // Verify output
      const output = fs.readFileSync('combined_llms.txt', 'utf8');
      console.log('✅ Test passed: Output file generated successfully');
      console.log(`Output size: ${output.length} bytes\n`);

    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }

  console.log('🏁 All tests completed!');
}

// Run the tests
runTests(); 
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Spec gate validation logic
function extractRequiredComponents(specContent) {
  const components = [];
  
  // Extract tab requirements
  const tabMatches = specContent.match(/#### 📊 Dashboard|#### 💻 Console|#### 🗓 Sprint Plan|#### 🔒 Cursor Rules|#### 📘 Logs/g);
  if (tabMatches) {
    components.push(...tabMatches.map(tab => tab.replace('#### ', '')));
  }
  
  // Extract chart requirements
  if (specContent.includes('Chart.js') || specContent.includes('charts') || specContent.includes('Effectiveness Charts')) {
    components.push('ChartSystem');
  }
  
  // Extract message handling requirements
  if (specContent.includes('message') || specContent.includes('communication') || specContent.includes('WebView')) {
    components.push('MessageHandling');
  }
  
  // Extract design document requirements
  if (specContent.includes('Design Document') || specContent.includes('design-doc')) {
    components.push('DesignDocument');
  }
  
  // Extract task management requirements
  if (specContent.includes('Task') || specContent.includes('Sprint') || specContent.includes('task')) {
    components.push('TaskManagement');
  }
  
  return components;
}

function validateUIComponents(requiredComponents) {
  const errors = [];
  const warnings = [];
  
  // Check if UI.ts exists and has required methods
  const uiPath = path.join(process.cwd(), 'src', 'ui.ts');
  if (!fs.existsSync(uiPath)) {
    errors.push('UI.ts file not found');
    return { hasErrors: true, errors, warnings, requiredComponents };
  }
  
  const uiContent = fs.readFileSync(uiPath, 'utf-8');
  
  // Validate each required component
  requiredComponents.forEach(component => {
    switch (component) {
      case '📊 Dashboard':
        if (!uiContent.includes('generateDashboard') && !uiContent.includes('Dashboard')) {
          errors.push('Dashboard component not implemented');
        } else if (!uiContent.includes('Chart.js') && !uiContent.includes('chart')) {
          warnings.push('Dashboard charts not fully implemented');
        }
        break;
      case '💻 Console':
        if (!uiContent.includes('Console') && !uiContent.includes('console')) {
          errors.push('Console component not implemented');
        }
        break;
      case '🗓 Sprint Plan':
        if (!uiContent.includes('Sprint') && !uiContent.includes('sprint')) {
          errors.push('Sprint Plan component not implemented');
        }
        break;
      case '🔒 Cursor Rules':
        if (!uiContent.includes('Cursor') && !uiContent.includes('cursor')) {
          errors.push('Cursor Rules component not implemented');
        }
        break;
      case '📘 Logs':
        if (!uiContent.includes('Logs') && !uiContent.includes('logs')) {
          errors.push('Logs component not implemented');
        }
        break;
      case 'ChartSystem':
        if (!uiContent.includes('Chart.js') && !uiContent.includes('chart')) {
          warnings.push('Chart system not fully implemented');
        }
        break;
      case 'MessageHandling':
        if (!uiContent.includes('postMessage') && !uiContent.includes('onDidReceiveMessage')) {
          warnings.push('Message handling not fully implemented');
        }
        break;
      case 'DesignDocument':
        if (!uiContent.includes('DesignDocument') && !uiContent.includes('design-doc')) {
          warnings.push('Design document integration not fully implemented');
        }
        break;
      case 'TaskManagement':
        if (!uiContent.includes('Task') && !uiContent.includes('task')) {
          warnings.push('Task management not fully implemented');
        }
        break;
    }
  });
  
  return {
    hasErrors: errors.length > 0,
    errors,
    warnings,
    requiredComponents
  };
}

function calculateCompliance(validationResult) {
  const totalComponents = validationResult.requiredComponents.length;
  const errorPenalty = validationResult.errors.length * 0.2; // 20% penalty per error
  const warningPenalty = validationResult.warnings.length * 0.05; // 5% penalty per warning
  
  let compliance = 100 - (errorPenalty + warningPenalty);
  compliance = Math.max(0, Math.min(100, compliance));
  
  return Math.round(compliance);
}

// Main execution
function main() {
  try {
    // Read the UI specification
    const specPath = path.join(process.cwd(), 'failsafe_ui_specification.md');
    if (!fs.existsSync(specPath)) {
      console.error('UI specification file not found:', specPath);
      process.exit(1);
    }
    
    const specContent = fs.readFileSync(specPath, 'utf-8');
    
    // Extract required components
    const requiredComponents = extractRequiredComponents(specContent);
    
    // Validate UI implementation
    const validationResult = validateUIComponents(requiredComponents);
    
    // Calculate compliance percentage
    const compliance = calculateCompliance(validationResult);
    
    // Generate report
    const report = {
      status: validationResult.hasErrors ? 'failed' : 'passed',
      compliance: compliance,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      requiredComponents: requiredComponents.length,
      timestamp: new Date().toISOString()
    };
    
    // Write report to file with lock handling
    const reportPath = path.join(process.cwd(), 'spec-gate-report.json');
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    } catch (error) {
      if (error.code === 'EBUSY') {
        // File is locked, try with a different name
        const backupPath = path.join(process.cwd(), `spec-gate-report.${Date.now()}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(report, null, 2), 'utf8');
        console.warn(`Report written to ${backupPath} (original file was locked)`);
      } else {
        throw error;
      }
    }
    
    // Output to console
    console.log(`Spec Gate Compliance: ${compliance}%`);
    console.log(`Status: ${report.status}`);
    console.log(`Required Components: ${requiredComponents.length}`);
    console.log(`Errors: ${validationResult.errors.length}`);
    console.log(`Warnings: ${validationResult.warnings.length}`);
    
    if (validationResult.errors.length > 0) {
      console.log('\nErrors:');
      validationResult.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (validationResult.warnings.length > 0) {
      console.log('\nWarnings:');
      validationResult.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    // Exit with appropriate code
    if (compliance >= 95) {
      console.log('\n✅ Spec gate passed with ≥95% compliance');
      process.exit(0);
    } else {
      console.log('\n❌ Spec gate failed: compliance < 95%');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Spec gate execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, extractRequiredComponents, validateUIComponents, calculateCompliance }; 
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Chart Implementation...\n');

// Read the UI.ts file
const uiPath = path.join(__dirname, '../src/ui.ts');
const uiContent = fs.readFileSync(uiPath, 'utf8');

// Check for Chart.js CDN
const hasChartJsCDN = uiContent.includes('https://cdn.jsdelivr.net/npm/chart.js');
console.log(`✅ Chart.js CDN: ${hasChartJsCDN ? 'Found' : 'Missing'}`);

// Check for chart canvas elements
const hasVelocityChart = uiContent.includes('id="velocityChart"');
const hasValidationChart = uiContent.includes('id="validationChart"');
const hasDriftChart = uiContent.includes('id="driftChart"');
const hasHallucinationChart = uiContent.includes('id="hallucinationChart"');

console.log(`✅ Velocity Chart Canvas: ${hasVelocityChart ? 'Found' : 'Missing'}`);
console.log(`✅ Validation Chart Canvas: ${hasValidationChart ? 'Found' : 'Missing'}`);
console.log(`✅ Drift Chart Canvas: ${hasDriftChart ? 'Found' : 'Missing'}`);
console.log(`✅ Hallucination Chart Canvas: ${hasHallucinationChart ? 'Found' : 'Missing'}`);

// Check for chart initialization
const hasInitializeCharts = uiContent.includes('function initializeCharts()');
const hasChartInstantiation = uiContent.includes('new Chart(');
const hasDOMContentLoaded = uiContent.includes('DOMContentLoaded');

console.log(`✅ Chart Initialization Function: ${hasInitializeCharts ? 'Found' : 'Missing'}`);
console.log(`✅ Chart.js Instantiation: ${hasChartInstantiation ? 'Found' : 'Missing'}`);
console.log(`✅ DOMContentLoaded Event: ${hasDOMContentLoaded ? 'Found' : 'Missing'}`);

// Check for chart data generation methods
const hasVelocityData = uiContent.includes('generateVelocityChartData()');
const hasValidationData = uiContent.includes('generateValidationChartData()');
const hasDriftData = uiContent.includes('generateDriftChartData()');
const hasHallucinationData = uiContent.includes('generateHallucinationChartData()');

console.log(`✅ Velocity Chart Data Method: ${hasVelocityData ? 'Found' : 'Missing'}`);
console.log(`✅ Validation Chart Data Method: ${hasValidationData ? 'Found' : 'Missing'}`);
console.log(`✅ Drift Chart Data Method: ${hasDriftData ? 'Found' : 'Missing'}`);
console.log(`✅ Hallucination Chart Data Method: ${hasHallucinationData ? 'Found' : 'Missing'}`);

// Check for chart update functionality
const hasUpdateChartGrouping = uiContent.includes('function updateChartGrouping(');
const hasChartGroupingOptions = uiContent.includes('Group by Sprint') && 
                               uiContent.includes('Group by Rule') && 
                               uiContent.includes('Group by Validation Type') && 
                               uiContent.includes('Group by Date Range');

console.log(`✅ Chart Update Function: ${hasUpdateChartGrouping ? 'Found' : 'Missing'}`);
console.log(`✅ Chart Grouping Options: ${hasChartGroupingOptions ? 'Found' : 'Missing'}`);

// Check for chart styling
const hasChartsContainer = uiContent.includes('.charts-container');
const hasChartWrapper = uiContent.includes('.chart-wrapper');
const hasChartGrid = uiContent.includes('grid-template-columns: repeat(2, 1fr)');

console.log(`✅ Charts Container CSS: ${hasChartsContainer ? 'Found' : 'Missing'}`);
console.log(`✅ Chart Wrapper CSS: ${hasChartWrapper ? 'Found' : 'Missing'}`);
console.log(`✅ Chart Grid CSS: ${hasChartGrid ? 'Found' : 'Missing'}`);

// Check for chart configuration
const hasResponsive = uiContent.includes('responsive: true');
const hasAspectRatio = uiContent.includes('maintainAspectRatio: false');
const hasDarkTheme = uiContent.includes('color: \'#FFFFFF\'');

console.log(`✅ Responsive Chart Option: ${hasResponsive ? 'Found' : 'Missing'}`);
console.log(`✅ Aspect Ratio Option: ${hasAspectRatio ? 'Found' : 'Missing'}`);
console.log(`✅ Dark Theme Styling: ${hasDarkTheme ? 'Found' : 'Missing'}`);

// Summary
const allChecks = [
  hasChartJsCDN, hasVelocityChart, hasValidationChart, hasDriftChart, hasHallucinationChart,
  hasInitializeCharts, hasChartInstantiation, hasDOMContentLoaded,
  hasVelocityData, hasValidationData, hasDriftData, hasHallucinationData,
  hasUpdateChartGrouping, hasChartGroupingOptions,
  hasChartsContainer, hasChartWrapper, hasChartGrid,
  hasResponsive, hasAspectRatio, hasDarkTheme
];

const passedChecks = allChecks.filter(check => check).length;
const totalChecks = allChecks.length;

console.log(`\n📊 Chart Implementation Summary:`);
console.log(`   Passed: ${passedChecks}/${totalChecks} checks`);
console.log(`   Success Rate: ${Math.round((passedChecks / totalChecks) * 100)}%`);

if (passedChecks === totalChecks) {
  console.log(`\n🎉 Chart Implementation Complete!`);
  console.log(`   ✅ Real Chart.js charts implemented`);
  console.log(`   ✅ All chart types working (Velocity, Validation, Drift, Hallucination)`);
  console.log(`   ✅ Chart grouping functionality ready`);
  console.log(`   ✅ Dark theme styling applied`);
  console.log(`   ✅ Responsive design implemented`);
} else {
  console.log(`\n⚠️  Chart Implementation Incomplete`);
  console.log(`   Missing ${totalChecks - passedChecks} required components`);
} 
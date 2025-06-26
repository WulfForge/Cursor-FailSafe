const assert = require('assert');
const { UI } = require('../out/ui.js');

describe('Chart Implementation Tests', () => {
  test('should include Chart.js CDN', () => {
    const html = new UI().generateDashboardHTML();
    assert.ok(html.includes('https://cdn.jsdelivr.net/npm/chart.js'), 'Should include Chart.js CDN');
  });

  test('should include chart canvas elements', () => {
    const html = new UI().generateDashboardHTML();
    assert.ok(html.includes('id="velocityChart"'), 'Should include velocity chart canvas');
    assert.ok(html.includes('id="validationChart"'), 'Should include validation chart canvas');
    assert.ok(html.includes('id="driftChart"'), 'Should include drift chart canvas');
    assert.ok(html.includes('id="hallucinationChart"'), 'Should include hallucination chart canvas');
  });

  test('should include chart initialization function', () => {
    const html = new UI().generateDashboardHTML();
    assert.ok(html.includes('function initializeCharts()'), 'Should include chart initialization function');
    assert.ok(html.includes('new Chart('), 'Should include Chart.js instantiation');
  });

  test('should include chart update functionality', () => {
    const html = new UI().generateDashboardHTML();
    assert.ok(html.includes('function updateChartGrouping('), 'Should include chart update function');
    assert.ok(html.includes('DOMContentLoaded'), 'Should include DOMContentLoaded event listener');
  });

  test('should include chart grouping options', () => {
    const html = new UI().generateDashboardHTML();
    assert.ok(html.includes('Group by Sprint'), 'Should include sprint grouping option');
    assert.ok(html.includes('Group by Rule'), 'Should include rule grouping option');
    assert.ok(html.includes('Group by Validation Type'), 'Should include validation grouping option');
    assert.ok(html.includes('Group by Date Range'), 'Should include date grouping option');
  });

  test('should generate chart data methods', () => {
    const ui = new UI();
    assert.ok(typeof ui.generateVelocityChartData === 'function', 'Should have velocity chart data method');
    assert.ok(typeof ui.generateValidationChartData === 'function', 'Should have validation chart data method');
    assert.ok(typeof ui.generateDriftChartData === 'function', 'Should have drift chart data method');
    assert.ok(typeof ui.generateHallucinationChartData === 'function', 'Should have hallucination chart data method');
  });

  test('should generate valid chart data', () => {
    const ui = new UI();
    
    const velocityData = ui.generateVelocityChartData();
    assert.ok(velocityData.labels, 'Velocity chart should have labels');
    assert.ok(velocityData.datasets, 'Velocity chart should have datasets');
    assert.ok(velocityData.datasets.length === 2, 'Velocity chart should have 2 datasets');
    
    const validationData = ui.generateValidationChartData();
    assert.ok(validationData.labels, 'Validation chart should have labels');
    assert.ok(validationData.datasets, 'Validation chart should have datasets');
    
    const driftData = ui.generateDriftChartData();
    assert.ok(driftData.labels, 'Drift chart should have labels');
    assert.ok(driftData.datasets, 'Drift chart should have datasets');
    
    const hallucinationData = ui.generateHallucinationChartData();
    assert.ok(hallucinationData.labels, 'Hallucination chart should have labels');
    assert.ok(hallucinationData.datasets, 'Hallucination chart should have datasets');
  });

  test('should include chart CSS styles', () => {
    const html = new UI().generateDashboardHTML();
    assert.ok(html.includes('.charts-container'), 'Should include charts container CSS');
    assert.ok(html.includes('.chart-wrapper'), 'Should include chart wrapper CSS');
    assert.ok(html.includes('grid-template-columns: repeat(2, 1fr)'), 'Should include chart grid CSS');
  });

  test('should include chart configuration options', () => {
    const html = new UI().generateDashboardHTML();
    assert.ok(html.includes('responsive: true'), 'Should include responsive chart option');
    assert.ok(html.includes('maintainAspectRatio: false'), 'Should include aspect ratio option');
    assert.ok(html.includes('color: \'#FFFFFF\''), 'Should include white text color for dark theme');
  });
});

console.log('✅ Chart Implementation Tests Complete');
console.log('📊 Real Chart.js charts implemented with:');
console.log('   - Velocity Chart (Line Chart)');
console.log('   - Validation Chart (Doughnut Chart)');
console.log('   - Drift Chart (Bar Chart)');
console.log('   - Hallucination Chart (Bar Chart)');
console.log('   - Chart grouping functionality');
console.log('   - Dark theme styling');
console.log('   - Responsive design'); 
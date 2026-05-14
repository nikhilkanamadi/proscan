/**
 * Data Converter Service
 * Parses TSV content from gene JSON files and generates Plotly chart configurations.
 */

// Category definitions mapping UI keys to data columns
export const CATEGORIES = [
  { key: 'cellType', column: 'cell_type', label: 'Cell Type' },
  { key: 'sample', column: 'sample', label: 'Sample' },
  { key: 'grade', column: 'grade', label: 'Grade' },
  { key: 'ajccT', column: 'AJCC_T', label: 'AJCC T' },
  { key: 'ajccN', column: 'AJCC_N', label: 'AJCC N' },
  { key: 'ajccM', column: 'AJCC_M', label: 'AJCC M' },
  { key: 'sampleType', column: 'sample_primary_met', label: 'Sample Type' },
  { key: 'treatment', column: 'treated_naive', label: 'Treatment' },
  { key: 'etExposure', column: 'ET_exposed', label: 'ET Exposure' },
  { key: 'age', column: 'age', label: 'Age' },
];

// Available genes and their file mappings
export const GENE_FILES = {
  'A2M': 'A2M.json',
  'A2M-AS1': 'A2M-AS1.json',
  'A1BG': 'A1BG .json',
};

const NUMERIC_COLUMNS = new Set([
  'expression_data', 'umap_1', 'umap_2',
  'nCount_RNA', 'nFeature_RNA', 'complexity',
  'age', 'percent.mt',
]);

// Light theme chart layout defaults
const BASE_LAYOUT = {
  paper_bgcolor: 'rgba(255,255,255,0)',
  plot_bgcolor: '#FFFFFF',
  font: { color: '#4A6350', family: 'Inter, sans-serif', size: 11 },
  margin: { l: 55, r: 20, t: 40, b: 45 },
  xaxis: {
    gridcolor: 'rgba(0, 0, 0, 0.06)',
    zerolinecolor: 'rgba(0, 0, 0, 0.1)',
  },
  yaxis: {
    gridcolor: 'rgba(0, 0, 0, 0.06)',
    zerolinecolor: 'rgba(0, 0, 0, 0.1)',
  },
  legend: {
    bgcolor: 'rgba(255,255,255,0)',
    font: { size: 10, color: '#4A6350' },
  },
};

/**
 * Parse a single TSV row, handling quoted fields
 */
function parseRow(line) {
  return line.split('\t').map(field => {
    field = field.trim();
    if (field.startsWith('"') && field.endsWith('"')) {
      return field.slice(1, -1);
    }
    return field;
  });
}

/**
 * Check if a value is a valid group key (not null/empty/undefined)
 */
function isValidGroupKey(val) {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  return s !== '' && s !== 'null' && s !== 'undefined';
}

/**
 * Parse TSV content from a gene JSON file into an array of row objects
 */
export function parseTSV(jsonData) {
  const content = jsonData.content;
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseRow(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    if (values.length < headers.length) continue;

    // R's write.table adds row names as first column (offset by 1)
    const offset = values.length > headers.length ? 1 : 0;
    const row = {};
    if (offset) row.id = values[0];

    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      let val = values[j + offset];
      if (NUMERIC_COLUMNS.has(key)) {
        const num = parseFloat(val);
        val = isNaN(num) ? 0 : num;
      }
      row[key] = val;
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Group rows by a category column value
 */
function groupBy(rows, column) {
  const groups = {};
  for (const row of rows) {
    const key = row[column];
    if (!isValidGroupKey(key)) continue;
    const groupKey = String(key);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(row);
  }
  return groups;
}

// Vibrant color palette matching reference plots
const COLORS = [
  '#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A',
  '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52',
  '#1F77B4', '#2CA02C', '#D62728', '#9467BD', '#8C564B',
];

/**
 * Generate UMAP scatter plot colored by category groups
 */
function umapByCategory(rows, column, label) {
  const groups = groupBy(rows, column);
  const groupNames = Object.keys(groups);
  const traces = groupNames.map((name, i) => ({
    x: groups[name].map(r => r.umap_1),
    y: groups[name].map(r => r.umap_2),
    mode: 'markers',
    type: 'scattergl',
    name: name,
    marker: {
      size: 3,
      color: COLORS[i % COLORS.length],
      opacity: 0.7,
    },
  }));

  return {
    data: traces,
    layout: {
      ...BASE_LAYOUT,
      title: { text: `UMAP by ${label}`, font: { size: 13, color: '#1B2E1B' } },
      xaxis: { ...BASE_LAYOUT.xaxis, title: { text: 'UMAP 1' } },
      yaxis: { ...BASE_LAYOUT.yaxis, title: { text: 'UMAP 2' } },
      width: 520,
      height: 400,
      showlegend: true,
      legend: { ...BASE_LAYOUT.legend, orientation: 'h', y: -0.15 },
    },
  };
}

/**
 * Generate UMAP scatter plot colored by gene expression
 */
function umapByExpression(rows, geneName) {
  const trace = {
    x: rows.map(r => r.umap_1),
    y: rows.map(r => r.umap_2),
    mode: 'markers',
    type: 'scattergl',
    marker: {
      size: 3,
      color: rows.map(r => r.expression_data),
      colorscale: [
        [0, '#F1F8E9'],
        [0.25, '#C8E6C9'],
        [0.5, '#66BB6A'],
        [0.75, '#2E7D32'],
        [1, '#1B5E20'],
      ],
      colorbar: {
        title: { text: 'Expr', font: { size: 10, color: '#4A6350' } },
        thickness: 12,
        len: 0.6,
        tickfont: { size: 9, color: '#4A6350' },
      },
      opacity: 0.8,
    },
    showlegend: false,
  };

  return {
    data: [trace],
    layout: {
      ...BASE_LAYOUT,
      title: { text: `${geneName} Expression`, font: { size: 13, color: '#1B2E1B' } },
      xaxis: { ...BASE_LAYOUT.xaxis, title: { text: 'UMAP 1' } },
      yaxis: { ...BASE_LAYOUT.yaxis, title: { text: 'UMAP 2' } },
      width: 520,
      height: 400,
    },
  };
}

/**
 * Generate vertical violin plot by category (matches reference format)
 */
function violinPlot(rows, column, label, geneName) {
  const groups = groupBy(rows, column);
  const groupNames = Object.keys(groups);
  const traces = groupNames.map((name, i) => ({
    type: 'violin',
    y: groups[name].map(r => r.expression_data),
    name: name,
    legendgroup: name,
    box: { visible: true },
    meanline: { visible: true },
    marker: { color: COLORS[i % COLORS.length], size: 3, opacity: 0.6 },
    line: { color: COLORS[i % COLORS.length], width: 1.5 },
    fillcolor: COLORS[i % COLORS.length],
    opacity: 0.6,
    points: 'all',
    pointpos: 0,
    jitter: 0,
    scalemode: 'width',
    spanmode: 'hard',
  }));

  return {
    data: traces,
    layout: {
      ...BASE_LAYOUT,
      plot_bgcolor: '#E5ECF6',
      title: { text: `Violin Plot of ${geneName}`, font: { size: 14, color: '#1B2E1B' } },
      xaxis: {
        ...BASE_LAYOUT.xaxis,
        title: { text: label, font: { size: 12 } },
        gridcolor: '#FFFFFF',
        tickangle: -45,
      },
      yaxis: {
        ...BASE_LAYOUT.yaxis,
        title: { text: 'Normalized Counts', font: { size: 12 } },
        gridcolor: '#FFFFFF',
      },
      width: 520,
      height: 450,
      showlegend: true,
      legend: {
        title: { text: column, font: { size: 11 } },
        orientation: 'h',
        y: -0.35,
        x: 0.5,
        xanchor: 'center',
        font: { size: 10 },
        bgcolor: 'rgba(255,255,255,0)',
      },
      violinmode: 'group',
      margin: { l: 60, r: 20, t: 45, b: 100 },
    },
  };
}

/**
 * Generate horizontal violin (ridge) plot by category (matches reference format)
 */
function ridgePlot(rows, column, label, geneName) {
  const groups = groupBy(rows, column);
  const groupNames = Object.keys(groups);
  const traces = groupNames.map((name, i) => ({
    type: 'violin',
    x: groups[name].map(r => r.expression_data),
    name: name,
    legendgroup: name,
    orientation: 'h',
    side: 'positive',
    meanline: { visible: true },
    marker: { color: COLORS[i % COLORS.length], size: 2 },
    line: { color: COLORS[i % COLORS.length], width: 1.5 },
    fillcolor: COLORS[i % COLORS.length],
    opacity: 0.6,
    points: false,
    scalemode: 'width',
    spanmode: 'hard',
    width: 0.8,
  }));

  return {
    data: traces,
    layout: {
      ...BASE_LAYOUT,
      plot_bgcolor: '#E5ECF6',
      title: { text: `Interactive Ridge Plot of ${geneName}`, font: { size: 14, color: '#1B2E1B' } },
      xaxis: {
        ...BASE_LAYOUT.xaxis,
        title: { text: 'Normalized Counts', font: { size: 12 } },
        gridcolor: '#FFFFFF',
      },
      yaxis: {
        ...BASE_LAYOUT.yaxis,
        title: { text: label, font: { size: 12 } },
        gridcolor: '#FFFFFF',
      },
      width: 520,
      height: 450,
      showlegend: true,
      legend: {
        title: { text: column, font: { size: 11 } },
        orientation: 'h',
        y: -0.25,
        x: 0.5,
        xanchor: 'center',
        font: { size: 10 },
        bgcolor: 'rgba(255,255,255,0)',
      },
      margin: { l: 120, r: 20, t: 45, b: 80 },
    },
  };
}

/**
 * Generate chart configs for a SINGLE category (lazy/on-demand)
 * Returns: { umap, expression, violin, ridge }
 */
export function generateCategoryCharts(rows, categoryKey, geneName) {
  const cat = CATEGORIES.find(c => c.key === categoryKey);
  if (!cat) return null;
  return {
    umap: umapByCategory(rows, cat.column, cat.label),
    expression: umapByExpression(rows, geneName),
    violin: violinPlot(rows, cat.column, cat.label, geneName),
    ridge: ridgePlot(rows, cat.column, cat.label, geneName),
  };
}


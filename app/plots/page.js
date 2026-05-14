'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { parseTSV, generateCategoryCharts, CATEGORIES, GENE_FILES } from '@/services/dataConverter';

// Dynamic import of Plotly (client-side only, no SSR)
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => <div style={{ width: 520, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A9A82' }}>Loading chart…</div>,
});

const PLOTLY_CONFIG = {
  responsive: true,
  displayModeBar: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  displaylogo: false,
};

function PlotsContent() {
  const searchParams = useSearchParams();
  const gene = searchParams.get('gene') || 'A2M';
  const [rows, setRows] = useState(null);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cache generated charts per category to avoid re-computing
  const chartCache = useRef({});

  // Load & parse data once
  useEffect(() => {
    let cancelled = false;
    chartCache.current = {};

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const filename = GENE_FILES[gene];
        if (!filename) throw new Error(`No data file found for gene: ${gene}`);

        const res = await fetch(`/data/json/${filename}`);
        if (!res.ok) throw new Error(`Failed to load ${filename}: ${res.status}`);

        const jsonData = await res.json();
        const parsed = parseTSV(jsonData);
        if (parsed.length === 0) throw new Error('No data rows parsed from file');

        if (!cancelled) {
          setRows(parsed);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [gene]);

  // Generate charts lazily — only for the active category, with caching
  const getActiveCharts = useCallback(() => {
    if (!rows) return null;
    if (!chartCache.current[activeCategory]) {
      chartCache.current[activeCategory] = generateCategoryCharts(rows, activeCategory, gene);
    }
    return chartCache.current[activeCategory];
  }, [rows, activeCategory, gene]);

  const activeCharts = getActiveCharts();
  const activeLabel = CATEGORIES.find(c => c.key === activeCategory)?.label;

  return (
    <div className="plots-page">
      <div className="plots-header">
        <Link href="/" className="back-btn">← Back</Link>
        <h1 className="plots-title">
          Gene: <span>{gene}</span>
        </h1>
      </div>

      {/* Category Selector */}
      <div className="category-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`category-btn ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">Loading {gene} expression data…</p>
        </div>
      )}

      {error && (
        <div className="loading-container">
          <p style={{ color: '#C62828', fontSize: '1rem' }}>⚠ {error}</p>
          <Link href="/" className="back-btn" style={{ marginTop: '1rem' }}>Go Back</Link>
        </div>
      )}

      {!loading && !error && activeCharts && (
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-title">UMAP — Colored by {activeLabel}</div>
            <Plot data={activeCharts.umap.data} layout={activeCharts.umap.layout} config={PLOTLY_CONFIG} />
          </div>
          <div className="chart-card">
            <div className="chart-title">UMAP — Gene Expression Overlay</div>
            <Plot data={activeCharts.expression.data} layout={activeCharts.expression.layout} config={PLOTLY_CONFIG} />
          </div>
          <div className="chart-card">
            <div className="chart-title">Violin Plot</div>
            <Plot data={activeCharts.violin.data} layout={activeCharts.violin.layout} config={PLOTLY_CONFIG} />
          </div>
          <div className="chart-card">
            <div className="chart-title">Ridge Plot</div>
            <Plot data={activeCharts.ridge.data} layout={activeCharts.ridge.layout} config={PLOTLY_CONFIG} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlotsPage() {
  return (
    <Suspense fallback={
      <div className="plots-page">
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">Initializing…</p>
        </div>
      </div>
    }>
      <PlotsContent />
    </Suspense>
  );
}

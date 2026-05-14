'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GENE_FILES } from '@/services/dataConverter';

const geneList = Object.keys(GENE_FILES);

export default function Home() {
  const router = useRouter();
  const [gene, setGene] = useState(geneList[0]);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (gene) {
      setDescription(`Viewing ${gene} expression across prostate cancer single-cell data`);
    } else {
      setDescription('');
    }
  }, [gene]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (gene) {
      router.push(`/plots/?gene=${encodeURIComponent(gene)}`);
    }
  };

  return (
    <div className="landing">
      <div className="landing-card">
        <h1 className="app-title">ProSCAN</h1>
        <p className="app-subtitle">Prostate Single-Cell Analysis Navigator</p>

        <div className="mode-buttons">
          <span className="mode-btn">RNA-seq</span>
          <span className="mode-btn active">scRNA-seq</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="gene-select">Gene Name</label>
            <select
              id="gene-select"
              className="form-select"
              value={gene}
              onChange={(e) => setGene(e.target.value)}
            >
              {geneList.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {description && (
            <div className="description-panel">
              {description}
            </div>
          )}

          <button type="submit" className="submit-btn" id="submit-btn">
            Explore Gene →
          </button>
        </form>
      </div>
    </div>
  );
}

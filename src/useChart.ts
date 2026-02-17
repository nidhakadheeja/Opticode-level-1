import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(ChartDataLabels);
Chart.defaults.color = '#5a6180';
Chart.defaults.borderColor = '#1d2236';
Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.font.size = 11;

export function useChart(factory, deps) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    if (deps.every(d => d !== null && d !== undefined)) {
      chartRef.current = factory(canvasRef.current);
    }
    return () => { chartRef.current?.destroy?.(); chartRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return canvasRef;
}
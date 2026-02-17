import { Chart } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useChart } from '../useChart';
import { C } from '../analysis';

Chart.register(ChartDataLabels);

export default function MemoryChart({ curves }) {
  const COLORS = Object.values(C);
  const ref = useChart(canvas => {
    const datasets = curves.slice(0, 8).map((f, i) => {
      const col = COLORS[i % COLORS.length];
      return {
        label: f.name,
        data: f.memory,
        borderColor: col,
        backgroundColor: col + '20',
        pointBackgroundColor: col,
        pointRadius: 3,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      };
    });
    return new Chart(canvas, {
      type: 'line',
      data: { labels: curves[0].sizes.map(s => `n=${s}`), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 9, padding: 12 } },
          tooltip: { backgroundColor: '#111420', borderColor: '#1d2236', borderWidth: 1 },
          datalabels: { display: false },
        },
        scales: {
          x: { grid: { color: '#1d2236' } },
          y: { grid: { color: '#1d2236' }, title: { display: true, text: 'Memory (KB)' } },
        },
      },
    });
  }, [curves]);

  return <canvas ref={ref} />;
}

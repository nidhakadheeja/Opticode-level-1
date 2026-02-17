import { Chart } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useChart } from '../useChart';
import { bigoColor, bigoLabel } from '../analysis';

Chart.register(ChartDataLabels);

export default function BigOChart({ dist }) {
  const keys   = Object.keys(dist);
  const values = keys.map(k => dist[k]);
  const colors = keys.map(k => bigoColor(k));

  const ref = useChart(canvas => {
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: keys.map(bigoLabel),
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#111420', borderColor: '#1d2236', borderWidth: 1 },
          datalabels: {
            color: '#dde3f5',
            font: { size: 10, weight: 'bold' },
            formatter: v => v || '',
          },
        },
      },
    });
  }, [dist]);

  return (
    <>
      <canvas ref={ref} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
        {keys.map((k, i) => (
          <div key={k} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 6, fontSize: '.65rem',
            background: 'rgba(255,255,255,.04)', border: '1px solid #1d2236',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: colors[i] }} />
            {bigoLabel(k)}
          </div>
        ))}
      </div>
    </>
  );
}

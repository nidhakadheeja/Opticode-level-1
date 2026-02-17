import { Chart } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useChart } from '../useChart';
import { C } from '../analysis';

Chart.register(ChartDataLabels);

export default function CCChart({ functions }) {
  const sorted = [...functions].sort((a, b) => b.cyclomatic_complexity - a.cyclomatic_complexity);
  const ref = useChart(canvas => {
    const cols = sorted.map(f => {
      const v = f.cyclomatic_complexity;
      return v <= 5 ? C.mint : v <= 10 ? C.gold : C.coral;
    });
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sorted.map(f => f.name),
        datasets: [{
          label: 'Cyclomatic Complexity',
          data: sorted.map(f => f.cyclomatic_complexity),
          backgroundColor: cols.map(c => c + 'bb'),
          borderColor: cols,
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111420', borderColor: '#1d2236', borderWidth: 1,
            callbacks: {
              label: ctx => {
                const v = ctx.raw;
                return `CC: ${v} — ${v <= 5 ? 'Low risk' : v <= 10 ? 'Moderate risk' : 'High risk'}`;
              },
            },
          },
          datalabels: {
            align: 'end', anchor: 'end',
            color: '#dde3f5', font: { size: 10, weight: 'bold' },
            formatter: v => v,
          },
        },
        scales: {
          x: { grid: { color: '#1d2236' }, title: { display: true, text: 'Complexity Score' } },
          y: { grid: { color: 'transparent' } },
        },
      },
    });
  }, [functions]);

  return <canvas ref={ref} />;
}

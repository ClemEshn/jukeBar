export const GraphOneOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        color: 'white',
        font: {
          size: 18,
        },
      },
    },
    tooltip: {
      callbacks: {
        label: (context: { raw: any; }) => `${parseFloat(context.raw).toFixed(2)}€`,
      },
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: { size: 14, color: 'white' },
      bodyFont: { size: 12, color: 'white' },
      borderColor: 'white',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        font: {
          size: 24,
          family: 'Roboto Mono, monospace',
        },
        color: 'white',
      },
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.2)',
      },
      ticks: {
        font: {
          size: 18,
          family: 'Roboto Mono, monospace',
        },
        color: 'white',
        callback: (value : any) => `${parseFloat(value).toFixed(2)}€`,
      },
    },
  },
  elements: {
    line: {
      borderWidth: 2,
      tension: 0.4,
      borderColor: '#1db954',
    },
    point: {
      radius: 0,
      hoverRadius: 6,
      backgroundColor: '#ffffff',
    },
  },
  animation: {
    duration: 800,
  },
};


export const pairsColors = [
  100,
  0,
  45,
  340,
];

export const pairsColors2 = [
  280,
  30,
  190,
  240,
];

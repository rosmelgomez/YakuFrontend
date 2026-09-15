import React from 'react';
import { renderToString } from 'react-dom/server';
import * as recharts from 'recharts';

console.log('Recharts version loaded successfully.');

try {
  const element = React.createElement(
    recharts.PieChart,
    { width: 200, height: 200 },
    React.createElement(recharts.Pie, {
      data: [{ value: 50 }, { value: 50 }],
      dataKey: 'value',
      isAnimationActive: false
    })
  );
  const html = renderToString(element);
  console.log('Direct PieChart HTML length:', html.length);
  console.log('Direct PieChart HTML preview:', html.substring(0, 200));
} catch (err) {
  console.error('Error rendering direct PieChart:', err);
}

try {
  const elementResp = React.createElement(
    recharts.ResponsiveContainer,
    { width: 500, height: 300 },
    React.createElement(
      recharts.LineChart,
      { data: [{ xLabel: 'Lun', valorReal: 10 }, { xLabel: 'Mar', valorReal: 20 }] },
      React.createElement(recharts.Line, { dataKey: 'valorReal' })
    )
  );
  const htmlResp = renderToString(elementResp);
  console.log('ResponsiveContainer HTML length:', htmlResp.length);
  console.log('ResponsiveContainer HTML preview:', htmlResp);
} catch (err) {
  console.error('Error rendering ResponsiveContainer:', err);
}
